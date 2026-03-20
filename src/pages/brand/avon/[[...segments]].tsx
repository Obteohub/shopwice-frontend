import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Link from 'next/link';
import Layout from '@/components/Layout/Layout.component';
import ProductList, { type RestProduct } from '@/components/Product/ProductList.component';
import TaxonomyListingPage from '@/components/Product/TaxonomyListingPage.component';
import SeoHead from '@/components/SeoHead';
import { buildStaticAvonLanding, type AvonLandingContent } from '@/content/avonLanding';
import { normalizeCollectionDataPayload } from '@/features/collection/apiClient';
import type { ApiFacetGroup, CollectionFilterState, RouteScope } from '@/features/collection/types';
import { api } from '@/utils/api';
import { applyCachePolicy } from '@/utils/cacheControl';
import { ENDPOINTS } from '@/utils/endpoints';
import { sanitizeHtml } from '@/utils/sanitizeHtml';
import { decodeHtmlEntities } from '@/utils/text';
import {
  buildArchiveSeoData,
  getAbsoluteUrlFromRequest,
  parsePageParam,
  type SeoDataShape,
} from '@/utils/seoPage';
import { getRequestPathname, loggedNotFound, loggedRedirect } from '@/utils/routeEventLogger';

type BrandTerm = {
  id?: number | string;
  databaseId?: number | string;
  name?: string;
  slug?: string;
  description?: string | null;
  parent?: number | string;
  count?: number;
};

type BrandNode = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  count?: number;
  description?: string;
};

type ResolvedSegment = {
  taxonomySlug: string;
  pathSegment: string;
  label: string;
  value: string;
};

type BreadcrumbItem = {
  label: string;
  href: string | null;
};

type ChildBrandLink = {
  slug: string;
  label: string;
  count?: number;
};

type AvonPageProps = {
  brandName: string;
  isBrandLanding: boolean;
  isRootListingPage: boolean;
  resolvedSegments?: string[];
  currentBrandSlug?: string;
  childBrands?: ChildBrandLink[];
  products: RestProduct[];
  totalCount: number;
  initialHasNextPage: boolean;
  initialFacets: ApiFacetGroup[];
  seoData: SeoDataShape;
  breadcrumbs: BreadcrumbItem[];
  landing: AvonLandingContent;
  h1: string;
  routeScope?: RouteScope;
  forcedState: Partial<CollectionFilterState>;
  queryParams: Record<string, string | number | boolean>;
  omitManagedQueryKeys: string[];
};

const SEGMENT_MAX_DEPTH = 4;
const AVON_ALL_SEGMENT = 'all';
const BRAND_HIERARCHY_CACHE_TTL_MS = Math.max(
  60_000,
  Number(process.env.BRAND_HIERARCHY_CACHE_TTL_MS ?? 10 * 60 * 1000),
);

const MANAGED_FILTER_BASE_KEYS = new Set([
  'search',
  'tag',
  'location',
  'minprice',
  'min_price',
  'maxprice',
  'max_price',
  'minrating',
  'min_rating',
  'maxrating',
  'max_rating',
  'stockstatus',
  'stock_status',
  'instock',
  'in_stock',
  'onsale',
  'on_sale',
  'orderby',
  'order',
]);

const PAGE_KEYS = new Set(['page']);
const PER_PAGE_KEYS = new Set(['per_page', 'perpage', 'perPage']);

const CANONICAL_KEY_MAP: Record<string, string> = {
  minprice: 'minPrice',
  min_price: 'minPrice',
  maxprice: 'maxPrice',
  max_price: 'maxPrice',
  minrating: 'minRating',
  min_rating: 'minRating',
  maxrating: 'maxRating',
  max_rating: 'maxRating',
  stockstatus: 'stockStatus',
  stock_status: 'stockStatus',
  instock: 'inStock',
  in_stock: 'inStock',
  onsale: 'onSale',
  on_sale: 'onSale',
};

