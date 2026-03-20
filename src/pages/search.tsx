import { useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import Layout from '@/components/Layout/Layout.component';
import ProductList from '@/components/Product/ProductList.component';
import BackButton from '@/components/UI/BackButton.component';
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';
import { firstValidImageUrl } from '@/utils/image';
import type { ApiFacetGroup } from '@/features/collection/types';

interface SearchPageProps {
  items: any[];
  facets: ApiFacetGroup[];
  searchTerm: string;
  page: number;
  perPage: number;
  total: number;
  error?: string | null;
}

const coerceInt = (value: unknown, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

const normalizeSearchItems = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.data?.items)) return payload.data.items;
    if (Array.isArray(payload.results)) return payload.results;
    if (Array.isArray(payload.data?.results)) return payload.data.results;
    if (Array.isArray(payload.products)) return payload.products;
    if (Array.isArray(payload.data?.products)) return payload.data.products;
  }
  return [];
};

const normalizeSearchFacets = (payload: any): ApiFacetGroup[] => {
  const candidates = [
    payload?.facets,
    payload?.data?.facets,
    payload?.facetGroups,
    payload?.data?.facetGroups,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as ApiFacetGroup[];
  }
  return [];
};

const safeDecodeURIComponent = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const normalizeSlug = (value: unknown) =>
  safeDecodeURIComponent(String(value || '').trim())
    .split('#')[0]
    .split('?')[0]
    .split('/')
    .filter(Boolean)
    .pop() || '';

const extractProductSlugFromUrl = (value: unknown) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const withoutQuery = raw.split('?')[0].split('#')[0];
  const cleanPath = withoutQuery.replace(/^https?:\/\/[^/]+/i, '');
  const segments = cleanPath.split('/').filter(Boolean);
  const productIndex = segments.findIndex((entry) => entry.toLowerCase() === 'product');
  if (productIndex < 0 || !segments[productIndex + 1]) return '';
  return normalizeSlug(segments[productIndex + 1]);
};

const buildSearchProductHref = (source: any) => {
  const rawUrl = String(
    source?.url || source?.href || source?.link || source?.permalink || source?.productUrl || '',
  ).trim();
  const fromSlugField = normalizeSlug(source?.slug);
  const fromUrl = extractProductSlugFromUrl(rawUrl);
  const slug = fromSlugField || fromUrl;
  if (!slug) return { slug: '', href: '' };
  return {
    slug,
    href: `/product/${encodeURIComponent(slug)}`,
  };
};

const mapSearchItemToProduct = (item: any, index: number) => {
  const source = item?.product && typeof item.product === 'object' ? item.product : item;
  const { slug, href } = buildSearchProductHref(source);
  const imageSource = firstValidImageUrl(
    source?.image,
    source?.image?.src,
    source?.image?.sourceUrl,
    source?.image?.url,
    source?.thumbnail,
    source?.thumbnailUrl,
    source?.images?.[0]?.src,
    source?.images?.[0]?.sourceUrl,
    source?.images?.[0]?.url,
    source?.images?.[0],
  );

  return {
    id: source?.id ?? source?.variationId ?? source?.productId ?? `search-${slug || 'item'}-${index}`,
    databaseId: source?.databaseId ?? source?.id ?? source?.variationId ?? source?.productId,
    name: source?.title || source?.name || 'Product',
    slug,
    url: href,
    type: source?.type || 'product',
    variantLabel: source?.variantLabel || source?.variant_label || '',
    price: source?.price ?? source?.prices?.price ?? source?.displayPrice,
    regularPrice: source?.regularPrice ?? source?.regular_price ?? '',
    salePrice: source?.salePrice ?? source?.sale_price ?? '',
    onSale: Boolean(source?.onSale ?? source?.on_sale),
    image: imageSource ? { sourceUrl: imageSource } : null,
    averageRating: Number(source?.averageRating ?? source?.average_rating ?? 0),
    reviewCount: Number(source?.reviewCount ?? source?.rating_count ?? 0),
    stockQuantity: source?.stockQuantity ?? source?.stock_quantity ?? null,
    inStock: source?.inStock ?? source?.in_stock,
    stockStatus: source?.stockStatus ?? source?.stock_status,
    attributes: Array.isArray(source?.attributes) ? source.attributes : [],
    categories: Array.isArray(source?.categories)
      ? source.categories
      : (Array.isArray(source?.productCategories)
        ? source.productCategories
        : (Array.isArray(item?.categories) ? item.categories : [])),
    brands: Array.isArray(source?.brands)
      ? source.brands
      : (Array.isArray(source?.productBrand)
        ? source.productBrand
        : (Array.isArray(item?.brands) ? item.brands : [])),
    locations: Array.isArray(source?.locations)
      ? source.locations
      : (Array.isArray(source?.productLocation)
        ? source.productLocation
        : (Array.isArray(item?.locations) ? item.locations : [])),
    tags: Array.isArray(source?.tags)
      ? source.tags
      : (Array.isArray(item?.tags) ? item.tags : []),
  };
};

