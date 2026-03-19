import { useEffect } from 'react';
import type { NextPage, GetServerSideProps, InferGetServerSidePropsType } from 'next';
import SingleProduct from '@/components/Product/SingleProductFinal.component';
import Layout from '@/components/Layout/Layout.component';
import SeoHead from '@/components/SeoHead';
import ContinueShopping, { trackRecentlyViewed } from '@/components/Index/ContinueShopping.component';
import { api } from '@/utils/api';
import { applyCachePolicy } from '@/utils/cacheControl';
import { ENDPOINTS } from '@/utils/endpoints';
import { normalizeProduct } from '@/utils/productTransformer';
import {
  buildAttributeArchiveTermLookup,
  fetchCatalogAttributes,
  fetchCatalogAttributeTerms,
  normalizeArchiveSlug,
} from '@/utils/attributeArchive';
import {
  buildProductGroupJsonLd,
  buildVariationLabel,
  buildVariationUrlMap,
  getCanonicalUrl,
  getIndexingRules,
  isAllowedStorageVariation,
  isMobilePhoneProduct,
  readAttributeQueryParams,
  resolveSelectedVariation,
} from '@/utils/mobileVariationSeo';
import { getAbsoluteUrlFromRequest } from '@/utils/seoPage';
import {
  buildFallbackDescription,
  getRankMathSEO,
  getSiteName,
  resolveSeoOgImage,
} from '@/utils/seo';
import { parseSeoHead } from '@/utils/parseSeoHead';
import { enrichRankMathProductSchemas } from '@/utils/seoProductSchema';
import { getRequestPathname, loggedNotFound, loggedRedirect } from '@/utils/routeEventLogger';

type PageProps = InferGetServerSidePropsType<typeof getServerSideProps>;

const ProductPage: NextPage<PageProps> = ({ product, loading, networkStatus, isRefurbished }) => {
  const hasError = networkStatus === 8;
  const recentlyViewedId = product?.databaseId;
  const recentlyViewedName = product?.name || '';
  const recentlyViewedSlug = product?.slug || '';
  const recentlyViewedImage =
    product?.image?.sourceUrl ||
    product?.image?.src ||
    product?.image?.url ||
    (typeof product?.image === 'string' ? product.image : '') ||
    '';
  const recentlyViewedPrice = String(product?.price ?? product?.salePrice ?? product?.regularPrice ?? '');
  const recentlyViewedSalePrice = String(product?.salePrice ?? '');
  const recentlyViewedRegularPrice = String(product?.regularPrice ?? '');

  useEffect(() => {
    if (!recentlyViewedId) return;
    trackRecentlyViewed({
      id: recentlyViewedId,
      name: recentlyViewedName,
      slug: recentlyViewedSlug,
      image: recentlyViewedImage,
      price: recentlyViewedPrice,
      salePrice: recentlyViewedSalePrice,
      regularPrice: recentlyViewedRegularPrice,
    });
  }, [
    recentlyViewedId,
    recentlyViewedImage,
    recentlyViewedName,
    recentlyViewedPrice,
    recentlyViewedRegularPrice,
    recentlyViewedSalePrice,
    recentlyViewedSlug,
  ]);

  return (
    <Layout title={product?.name ? product.name : ''} fullWidth>
      <SeoHead seoData={product?.seoData || {}} />
      {product ? (
        <SingleProduct
          product={product}
          loading={loading}
          isRefurbished={isRefurbished}
          initialSelectedVariationId={product?.initialSelectedVariationId}
          variationUrlMap={product?.variationUrlMap}
          isMobilePhoneProduct={Boolean(product?.isMobilePhoneProduct)}
          siteName={product?.siteName || 'Shopwice'}
        />
      ) : (
        <div className="mt-8 text-2xl text-center">Loading product...</div>
      )}

      <ContinueShopping excludeId={product?.databaseId} />

      {hasError && <div className="mt-8 text-2xl text-center">Error loading product...</div>}
    </Layout>
  );
};

