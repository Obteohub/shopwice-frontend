import React, { useMemo } from 'react';
import type { GetServerSideProps } from 'next';
import TaxonomyListingPage from '@/components/Product/TaxonomyListingPage.component';
import SeoHead from '@/components/SeoHead';
import { normalizeCollectionDataPayload } from '@/features/collection/apiClient';
import type { ApiFacetGroup } from '@/features/collection/types';
import { api } from '@/utils/api';
import { applyCachePolicy } from '@/utils/cacheControl';
import { ENDPOINTS } from '@/utils/endpoints';
import type { Product } from '@/types/product';
import {
  buildArchiveSeoData,
  getAbsoluteUrlFromRequest,
  parsePageParam,
  type SeoDataShape,
} from '@/utils/seoPage';
import { getRequestPathname, loggedNotFound } from '@/utils/routeEventLogger';
import { buildTaxonomyBreadcrumbs } from '@/utils/taxonomyBreadcrumbs';
import { decodeHtmlEntities } from '@/utils/text';

type CategoryNode = {
  id?: number;
  databaseId?: number;
  parent?: number | string;
  name?: string;
  slug?: string;
  description?: string | null;
  count?: number;
};

type PageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

interface CategoryPageProps {
  category: CategoryNode | null;
  products: Product[];
  initialFacets: ApiFacetGroup[];
  pageInfo: PageInfo;
  slug: string;
  includeMobileVariations: boolean;
  breadcrumbs: Array<{ label: string; href?: string | null }>;
  seoData: SeoDataShape;
}

const normalizeList = <T,>(payload: any): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) return payload.data as T[];
    if (Array.isArray(payload.products)) return payload.products as T[];
    if (Array.isArray(payload.results)) return payload.results as T[];
  }
  return [];
};

const MOBILE_CATEGORY_MARKERS = ['mobile-phones', 'android-phones', 'basic-phones', 'smartphones', 'iphone'];

const looksLikeMobileCategory = (value: unknown) => {
  const text = String(value || '').toLowerCase().trim();
  if (!text) return false;
  if (text.includes('mobile phone')) return true;
  if (text.includes('smartphone')) return true;
  if (text.includes('android phone')) return true;
  if (text.includes('basic phone')) return true;
  return MOBILE_CATEGORY_MARKERS.some((marker) => text.includes(marker));
};

const toNumericId = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isMobileCategorySubtree = (category: CategoryNode | null, allCategories: CategoryNode[]) => {
  if (!category) return false;
  if (looksLikeMobileCategory(category.slug) || looksLikeMobileCategory(category.name)) return true;

  const byId = new Map<number, CategoryNode>();
  allCategories.forEach((entry) => {
    const id = toNumericId(entry.id ?? entry.databaseId);
    if (id === null) return;
    byId.set(id, entry);
  });

  let currentParent = toNumericId(category?.parent);
  let depth = 0;
  while (currentParent !== null && depth < 20) {
    const parent = byId.get(currentParent);
    if (!parent) break;
    if (looksLikeMobileCategory(parent.slug) || looksLikeMobileCategory(parent.name)) return true;
    currentParent = toNumericId(parent?.parent);
    depth += 1;
  }

  return false;
};

const CategoryPage = ({
  category,
  products,
  initialFacets,
  pageInfo,
  slug,
  includeMobileVariations,
  breadcrumbs,
  seoData,
}: CategoryPageProps) => {
  const title = useMemo(
    () => decodeHtmlEntities(String(category?.name || slug || 'Category').replace(/-/g, ' ')),
    [category?.name, slug],
  );

  return (
    <>
      <SeoHead seoData={seoData} />
      <TaxonomyListingPage
        title={title}
        description={category?.description || undefined}
        products={products}
        pageInfo={pageInfo}
        slug={slug}
        queryParams={includeMobileVariations ? { includeMobileVariations: true, category: slug } : { category: slug }}
        customRouteScope={{ taxonomy: 'category', value: String(category?.databaseId ?? category?.id ?? slug) }}
        emptyMessage="No products found in this category"
        totalCount={category?.count}
        initialFacets={initialFacets}
        fetchAllForSort={false}
        breadcrumbs={breadcrumbs}
      />
    </>
  );
};