const normalizeList = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const source = payload as Record<string, unknown>;
    if (Array.isArray(source.data)) return source.data as T[];
    if (Array.isArray(source.products)) return source.products as T[];
    if (Array.isArray(source.results)) return source.results as T[];
    if (Array.isArray(source.items)) return source.items as T[];
    if (Array.isArray(source.pages)) return source.pages as T[];
  }
  return [];
};

const toText = (value: unknown) => decodeHtmlEntities(String(value ?? '').trim());

const slugToken = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/%20/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const titleCaseSlug = (value: string) =>
  slugToken(value)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const firstQueryValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return String(value[0] ?? '').trim();
  return String(value ?? '').trim();
};

const parsePositive = (value: unknown, fallback: number) => {
  const parsed = Number(String(value ?? '').trim());
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  return fallback;
};

const sanitizeSegment = (value: string) =>
  slugToken(decodeURIComponent(String(value || '')));

const normalizeIncomingSegments = (segments: string[]) =>
  segments
    .map((entry) => sanitizeSegment(entry))
    .filter(Boolean);

const isAttributeKey = (key: string) =>
  key.startsWith('pa_') || key.startsWith('attr_') || key.startsWith('attribute_');

const parseFilterQuery = (query: Record<string, string | string[] | undefined>) => {
  const sharedFilters: Record<string, string | number | boolean> = {};
  const passThroughQuery: Record<string, string> = {};
  let page = parsePageParam(query.page);
  let perPage = parsePositive(query.per_page ?? query.perPage ?? query.perpage, 24);

  Object.entries(query).forEach(([key, rawValue]) => {
    const normalized = firstQueryValue(rawValue);
    if (!normalized) return;

    if (key === 'segments' || key === 'brand' || key === 'category' || key === 'categoryId' || key === 'category_id') {
      return;
    }

    if (key === 'view') {
      return;
    }

    const lowerKey = key.toLowerCase();
    if (PAGE_KEYS.has(lowerKey)) {
      page = parsePositive(normalized, 1);
      passThroughQuery.page = String(page);
      return;
    }

    if (PER_PAGE_KEYS.has(lowerKey)) {
      perPage = parsePositive(normalized, 24);
      passThroughQuery.perPage = String(perPage);
      return;
    }

    const canonicalKey = CANONICAL_KEY_MAP[lowerKey] ?? key;
    const isManaged = MANAGED_FILTER_BASE_KEYS.has(lowerKey) || isAttributeKey(lowerKey);

    passThroughQuery[canonicalKey] = normalized;
    if (isManaged) {
      sharedFilters[canonicalKey] = normalized;
    }
  });

  return {
    sharedFilters,
    page,
    perPage,
    passThroughQuery,
  };
};

const queryStringFromRecord = (query: Record<string, string>) => {
  const params = new URLSearchParams();
  Object.keys(query)
    .sort((a, b) => a.localeCompare(b))
    .forEach((key) => {
      const value = query[key];
      if (!value) return;
      params.set(key, value);
    });
  return params.toString();
};

const normalizeBrandNode = (entry: BrandTerm): BrandNode | null => {
  const id = toText(entry.databaseId ?? entry.id);
  const name = toText(entry.name);
  const slug = slugToken(entry.slug ?? name);
  if (!id || !name || !slug) return null;

  const parentRaw = toText(entry.parent ?? '0');
  const parentId = parentRaw && parentRaw !== '0' ? parentRaw : null;
  const count = Number(entry.count ?? NaN);
  const description = toText(entry.description ?? '');

  return {
    id,
    name,
    slug,
    parentId,
    count: Number.isFinite(count) ? count : undefined,
    description: description || undefined,
  };
};

