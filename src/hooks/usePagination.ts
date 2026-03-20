import { useState, useCallback, useEffect } from 'react';
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';

export type TaxonomyTerm = { id?: number | string; name: string; slug?: string; parent?: number };

export type RestAttribute = {
  name: string;
  options?: Array<
    string | number | { name?: string; label?: string; value?: string }
  > | null;
};

export type RestProduct = {
  id: number | string;
  slug?: string;
  name?: string;

  price?: string | number | null;
  regularPrice?: string | number | null;
  salePrice?: string | number | null;
  onSale?: boolean;

  image?: { src?: string | null; url?: string | null; sourceUrl?: string | null } | null;

  averageRating?: number;
  reviewCount?: number;

  stockQuantity?: number | null;

  categories?: TaxonomyTerm[] | null;
  attributes?: RestAttribute[] | null;

  brands?: TaxonomyTerm[] | null;
  locations?: TaxonomyTerm[] | null;

  dateCreated?: string;
  dateModified?: string;
};

interface PaginationOptions {
  initialProducts: RestProduct[];
  initialPage?: number;

  // REST does not provide cursor pagination in this client path.
  initialHasNextPage?: boolean;

  // filters
  slug?: string;
  categoryId?: number;
  search?: string;

  // any extra query params
  params?: Record<string, any>;
  endpoint?: string;
  pageParamKey?: string;
  perPageParamKey?: string;

  // UI page size
  pageSize?: number;
}

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const readTotalFromPayload = (payload: any): number | null => {
  const candidates = [
    payload?.total,
    payload?.totalCount,
    payload?.data?.total,
    payload?.data?.totalCount,
    payload?.pagination?.total,
    payload?.data?.pagination?.total,
    payload?.meta?.total,
    payload?.data?.meta?.total,
  ];

  for (const candidate of candidates) {
    const parsed = toFiniteNumber(candidate);
    if (parsed !== null && parsed >= 0) return parsed;
  }

  return null;
};

const readHasNextFromPayload = (payload: any): boolean | null => {
  const candidates = [
    payload?.hasNextPage,
    payload?.has_next_page,
    payload?.pagination?.hasNextPage,
    payload?.pagination?.has_next_page,
    payload?.data?.hasNextPage,
    payload?.data?.has_next_page,
    payload?.data?.pagination?.hasNextPage,
    payload?.data?.pagination?.has_next_page,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'boolean') return candidate;
  }

  return null;
};

export function usePagination({
  initialProducts,
  initialPage = 1,
  initialHasNextPage = false,
  slug,
  categoryId,
  search,
  params: initialParams = {},
  endpoint = ENDPOINTS.PRODUCTS,
  pageParamKey = 'page',
  perPageParamKey = 'per_page',
  pageSize = 24,
}: PaginationOptions) {
  const [products, setProducts] = useState<RestProduct[]>(initialProducts);
  const [hasNextPage, setHasNextPage] = useState<boolean>(initialHasNextPage);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(Math.max(1, Number(initialPage) || 1));

  useEffect(() => {
    setProducts(initialProducts);
    setHasNextPage(initialHasNextPage);
    setPage(Math.max(1, Number(initialPage) || 1));
  }, [initialProducts, initialHasNextPage, initialPage]);

  const goToPage = useCallback(
    async (targetPage: number) => {
      if (targetPage < 1) return;

      setIsLoading(true);

      try {
        const hasExplicitParams = Object.keys(initialParams || {}).length > 0;
        const taxonomyParams = hasExplicitParams
          ? initialParams
          : (categoryId
            ? { category: categoryId }
            : search
              ? { search }
              : slug
                ? { category: slug }
                : {});

        const queryParams = {
          ...taxonomyParams,
          [pageParamKey]: targetPage,
          [perPageParamKey]: pageSize,
        };
        if (perPageParamKey !== 'per_page') {
          queryParams.per_page = pageSize;
        }
        if (perPageParamKey !== 'perPage') {
          queryParams.perPage = pageSize;
        }
        if (pageParamKey !== 'page') {
          queryParams.page = targetPage;
        }

        const normalizedEndpoint = String(endpoint || '').split('?')[0];
        const shouldSkipReviewEnrich = /^\/api\/products\/?$/.test(normalizedEndpoint);
        const results: any = await api.get(endpoint, {
          params: queryParams,
          ...(shouldSkipReviewEnrich ? { skipReviewEnrich: true } : {}),
        });

        const list: RestProduct[] = Array.isArray(results)
          ? results
          : Array.isArray(results?.products)
            ? results.products
            : Array.isArray(results?.items)
              ? results.items
              : Array.isArray(results?.results)
                ? results.results
                : Array.isArray(results?.data?.items)
                  ? results.data.items
                  : Array.isArray(results?.data?.results)
                    ? results.data.results
                    : Array.isArray(results?.data)
                      ? results.data
            : [];

        setProducts(list);
        setPage(targetPage);
        const hasNextFromPayload = readHasNextFromPayload(results);
        const totalFromPayload = readTotalFromPayload(results);
        const computedHasNext =
          hasNextFromPayload ??
          (typeof totalFromPayload === 'number'
            ? targetPage * pageSize < totalFromPayload
            : list.length === pageSize);
        setHasNextPage(computedHasNext);
      } catch (error) {
        console.error('[usePagination] Error going to page:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [categoryId, endpoint, initialParams, pageParamKey, perPageParamKey, slug, search, pageSize],
  );

  const loadMore = useCallback(async () => {
    return goToPage(page + 1);
  }, [page, goToPage]);

  return {
    products,
    isLoading,
    hasNextPage,
    loadMore,
    goToPage,
    page,
    setProducts,
  };
}