export default CategoryPage;

export const getServerSideProps: GetServerSideProps = async ({ params, res, req, query, resolvedUrl }) => {
  const slug = String(params?.slug || '').trim();
  if (!slug) {
    return loggedNotFound({
      req,
      pathname: getRequestPathname(req, String(resolvedUrl || '/product-category')),
      matchedRoute: '/product-category/[slug]',
      reason: 'Missing category slug',
    });
  }

  try {
    applyCachePolicy(res, 'archivePage');
    const page = parsePageParam(query?.page);
    const perPage = 24;

    const [categoriesPayload, allCategoriesPayload] = await Promise.all([
      api.get<any>(ENDPOINTS.CATEGORIES, { params: { slug } }),
      api.get<any>(ENDPOINTS.CATEGORIES, {
        params: {
          per_page: 250,
          page: 1,
        },
      }),
    ]);

    const categories = normalizeList<CategoryNode>(categoriesPayload);
    const allCategories = normalizeList<CategoryNode>(allCategoriesPayload);
    const category =
      categories.find((entry) => String(entry?.slug || '').toLowerCase() === slug.toLowerCase()) ||
      categories[0] ||
      null;

    const includeMobileVariations = isMobileCategorySubtree(category, allCategories);
    const scopedParams = {
      category: slug,
      ...(includeMobileVariations ? { includeMobileVariations: true } : {}),
    };

    const [productsResult, collectionDataResult] = await Promise.allSettled([
      api.get<any>(ENDPOINTS.PRODUCTS, {
        params: {
          ...scopedParams,
          page,
          per_page: perPage,
        },
        skipReviewEnrich: true,
      }),
      api.get<any>(ENDPOINTS.COLLECTION_DATA, {
        params: scopedParams,
      }),
    ]);

    if (productsResult.status !== 'fulfilled') throw productsResult.reason;

    const products = normalizeList<Product>(productsResult.value);
    const initialFacets =
      collectionDataResult.status === 'fulfilled'
        ? normalizeCollectionDataPayload(collectionDataResult.value)
        : [];
    const totalCount = Number(category?.count || products.length || 0);
    const hasNextPage = totalCount > 0 ? page * perPage < totalCount : products.length >= perPage;
    const path = resolvedUrl || `/product-category/${slug}${page > 1 ? `?page=${page}` : ''}`;
    const pageUrl = getAbsoluteUrlFromRequest(req, path);
    const [breadcrumbs, seoData] = await Promise.all([
      buildTaxonomyBreadcrumbs({
        current: category || { slug, name: slug.replace(/-/g, ' ') },
        initialTerms: allCategories,
        endpoint: ENDPOINTS.CATEGORIES,
        basePath: '/product-category',
      }),
      buildArchiveSeoData({
        pageUrl,
        title: decodeHtmlEntities(String(category?.name || slug.replace(/-/g, ' '))),
        description: decodeHtmlEntities(String(category?.description || '')),
        currentPage: page,
        hasNextPage,
        productCount: products.length,
      }),
    ]);

    return {
      props: {
        category,
        products,
        initialFacets,
        pageInfo: { hasNextPage, endCursor: null },
        slug,
        includeMobileVariations,
        breadcrumbs,
        seoData,
      },
    };
  } catch (error) {
    console.error('[Category SSR] failed:', error);
    const page = parsePageParam(query?.page);
    const path = resolvedUrl || `/product-category/${slug}${page > 1 ? `?page=${page}` : ''}`;
    const pageUrl = getAbsoluteUrlFromRequest(req, path);
    const seoData = await buildArchiveSeoData({
      pageUrl,
      title: decodeHtmlEntities(slug.replace(/-/g, ' ')),
      description: '',
      currentPage: page,
      hasNextPage: false,
      productCount: 0,
    });

    return {
      props: {
        category: {
          name: slug.replace(/-/g, ' '),
          slug,
          description: null,
          count: 0,
        },
        products: [],
        initialFacets: [],
        pageInfo: { hasNextPage: false, endCursor: null },
        slug,
        includeMobileVariations: false,
        breadcrumbs: [],
        seoData,
      },
    };
  }
};