const fetchAllBrands = async (): Promise<BrandNode[]> => {
  const seen = new Set<string>();
  const nodes: BrandNode[] = [];

  for (let page = 1; page <= 40; page += 1) {
    const payload = await api.get<unknown>(ENDPOINTS.BRANDS, {
      params: { per_page: 100, page },
    });
    const batch = normalizeList<BrandTerm>(payload);
    if (!batch.length) break;

    let added = 0;
    batch.forEach((entry) => {
      const node = normalizeBrandNode(entry);
      if (!node || seen.has(node.id)) return;
      seen.add(node.id);
      nodes.push(node);
      added += 1;
    });

    if (added === 0 || batch.length < 100) break;
  }

  if (nodes.length === 0) {
    const fallbackPayload = await api.get<unknown>(ENDPOINTS.BRANDS);
    normalizeList<BrandTerm>(fallbackPayload).forEach((entry) => {
      const node = normalizeBrandNode(entry);
      if (!node || seen.has(node.id)) return;
      seen.add(node.id);
      nodes.push(node);
    });
  }

  return nodes;
};

const buildBrandHierarchy = (brands: BrandNode[]) => {
  const bySlug = new Map<string, BrandNode>();
  const byId = new Map<string, BrandNode>();
  const byParent = new Map<string, BrandNode[]>();

  brands.forEach((brand) => {
    bySlug.set(brand.slug, brand);
    byId.set(brand.id, brand);
    const parentKey = brand.parentId ?? '0';
    const siblings = byParent.get(parentKey) ?? [];
    siblings.push(brand);
    byParent.set(parentKey, siblings);
  });

  byParent.forEach((siblings) => {
    siblings.sort((a, b) => a.name.localeCompare(b.name));
  });

  return { bySlug, byId, byParent };
};

type BrandHierarchyMaps = ReturnType<typeof buildBrandHierarchy>;
let brandHierarchyCache: { expiresAt: number; value: BrandHierarchyMaps } | null = null;
let brandHierarchyPromise: Promise<BrandHierarchyMaps> | null = null;

const getCachedBrandHierarchy = async (): Promise<BrandHierarchyMaps> => {
  if (brandHierarchyCache && brandHierarchyCache.expiresAt > Date.now()) {
    return brandHierarchyCache.value;
  }
  if (brandHierarchyPromise) return brandHierarchyPromise;

  brandHierarchyPromise = (async () => {
    const allBrands = await fetchAllBrands();
    const hierarchy = buildBrandHierarchy(allBrands);
    brandHierarchyCache = {
      expiresAt: Date.now() + BRAND_HIERARCHY_CACHE_TTL_MS,
      value: hierarchy,
    };
    return hierarchy;
  })()
    .finally(() => {
      brandHierarchyPromise = null;
    });

  return brandHierarchyPromise;
};

const resolveBrandSegments = (
  segments: string[],
  rootBrand: BrandNode,
  byParent: Map<string, BrandNode[]>,
) => {
  const chain: ResolvedSegment[] = [];
  let currentBrand: BrandNode = rootBrand;

  for (const segment of segments) {
    const normalizedSegment = slugToken(segment);
    if (!normalizedSegment) return { chain: [], currentBrand: rootBrand, invalid: true };

    const children = byParent.get(currentBrand.id) ?? [];
    const match = children.find(
      (entry) =>
        slugToken(entry.slug) === normalizedSegment ||
        slugToken(entry.name) === normalizedSegment,
    );

    if (!match) {
      return { chain: [], currentBrand: rootBrand, invalid: true };
    }

    chain.push({
      taxonomySlug: match.slug,
      pathSegment: match.slug,
      label: match.name,
      value: match.id,
    });
    currentBrand = match;
  }

  return { chain, currentBrand, invalid: false };
};