const SearchPage = ({ items, facets, searchTerm, page, perPage, total, error }: SearchPageProps) => {
  const searchTitle = `Search Results for "${searchTerm}"`;
  const mappedProducts = useMemo(
    () =>
      items
        .map((item, index) => mapSearchItemToProduct(item, index))
        .filter((entry) => Boolean(entry?.url || entry?.slug)),
    [items],
  );
  const hasNextPage = page * perPage < total;

  return (
    <Layout title={`Search: ${searchTerm}`} fullWidth={true}>
      <Head>
        <title>{`Search Results for "${searchTerm}" | Shopwice`}</title>
      </Head>
      <div className="px-2 md:px-4 pt-1 pb-1">
        <nav className="mb-2 text-sm text-gray-500" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/" className="hover:text-gray-900 transition-colors">
                Home
              </Link>
            </li>
            <li className="text-gray-400" aria-hidden="true">
              /
            </li>
            <li className="font-medium text-gray-900">Search</li>
          </ol>
        </nav>
        <BackButton />
        <header className="mb-6">
          <h1 className="text-[22px] font-bold text-[#2c3338] mb-1 capitalize tracking-tight text-center">
            {searchTitle.toLowerCase()}
          </h1>
          {!error && (
            <p className="text-sm leading-relaxed text-gray-500 max-w-none w-full">
              {total.toLocaleString()} results found
            </p>
          )}
        </header>
        {error && (
          <div className="flex justify-center items-center min-h-[300px]">
            <p className="text-red-500">Search temporarily unavailable</p>
          </div>
        )}
        {!error && mappedProducts.length === 0 && (
          <div className="flex justify-center items-center min-h-[300px]">
            <p className="text-gray-600 text-lg">{`No products found matching "${searchTerm}"`}</p>
          </div>
        )}
        {!error && mappedProducts.length > 0 && (
          <ProductList
            products={mappedProducts}
            pageInfo={{ hasNextPage, endCursor: null }}
            slug="search"
            initialPage={page}
            queryParams={{ q: searchTerm }}
            totalCount={total}
            initialFacets={facets}
            paginationEndpoint={ENDPOINTS.SEARCH}
            paginationPageParamKey="page"
            paginationPerPageParamKey="perPage"
            syncFilterStateToUrl={true}
          />
        )}
      </div>
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const searchTerm = String(context.query.q || '').trim();
  const page = coerceInt(context.query.page, 1);
  const perPage = Math.min(50, coerceInt(context.query.perPage, 24));

  if (!searchTerm) {
    return {
      props: { items: [], facets: [], searchTerm: '', page: 1, perPage, total: 0, error: null },
    };
  }

  try {
    const payload: any = await api.get(ENDPOINTS.SEARCH, { params: { q: searchTerm, page, perPage } });
    const items = normalizeSearchItems(payload);
    const facets = normalizeSearchFacets(payload);
    const total = coerceInt(
      payload?.total ?? payload?.data?.total ?? payload?.pagination?.total ?? payload?.data?.pagination?.total ?? items.length,
      items.length,
    );
    return { props: { items, facets, searchTerm, page, perPage, total, error: null } };
  } catch (error: any) {
    return {
      props: {
        items: [],
        facets: [],
        searchTerm,
        page,
        perPage,
        total: 0,
        error: String(error?.message || 'Search temporarily unavailable'),
      },
    };
  }
};

export default SearchPage;