export default ProductPage;

const normalizeProductsPayload = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (payload?.id || payload?.slug) return [payload];
    if (Array.isArray(payload.products)) return payload.products;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.results)) return payload.results;
    if (Array.isArray(payload.items)) return payload.items;
  }
  return [];
};

const normalizeSlugValue = (value: unknown) =>
  decodeURIComponent(String(value ?? '').trim())
    .split('/')
    .filter(Boolean)
    .pop()
    ?.toLowerCase() || '';

const firstQueryValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return String(value[0] ?? '').trim();
  return String(value ?? '').trim();
};

const normalizeIdValue = (value: unknown): number | null => {
  const parsed = Number(String(value ?? '').trim());
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
};

const normalizeVariationQueryKey = (value: unknown) => {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return '';

  if (text.startsWith('attribute_pa_')) {
    const suffix = text
      .slice('attribute_pa_'.length)
      .replace(/[+\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    return suffix ? `attribute_pa_${suffix}` : '';
  }

  if (text.startsWith('attribute_')) {
    const suffix = text
      .slice('attribute_'.length)
      .replace(/[+\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    return suffix ? `attribute_${suffix}` : '';
  }

  return text
    .replace(/[+\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const normalizeVariationQueryValue = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[+\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

const matchBySlug = (products: any[], requestedSlug: string) => {
  const normalizedRequested = normalizeSlugValue(requestedSlug);
  return (
    products.find(
      (node: any) => normalizeSlugValue(node?.slug) === normalizedRequested,
    ) || null
  );
};

const matchById = (products: any[], requestedId: number) =>
  products.find((node: any) => {
    const candidates = [node?.id, node?.databaseId, node?.productId];
    return candidates.some((candidate) => normalizeIdValue(candidate) === requestedId);
  }) || null;

const getVariationId = (variation: any) => variation?.id ?? variation?.variation_id ?? variation?.databaseId;
const normalizeStock = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '');
const parseManageStock = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return undefined;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
};
const isVariationAvailable = (variation: any) => {
  const status = normalizeStock(variation?.stockStatus ?? variation?.stock_status);
  if (status === 'outofstock' || status === 'out') return false;
  if (status === 'instock' || status === 'in') return true;
  const manageStock = parseManageStock(variation?.manageStock ?? variation?.manage_stock);
  if (manageStock === false) return true;
  const rawQty = variation?.stockQuantity ?? variation?.stock_quantity;
  const qty = Number(rawQty);
  if (rawQty !== '' && rawQty !== null && rawQty !== undefined && Number.isFinite(qty) && qty <= 0) {
    return false;
  }
  return true;
};

const sanitizeForJson = (value: any): any => {
  if (value === undefined) return null;
  if (value === null) return null;
  if (Array.isArray(value)) return value.map((entry) => sanitizeForJson(entry));
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce<Record<string, any>>((acc, [key, entry]) => {
      acc[key] = sanitizeForJson(entry);
      return acc;
    }, {});
  }
  return value;
};

const enrichProductAttributeArchives = async (product: any) => {
  const attributes = Array.isArray(product?.attributes) ? product.attributes : [];
  if (!attributes.length) return product;

  const catalogAttributes = await fetchCatalogAttributes().catch(() => []);
  const termLookupCache = new Map<number, Record<string, string>>();

  const enrichedAttributes = await Promise.all(
    attributes.map(async (attribute: any) => {
      const normalizedSlug = normalizeArchiveSlug(attribute?.slug ?? attribute?.taxonomy ?? attribute?.name);
      if (!normalizedSlug) {
        return {
          ...attribute,
          hasArchives: false,
          archiveBaseSlug: '',
          archiveTermLookup: {},
        };
      }

      try {
        const catalogAttribute =
          catalogAttributes.find((entry) => entry.slug === normalizedSlug) ||
          catalogAttributes.find((entry) => normalizeArchiveSlug(entry.taxonomy.replace(/^pa_/, '')) === normalizedSlug) ||
          null;
        if (!catalogAttribute?.hasArchives) {
          return {
            ...attribute,
            hasArchives: false,
            archiveBaseSlug: normalizedSlug,
            archiveTermLookup: {},
          };
        }

        if (!termLookupCache.has(catalogAttribute.id)) {
          const terms = await fetchCatalogAttributeTerms(catalogAttribute.id);
          termLookupCache.set(catalogAttribute.id, buildAttributeArchiveTermLookup(terms));
        }
        const archiveTermLookup = termLookupCache.get(catalogAttribute.id) || {};

        return {
          ...attribute,
          hasArchives: Object.keys(archiveTermLookup).length > 0,
          archiveBaseSlug: catalogAttribute.slug || normalizedSlug,
          archiveTermLookup,
        };
      } catch {
        return {
          ...attribute,
          hasArchives: false,
          archiveBaseSlug: normalizedSlug,
          archiveTermLookup: {},
        };
      }
    }),
  );

  return {
    ...product,
    attributes: enrichedAttributes,
  };
};

// Fetch full category details (parent field) and build ancestor chain for breadcrumbs.
// Products from the API only return { id, name, slug } — no parent info.
const buildCategoryTree = async (productCategories: any[]): Promise<any[]> => {
  if (!productCategories.length) return productCategories;

  const cache = new Map<string, any>();
  for (const cat of productCategories) {
    const id = String(cat?.id ?? '').trim();
    if (id) cache.set(id, cat);
  }

  const fetchCat = async (id: string, forceRefresh = false): Promise<any | null> => {
    const cached = cache.get(id);
    if (!forceRefresh && cached) return cached;

    try {
      const payload = await api.get<any>(ENDPOINTS.CATEGORIES, { params: { id } });
      const list = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload?.data) ? payload.data : []);
      const candidate = list.find((entry: any) => String(entry?.id ?? '').trim() === id) ?? list[0] ?? null;
      if (candidate) {
        cache.set(id, candidate);
        return candidate;
      }
    } catch { /* fall through to legacy route shape */ }

    try {
      const data = await api.get<any>(`${ENDPOINTS.CATEGORIES}/${id}`);
      const cat = Array.isArray(data) ? data[0] : (data?.id ? data : null);
      if (cat) { cache.set(id, cat); return cat; }
    } catch { /* ignore */ }
    return null;
  };

  // Fetch full details for any category missing the parent field
  await Promise.all(
    productCategories
      .filter(cat => !('parent' in cat))
      .map(async cat => {
        const id = String(cat?.id ?? '').trim();
        if (!id) return;
        const result = await fetchCat(id, true);
        if (result) cache.set(id, { ...cat, ...result });
      }),
  );

  // Walk parent chain up to 3 levels (sufficient for e-commerce breadcrumbs)
  for (let depth = 0; depth < 3; depth++) {
    const missing = new Set<string>();
    for (const cat of cache.values()) {
      const parentId = String(cat?.parent ?? '').trim();
      if (parentId && parentId !== '0' && !cache.has(parentId)) missing.add(parentId);
    }
    if (missing.size === 0) break;
    await Promise.all([...missing].map(id => fetchCat(id)));
  }

  // Build ancestors[] for each product category
  return productCategories.map(cat => {
    const id = String(cat?.id ?? '').trim();
    const detail = id ? (cache.get(id) ?? cat) : cat;
    const ancestors: Array<{ id: any; name: string; slug: string }> = [];
    const visited = new Set<string>();
    let parentId = String(detail?.parent ?? '').trim();
    while (parentId && parentId !== '0') {
      if (visited.has(parentId)) break;
      visited.add(parentId);
      const parent = cache.get(parentId);
      if (!parent) break;
      ancestors.unshift({ id: parent.id, name: String(parent.name ?? parent.slug ?? ''), slug: String(parent.slug ?? '') });
      parentId = String(parent?.parent ?? '').trim();
    }
    return { ...detail, ancestors };
  });
};

const getPrimaryProductImage = (product: any) =>
  product?.image?.sourceUrl ||
  product?.image?.src ||
  product?.image?.url ||
  (typeof product?.image === 'string' ? product.image : '') ||
  '';

const buildProductSeoData = async ({
  product,
  absoluteParentUrl,
  canonicalUrl,
  siteName,
  effectiveTitle,
  indexingRules,
  selectedVariationLabel,
  variationJsonLd,
  rankMathHead,
}: {
  product: any;
  absoluteParentUrl: string;
  canonicalUrl: string;
  siteName: string;
  effectiveTitle: string;
  indexingRules: { robots: string };
  selectedVariationLabel: string;
  variationJsonLd: Record<string, any>[];
  rankMathHead: string | null;
}) => {
  const fallbackTitle = effectiveTitle ? `${effectiveTitle} | ${siteName}` : siteName;
  const fallbackDescription = buildFallbackDescription(
    product?.shortDescription || product?.description || '',
    155,
  );
  const parsedSeo = await parseSeoHead(rankMathHead);
  const isVariationView = Boolean(selectedVariationLabel);

  const title = isVariationView
    ? fallbackTitle
    : parsedSeo?.title || fallbackTitle;
  const metaDescription =
    parsedSeo?.metaDescription ||
    parsedSeo?.ogDescription ||
    parsedSeo?.twitterDescription ||
    fallbackDescription ||
    null;
  const ogTitle = isVariationView
    ? fallbackTitle
    : parsedSeo?.ogTitle || title;
  const ogDescription = parsedSeo?.ogDescription || metaDescription;
  const resolvedOgImage = await resolveSeoOgImage(
    parsedSeo?.ogImage || getPrimaryProductImage(product) || null,
  );
  const rankMathJsonLd = Array.isArray(parsedSeo?.jsonLd) && parsedSeo.jsonLd.length > 0
    ? enrichRankMathProductSchemas(parsedSeo.jsonLd, product, canonicalUrl)
    : [];
  const jsonLd = variationJsonLd.length > 0 ? variationJsonLd : rankMathJsonLd;

  return {
    title,
    metaDescription,
    canonical: canonicalUrl,
    fallbackCanonical: absoluteParentUrl,
    robots: indexingRules.robots,
    ogTitle,
    ogDescription,
    ogImage: resolvedOgImage,
    ogUrl: canonicalUrl,
    ogType: parsedSeo?.ogType || 'product',
    twitterCard: parsedSeo?.twitterCard || 'summary_large_image',
    twitterTitle: parsedSeo?.twitterTitle || ogTitle || title,
    twitterDescription:
      parsedSeo?.twitterDescription ||
      parsedSeo?.ogDescription ||
      metaDescription,
    twitterImage: parsedSeo?.twitterImage || resolvedOgImage,
    jsonLd,
  };
};

export const getServerSideProps: GetServerSideProps = async ({ params, res, req, query, resolvedUrl }) => {
  try {
    // Default TTL — tightened after product fetch based on stock level
    applyCachePolicy(res, 'productPage');
    const requestedToken = normalizeSlugValue(params?.slug || firstQueryValue(query?.slug as string | string[] | undefined));
    const requestPath = getRequestPathname(req, String(resolvedUrl || '/product'));
    if (!requestedToken) {
      return loggedNotFound({
        req,
        pathname: requestPath,
        matchedRoute: '/product/[slug]',
        reason: 'Missing product slug',
      });
    }
    const requestedId = /^\d+$/.test(requestedToken)
      ? normalizeIdValue(requestedToken)
      : null;

    // Start SEO fetch immediately while product lookup runs in parallel.
    // When the slug is known upfront (non-ID request), we can fire getRankMathSEO
    // before the product API call completes — saving the full RankMath round-trip time.
    const earlySeoUrl = !requestedId
      ? getAbsoluteUrlFromRequest(req, `/product/${encodeURIComponent(requestedToken)}/`)
      : null;
    const rankMathHeadPromise: Promise<string | null> = earlySeoUrl
      ? getRankMathSEO(earlySeoUrl).catch(() => null)
      : Promise.resolve(null);

    let product: any = null;

    if (!requestedId) {
      try {
        const directPayload = await api.get<any>(
          `${ENDPOINTS.PRODUCTS}/${encodeURIComponent(requestedToken)}`,
          { params: { include_variations: true } },
        );
        const normalized = normalizeProductsPayload(directPayload);
        product = matchBySlug(normalized, requestedToken) || normalized[0] || null;
      } catch {
        product = null;
      }
    }

    if (!product && requestedId) {
      try {
        const directById = await api.get<any>(
          `${ENDPOINTS.PRODUCTS}/${requestedId}`,
          { params: { include_variations: true } },
        );
        const normalized = normalizeProductsPayload(directById);
        product = matchById(normalized, requestedId) || normalized[0] || null;
      } catch {
        product = null;
      }
    }

    if (!product && requestedId) {
      try {
        const byVariationPayload = await api.get<any>(ENDPOINTS.PRODUCTS, {
          params: {
            variation_id: requestedId,
            include_variations: true,
            per_page: 10,
            page: 1,
          },
        });
        const candidates = normalizeProductsPayload(byVariationPayload);
        product =
          candidates.find((node: any) => {
            const variationNodes = Array.isArray(node?.variations) ? node.variations : [];
            return variationNodes.some((variation: any) =>
              normalizeIdValue(variation?.id ?? variation?.variation_id ?? variation?.databaseId) === requestedId,
            );
          }) ||
          candidates[0] ||
          null;
      } catch {
        product = null;
      }
    }

    if (!product && !requestedId) {
      try {
        const payload = await api.get<any>(ENDPOINTS.PRODUCTS, {
          params: {
            slug: requestedToken,
            per_page: 10,
            page: 1,
            include_variations: true,
          },
        });
        product = matchBySlug(normalizeProductsPayload(payload), requestedToken);
      } catch {
        product = null;
      }
    }

    if (!product) {
      return loggedNotFound({
        req,
        pathname: requestPath,
        matchedRoute: '/product/[slug]',
        reason: 'Product lookup returned no match',
      });
    }
    product = normalizeProduct(product);
    if (!product) {
      return loggedNotFound({
        req,
        pathname: requestPath,
        matchedRoute: '/product/[slug]',
        reason: 'Product normalization returned null',
      });
    }
    const productIdForReviews = product.id ?? product.databaseId;
    const categoryTreePromise =
      Array.isArray(product.categories) && product.categories.length > 0
        ? buildCategoryTree(product.categories).catch(() => product.categories)
        : Promise.resolve(Array.isArray(product.categories) ? product.categories : []);
    const reviewsPromise = productIdForReviews
      ? api
          .get<any>(ENDPOINTS.productReviews(productIdForReviews))
          .then((reviewsPayload) => {
            const reviewsArray = Array.isArray(reviewsPayload) ? reviewsPayload : [];
            return reviewsArray.map((rev: any, index: number) => ({
              id: String(rev?.id ?? `review-${index}`),
              content: rev?.review ?? rev?.content ?? '',
              rating: Number(rev?.rating ?? 0),
              date_created: rev?.date_created ?? rev?.date ?? '',
              date: rev?.date_created ?? rev?.date ?? '',
              reviewer: rev?.reviewer ?? rev?.reviewer_name ?? rev?.author_name ?? rev?.name ?? rev?.author ?? 'Verified Buyer',
            }));
          })
          .catch(() => [])
      : Promise.resolve([]);

    const [enrichedProduct, resolvedCategories, resolvedReviews] = await Promise.all([
      enrichProductAttributeArchives(product).catch(() => product),
      categoryTreePromise,
      reviewsPromise,
    ]);
    product = enrichedProduct;
    if (Array.isArray(resolvedCategories) && resolvedCategories.length > 0) {
      product.categories = resolvedCategories;
    }
    product.reviews = Array.isArray(resolvedReviews) ? resolvedReviews : [];

    // Tighten cache TTL for low-stock products so buyers don't see stale availability
    const rawStockQty = product?.stockQuantity ?? product?.stock_quantity;
    const stockQty = Number(rawStockQty);
    const isLowStockProduct = Number.isFinite(stockQty) && stockQty > 0 && stockQty < 10;
    if (isLowStockProduct) {
      applyCachePolicy(res, 'lowStockProductPage');
    }

    // Legacy fallback kept disabled; categories are already resolved above in parallel.
    if (false && Array.isArray(product.categories) && product.categories.length > 0) {
      try {
        product.categories = await buildCategoryTree(product.categories);
      } catch { /* breadcrumbs will still work, just without full ancestor tree */ }
    }

    // Fetch reviews separately — not included in the product endpoint response
    try {
      const productIdForReviews = product.id ?? product.databaseId;
      if (false && productIdForReviews) {
        const reviewsPayload = await api.get<any>(ENDPOINTS.productReviews(productIdForReviews));
        const reviewsArray = Array.isArray(reviewsPayload) ? reviewsPayload : [];
        product.reviews = reviewsArray.map((rev: any, index: number) => ({
          id: String(rev?.id ?? `review-${index}`),
          content: rev?.review ?? rev?.content ?? '',
          rating: Number(rev?.rating ?? 0),
          date_created: rev?.date_created ?? rev?.date ?? '',
          date: rev?.date_created ?? rev?.date ?? '',
          reviewer: rev?.reviewer ?? rev?.reviewer_name ?? rev?.author_name ?? rev?.name ?? rev?.author ?? 'Verified Buyer',
        }));
      }
    } catch {
      // leave reviews as empty array on failure
    }

    const variationNodes = Array.isArray(product?.variations) ? product.variations : [];
    const requestedVariation = requestedId
      ? variationNodes.find((variation: any) =>
          normalizeIdValue(getVariationId(variation)) === requestedId,
        )
      : null;
    const resolvedSlug = normalizeSlugValue(product?.slug);
    if (requestedId && resolvedSlug && resolvedSlug !== requestedToken) {
      const variationParams = new URLSearchParams();
      const requestedVariationAttributes = Array.isArray(requestedVariation?.attributes)
        ? requestedVariation.attributes
        : [];
      requestedVariationAttributes.forEach((entry: any) => {
        const key = normalizeVariationQueryKey(
          entry?.name ?? entry?.attribute ?? entry?.slug ?? entry?.key,
        );
        const value = normalizeVariationQueryValue(
          entry?.option ?? entry?.value ?? entry?.name,
        );
        if (!key || !value) return;
        variationParams.set(key, value);
      });
      const querySuffix = variationParams.toString();
      const destination = querySuffix
        ? `/product/${encodeURIComponent(resolvedSlug)}?${querySuffix}`
        : `/product/${encodeURIComponent(resolvedSlug)}`;
      return loggedRedirect({
        req,
        pathname: requestPath,
        destination,
        permanent: false,
        matchedRoute: '/product/[slug]',
        reason: 'Variation ID resolved to canonical product slug',
      });
    }

    const siteName = getSiteName();
    const queryAttributes = readAttributeQueryParams(query as Record<string, string | string[] | undefined>);
    const mobileProduct = isMobilePhoneProduct(product);
    const selectedVariationFromQuery = resolveSelectedVariation(product, variationNodes, queryAttributes);
    const firstAvailableVariation =
      variationNodes.find((variation: any) => isVariationAvailable(variation)) ??
      variationNodes[0] ??
      null;
    const initialSelectedVariationNode = selectedVariationFromQuery || firstAvailableVariation;
    const initialSelectedVariationId = initialSelectedVariationNode
      ? getVariationId(initialSelectedVariationNode)
      : null;

    const parentPath = `/product/${encodeURIComponent(resolvedSlug || requestedToken)}/`;
    const currentPath = String(resolvedUrl || parentPath);
    const absoluteParentUrl = getAbsoluteUrlFromRequest(req, parentPath);
    const absoluteCurrentUrl = getAbsoluteUrlFromRequest(req, currentPath);
    const indexingRules = getIndexingRules(
      product,
      selectedVariationFromQuery,
      queryAttributes,
      mobileProduct,
    );
    const canonicalUrl = getCanonicalUrl(
      product,
      selectedVariationFromQuery,
      queryAttributes,
      mobileProduct,
      absoluteParentUrl,
      absoluteCurrentUrl,
    );

    const selectedVariationLabel = buildVariationLabel(selectedVariationFromQuery);
    const effectiveTitle = selectedVariationLabel
      ? `${product.name} - ${selectedVariationLabel}`
      : product.name;
    const variationUrlMap = Object.fromEntries(buildVariationUrlMap(product, variationNodes).entries());
    const siblingAllowedVariants = variationNodes.filter((variation: any) =>
      !String(getVariationId(variation) || '').startsWith('synthetic-') &&
      isAllowedStorageVariation(variation),
    );

    const jsonLd =
      mobileProduct &&
      indexingRules.hasVariationParam &&
      indexingRules.indexable &&
      selectedVariationFromQuery
        ? [
            buildProductGroupJsonLd(
              product,
              selectedVariationFromQuery,
              siblingAllowedVariants,
              canonicalUrl,
            ),
          ]
        : [];

    const attributes = Array.isArray(product?.attributes) ? product.attributes : [];
    const categories = Array.isArray(product?.categories) ? product.categories : [];
    const isRefurbished =
      attributes.some((attr: any) => {
        const options = Array.isArray(attr?.options) ? attr.options : [];
        return options.some((opt: any) => String(opt).toLowerCase().includes('refurbish'));
      }) ||
      categories.some((cat: any) => {
        const n = String(cat?.name || '').toLowerCase();
        const s = String(cat?.slug || '').toLowerCase();
        return n.includes('refurbish') || s.includes('refurbish');
      });

    // Resolve the early SEO fetch (or fall back to fetching now if we didn't have a slug earlier).
    const rankMathHead = earlySeoUrl
      ? await rankMathHeadPromise
      : await getRankMathSEO(absoluteParentUrl).catch(() => null);

    const safeProduct = sanitizeForJson({
      ...product,
      seoData: await buildProductSeoData({
        product,
        absoluteParentUrl,
        canonicalUrl,
        siteName,
        effectiveTitle,
        indexingRules,
        selectedVariationLabel: selectedVariationLabel || '',
        variationJsonLd: jsonLd,
        rankMathHead,
      }),
      initialSelectedVariationId,
      variationUrlMap,
      isMobilePhoneProduct: mobileProduct,
      selectedVariationLabel: selectedVariationLabel || '',
      siteName,
    });

    return {
      props: {
        product: safeProduct,
        loading: false,
        networkStatus: 7,
        isRefurbished: Boolean(isRefurbished),
      },
    };
  } catch (error) {
    console.error('[SSR] Product page error:', error);
    return loggedNotFound({
      req,
      pathname: getRequestPathname(req, String(resolvedUrl || '/product')),
      matchedRoute: '/product/[slug]',
      reason: 'Unhandled product SSR error',
    });
  }
};