const buildAvonH1 = (segments: string[], options?: { isRootListingPage?: boolean }) => {
  if (options?.isRootListingPage) return 'Avon Products';
  if (segments.length === 0) return 'Avon';
  if (segments.length === 1) return `Avon ${titleCaseSlug(segments[0])}`;

  const root = titleCaseSlug(segments[0]);
  const leaf = titleCaseSlug(segments[segments.length - 1]);
  const middle = segments.slice(1, -1).reverse().map((segment) => titleCaseSlug(segment));

  return ['Avon', leaf, ...middle, root]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const buildAvonBreadcrumbs = (
  resolvedChain: ResolvedSegment[],
  options?: { isRootListingPage?: boolean },
): BreadcrumbItem[] => {
  const breadcrumbs: BreadcrumbItem[] = [{ label: 'Avon', href: '/brand/avon' }];
  if (options?.isRootListingPage) {
    breadcrumbs.push({ label: 'All Products', href: null });
    return breadcrumbs;
  }
  if (!resolvedChain.length) {
    breadcrumbs[0].href = null;
    return breadcrumbs;
  }

  resolvedChain.forEach((entry, index) => {
    const path = `/brand/avon/${resolvedChain.slice(0, index + 1).map((item) => item.pathSegment).join('/')}`;
    breadcrumbs.push({
      label: entry.label,
      href: index === resolvedChain.length - 1 ? null : path,
    });
  });

  return breadcrumbs;
};

const extractTotalCount = (payload: unknown, fallback: number) => {
  if (!payload || typeof payload !== 'object') return fallback;
  const source = payload as Record<string, unknown>;
  const candidate = Number(
    source.totalCount ??
      source.total ??
      source.count ??
      source.total_products ??
      source.found ??
      NaN,
  );
  return Number.isFinite(candidate) ? candidate : fallback;
};

const canonicalTaxonomyKey = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-');

const getFacetScopedCount = (
  groups: ApiFacetGroup[],
  taxonomyKeys: string[],
  scopedValues: string[],
): number | undefined => {
  const taxonomySet = new Set(taxonomyKeys.map((entry) => canonicalTaxonomyKey(entry)));
  const valueSet = new Set(scopedValues.map((entry) => String(entry || '').trim().toLowerCase()).filter(Boolean));
  if (!taxonomySet.size || !valueSet.size) return undefined;

  let best: number | undefined;
  groups.forEach((group) => {
    const taxonomy = canonicalTaxonomyKey(group.taxonomy ?? group.name ?? group.label);
    if (!taxonomySet.has(taxonomy)) return;
    const terms = Array.isArray(group.terms) ? group.terms : [];
    terms.forEach((term) => {
      const candidates = [
        String(term.value ?? '').trim().toLowerCase(),
        String(term.id ?? '').trim().toLowerCase(),
        String(term.slug ?? '').trim().toLowerCase(),
        String(term.name ?? '').trim().toLowerCase(),
      ].filter(Boolean);
      if (!candidates.some((candidate) => valueSet.has(candidate))) return;
      const count = Number(term.count);
      if (!Number.isFinite(count)) return;
      best = best === undefined ? count : Math.max(best, count);
    });
  });

  return best;
};

const AvonPage = ({
  brandName,
  isBrandLanding,
  isRootListingPage,
  resolvedSegments = [],
  currentBrandSlug = '',
  childBrands = [],
  products,
  totalCount,
  initialHasNextPage,
  initialFacets,
  seoData,
  breadcrumbs,
  landing,
  h1,
  routeScope,
  forcedState,
  queryParams,
  omitManagedQueryKeys,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const title = isBrandLanding
    ? toText(landing.title || brandName || 'Avon')
    : toText(h1 || brandName || 'Avon');
  const subtitle = toText(landing.subtitle || '');
  const heroCtaLabel = toText(landing.heroCtaLabel || '');
  const heroCtaHref = toText(landing.heroCtaHref || '/brand/avon/all');

  if (!isBrandLanding) {
    const uniqueLinks = new Set<string>();
    const nestedBasePath = isRootListingPage
      ? '/brand/avon'
      : resolvedSegments.length > 0
      ? `/brand/avon/${resolvedSegments.join('/')}`
      : '/brand/avon';
    const trail = [
      {
        label: 'Avon',
        path: isRootListingPage ? '/brand/avon' : '/brand/avon/all',
        isCurrent: !isRootListingPage && resolvedSegments.length === 0,
      },
      ...(isRootListingPage ? [{ label: 'All Products', path: '/brand/avon/all', isCurrent: true }] : []),
      ...resolvedSegments.map((segment, index) => {
        const path = `/brand/avon/${resolvedSegments.slice(0, index + 1).join('/')}`;
        const crumb = breadcrumbs[index + 1];
        return {
          label: toText(crumb?.label || titleCaseSlug(segment)),
          path,
          isCurrent: !isRootListingPage && index === resolvedSegments.length - 1,
        };
      }),
    ];
    const childBrandTree = childBrands
      .map((item) => {
        const childSlug = slugToken(item.slug);
        if (!childSlug) return null;
        return {
          label: toText(item.label || childSlug),
          path: `${nestedBasePath}/${childSlug}`,
          count: item.count,
          isCurrent: false,
        };
      })
      .filter(Boolean) as Array<{ label: string; path: string; count?: number; isCurrent?: boolean }>;
    const subBrandSlot = childBrands.length > 0 ? (
      <section className="mb-4" aria-label="Sub-brand navigation">
        <div className="overflow-x-auto">
          <div className="flex flex-nowrap items-center gap-2 min-w-max pb-1">
            {childBrands.map((childBrand, index) => {
              const childSlug = slugToken(childBrand.slug);
              if (!childSlug) return null;
              const href = `${nestedBasePath}/${childSlug}`;
              if (uniqueLinks.has(href)) return null;
              uniqueLinks.add(href);
              const label = toText(childBrand.label || childSlug);
              return (
                <Link
                  key={`${href}-${index}`}
                  href={href}
                  className="shrink-0 whitespace-nowrap px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-[#2c3338] text-sm font-medium rounded-full transition-colors border border-gray-200"
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    ) : null;

    return (
      <>
        <SeoHead seoData={seoData} />
        <TaxonomyListingPage
          title={title || 'Avon'}
          products={products}
          slug={currentBrandSlug}
          queryParams={queryParams}
          totalCount={totalCount}
          initialHasNextPage={initialHasNextPage}
          initialFacets={initialFacets}
          forcedState={forcedState}
          omitManagedQueryKeys={omitManagedQueryKeys}
          customRouteScope={routeScope}
          brandHierarchy={{
            trail,
            children: childBrandTree,
          }}
          topSlot={subBrandSlot}
          breadcrumbs={breadcrumbs}
        />
      </>
    );
  }

  return (
    <Layout title={title || 'Avon'} fullWidth={true}>
      <SeoHead seoData={seoData} />

      <div className="w-full px-2 md:px-4 pt-2 pb-2">
        <nav className="text-sm text-gray-500 mb-3 pb-1" aria-label="Breadcrumb">
          <div className="overflow-x-auto">
            <ul className="flex flex-nowrap items-center gap-1 min-w-max">
              <li className="shrink-0">
                <Link href="/" className="hover:text-black transition-colors">
                  Home
                </Link>
              </li>
              <li className="shrink-0 text-gray-400">/</li>
              {breadcrumbs.map((crumb, index) => (
                <li key={`${crumb.label}-${index}`} className="shrink-0 flex items-center gap-1">
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-black transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-gray-900 font-medium">{crumb.label}</span>
                  )}
                  {index < breadcrumbs.length - 1 && <span className="text-gray-400">/</span>}
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {isBrandLanding ? (
          <>
            <section className="rounded-xl border border-orange-100 bg-gradient-to-r from-[#fff5ee] via-white to-[#fff4e8] p-4 md:p-8 mb-6">
              <div className="grid gap-4 md:grid-cols-[1fr_320px] md:gap-8 items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#ff5d00] mb-2">
                    Avon Brand Store
                  </p>
                  <h1 className="text-2xl md:text-4xl font-bold text-[#2c3338] leading-tight">
                    {h1}
                  </h1>
                  {subtitle && (
                    <p className="mt-3 text-sm md:text-base text-gray-600 max-w-2xl">{subtitle}</p>
                  )}
                  <div className="mt-4">
                    <a
                      href={heroCtaHref}
                      className="inline-flex items-center rounded-md bg-[#ff5d00] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                    >
                      {heroCtaLabel || 'Shop Avon Products'}
                    </a>
                  </div>
                </div>

                {landing.heroImage && (
                  <div className="w-full h-44 md:h-56 rounded-lg overflow-hidden border border-orange-100 bg-white">
                    <img
                      src={landing.heroImage}
                      alt={h1}
                      className="w-full h-full object-cover"
                      loading="eager"
                    />
                  </div>
                )}
              </div>
            </section>

            {landing.bodyHtml && (
              <section
                className="mb-6 rounded-xl border border-gray-100 bg-white p-4 md:p-6 prose max-w-none prose-p:text-gray-700 prose-headings:text-[#2c3338]"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(landing.bodyHtml) }}
              />
            )}

            {landing.offers.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xl font-bold text-[#2c3338] mb-3">Avon Offers</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {landing.offers.map((offer, index) => (
                    <article key={`avon-offer-${index}`} className="rounded-lg border border-gray-100 bg-white p-3">
                      {offer.image && (
                        <div className="mb-2 h-36 overflow-hidden rounded-md bg-gray-100">
                          <img
                            src={offer.image}
                            alt={offer.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <h3 className="text-base font-semibold text-[#2c3338]">{offer.title}</h3>
                      {offer.description && (
                        <p className="mt-1 text-sm text-gray-600">{offer.description}</p>
                      )}
                      {offer.href && (
                        <a href={offer.href} className="mt-3 inline-flex text-sm font-semibold text-[#ff5d00] hover:underline">
                          {offer.ctaLabel || 'View offer'}
                        </a>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <section className="mb-4 rounded-md border border-gray-100 bg-white p-4">
            <h1 className="text-xl md:text-2xl font-bold text-[#2c3338]">{h1}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {totalCount.toLocaleString()} products in this Avon collection
            </p>
          </section>
        )}

        <section id="avon-products">
          <div className="mb-2">
            <h2 className="text-xl md:text-2xl font-bold text-[#2c3338]">Shop Avon Products</h2>
            <p className="text-sm text-gray-500">
              {totalCount.toLocaleString()} products available
            </p>
          </div>

          <ProductList
            products={products}
            slug={currentBrandSlug}
            queryParams={queryParams}
            totalCount={totalCount}
            initialHasNextPage={initialHasNextPage}
            initialFacets={initialFacets}
            forcedState={forcedState}
            omitManagedQueryKeys={omitManagedQueryKeys}
            customRouteScope={routeScope}
          />
        </section>
      </div>
    </Layout>
  );
};

export default AvonPage;

export const getServerSideProps: GetServerSideProps<AvonPageProps> = async ({
  params,
  query,
  req,
  res,
}) => {
  const requestPath = getRequestPathname(req, '/brand/avon');
  const rawSegmentsInput = Array.isArray(params?.segments)
    ? params?.segments
    : params?.segments
      ? [String(params.segments)]
      : [];

  if (rawSegmentsInput.length > SEGMENT_MAX_DEPTH) {
    return loggedNotFound({
      req,
      pathname: requestPath,
      matchedRoute: '/brand/avon/[[...segments]]',
      reason: 'Avon route exceeded maximum segment depth',
    });
  }

  const normalizedSegments = normalizeIncomingSegments(rawSegmentsInput);
  const hasEmptyOrDirtySegments =
    rawSegmentsInput.length !== normalizedSegments.length ||
    rawSegmentsInput.some((segment, index) => sanitizeSegment(segment) !== normalizedSegments[index]);
  const hasDoubleSlashInPath = String(req.url || '').includes('/brand/avon//');

  const { sharedFilters: parsedSharedFilters, page, perPage, passThroughQuery } = parseFilterQuery(
    query as Record<string, string | string[] | undefined>,
  );

  const viewMode = firstQueryValue((query as Record<string, string | string[] | undefined>).view).toLowerCase();
  const isLegacyRootListingView = normalizedSegments.length === 0 && viewMode === 'list';
  const isRootListingPage = normalizedSegments.length === 1 && normalizedSegments[0] === AVON_ALL_SEGMENT;
  const normalizedSegmentsForResolution = isRootListingPage ? [] : normalizedSegments;
  const canonicalPath = normalizedSegments.length
    ? `/brand/avon/${normalizedSegments.join('/')}`
    : (isLegacyRootListingView ? `/brand/avon/${AVON_ALL_SEGMENT}` : '/brand/avon');
  const isBrandLanding = normalizedSegments.length === 0 && !isLegacyRootListingView;
  const queryString = queryStringFromRecord(passThroughQuery);
  const canonicalDestination = queryString ? `${canonicalPath}?${queryString}` : canonicalPath;
  const isNextDataRequest = String(req.url || '').startsWith('/_next/data/');

  if (hasEmptyOrDirtySegments || hasDoubleSlashInPath) {
    return loggedRedirect({
      req,
      pathname: requestPath,
      destination: canonicalDestination,
      permanent: true,
      matchedRoute: '/brand/avon/[[...segments]]',
      reason: 'Normalized Avon path to canonical segment structure',
    });
  }

  try {
    applyCachePolicy(res, 'archivePage');

    const { bySlug, byParent } = await getCachedBrandHierarchy();
    const avonBrand = bySlug.get('avon');
    if (!avonBrand) {
      return loggedNotFound({
        req,
        pathname: requestPath,
        matchedRoute: '/brand/avon/[[...segments]]',
        reason: 'Avon brand root missing from hierarchy cache',
      });
    }

    const brandName = toText(avonBrand.name || 'Avon');
    const resolved = resolveBrandSegments(normalizedSegmentsForResolution, avonBrand, byParent);
    if (resolved.invalid) {
      return loggedNotFound({
        req,
        pathname: requestPath,
        matchedRoute: '/brand/avon/[[...segments]]',
        reason: 'Invalid Avon sub-brand path',
      });
    }

    const resolvedSegmentsCanonical = resolved.chain.map((item) => item.pathSegment);
    const expectedCanonicalSegments = isRootListingPage ? [AVON_ALL_SEGMENT] : resolvedSegmentsCanonical;
    if (expectedCanonicalSegments.join('/') !== normalizedSegments.join('/')) {
      const correctedPath = expectedCanonicalSegments.length
        ? `/brand/avon/${expectedCanonicalSegments.join('/')}`
        : '/brand/avon';
      const correctedDestination = queryString ? `${correctedPath}?${queryString}` : correctedPath;
      return loggedRedirect({
        req,
        pathname: requestPath,
        destination: correctedDestination,
        permanent: true,
        matchedRoute: '/brand/avon/[[...segments]]',
        reason: 'Resolved Avon hierarchy to canonical path',
      });
    }

    if (normalizedSegments[0] === AVON_ALL_SEGMENT && normalizedSegments.length > 1) {
      const correctedPath = normalizedSegments.slice(1).length
        ? `/brand/avon/${resolvedSegmentsCanonical.join('/')}`
        : `/brand/avon/${AVON_ALL_SEGMENT}`;
      const correctedDestination = queryString ? `${correctedPath}?${queryString}` : correctedPath;
      return loggedRedirect({
        req,
        pathname: requestPath,
        destination: correctedDestination,
        permanent: true,
        matchedRoute: '/brand/avon/[[...segments]]',
        reason: 'Removed invalid all-segment prefix from Avon path',
      });
    }

    const currentBrand = resolved.currentBrand;
    const currentBrandFilterValue = String(currentBrand.id);
    const childBrands: ChildBrandLink[] = (byParent.get(currentBrand.id) ?? [])
      .map((entry) => ({
        slug: entry.slug,
        label: entry.name,
        count: entry.count,
      }))
      .filter((entry) => !!entry.slug && !!entry.label);

    const sharedFilters: Record<string, string | number | boolean> = {
      ...parsedSharedFilters,
      brand: currentBrandFilterValue,
    };
    const productParams = {
      ...sharedFilters,
      page,
      per_page: perPage,
      include_totals: true,
    };

    const [productsResult, collectionResult] = await Promise.allSettled([
      api.get<unknown>(ENDPOINTS.PRODUCTS, { params: productParams, skipReviewEnrich: true }),
      api.get<unknown>(ENDPOINTS.COLLECTION_DATA, { params: sharedFilters }),
    ]);

    if (productsResult.status !== 'fulfilled') throw productsResult.reason;
    if (collectionResult.status !== 'fulfilled') throw collectionResult.reason;
    const productsPayload = productsResult.value;
    const products = normalizeList<RestProduct>(productsPayload);
    const initialFacets = normalizeCollectionDataPayload(collectionResult.value);
    let totalCount = extractTotalCount(productsPayload, NaN);
    if (!Number.isFinite(totalCount)) {
      const scopedCount = getFacetScopedCount(
        initialFacets,
        ['brand', 'brands', 'product-brand'],
        [currentBrandFilterValue, currentBrand.slug],
      );
      if (Number.isFinite(scopedCount)) {
        totalCount = Number(scopedCount);
      }
    }
    if (!Number.isFinite(totalCount)) totalCount = products.length;
    const initialHasNextPage = totalCount > 0 ? page * perPage < totalCount : products.length >= perPage;
    const breadcrumbs = buildAvonBreadcrumbs(resolved.chain, { isRootListingPage });
    const h1 = buildAvonH1(resolvedSegmentsCanonical, { isRootListingPage });
    const landing = buildStaticAvonLanding({
      brandName,
      childBrands,
      brandDescription: avonBrand.description || '',
    });
    const pageUrl = getAbsoluteUrlFromRequest(req, canonicalDestination);
    const seoData = await buildArchiveSeoData({
      pageUrl,
      title: h1,
      description: toText(
        isBrandLanding
          ? landing.subtitle || avonBrand.description || ''
          : currentBrand.description || '',
      ),
      currentPage: page,
      hasNextPage: initialHasNextPage,
      productCount: products.length,
      skipRankMath: isNextDataRequest,
      allowThinArchiveNoindex: !isBrandLanding,
    });
    if (isRootListingPage) {
      seoData.robots = 'noindex, follow';
    }

    const forcedState: Partial<CollectionFilterState> = {
      brand: [currentBrandFilterValue],
    };
    const routeScope: RouteScope = { taxonomy: 'brand', value: currentBrandFilterValue };
    const omitManagedQueryKeys = ['brand'];

    return {
      props: {
        brandName,
        isBrandLanding,
        isRootListingPage,
        resolvedSegments: isRootListingPage ? [AVON_ALL_SEGMENT] : resolvedSegmentsCanonical,
        currentBrandSlug: currentBrand.slug,
        childBrands,
        products,
        totalCount,
        initialHasNextPage,
        initialFacets,
        seoData,
        breadcrumbs,
        landing,
        h1,
        routeScope,
        forcedState,
        queryParams: passThroughQuery,
        omitManagedQueryKeys,
      },
    };
  } catch (error) {
    console.error('[Avon Catch-All] SSR error:', error);
    throw error;
  }
};
