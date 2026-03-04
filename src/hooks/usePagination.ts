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

  // REST does not provide cursor pagination in this client path.
  initialHasNextPage?: boolean;

  // filters
  slug?: string;
  categoryId?: number;
  search?: string;

  // any extra query params
  params?: Record<string, any>;

  // UI page size
  pageSize?: number;
}

export function usePagination({
  initialProducts,
  initialHasNextPage = false,
  slug,
  categoryId,
  search,
  params: initialParams = {},
  pageSize = 24,
}: PaginationOptions) {
  const [products, setProducts] = useState<RestProduct[]>(initialProducts);
  const [hasNextPage, setHasNextPage] = useState<boolean>(initialHasNextPage);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setProducts(initialProducts);
    setHasNextPage(initialHasNextPage);
    setPage(1);
  }, [initialProducts, initialHasNextPage]);

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
          page: targetPage,
          per_page: pageSize,
          ...taxonomyParams,
        };

        const results: any = await api.get(ENDPOINTS.PRODUCTS, {
          params: queryParams,
        });

        const list: RestProduct[] = Array.isArray(results)
          ? results
          : Array.isArray(results?.products)
            ? results.products
            : [];

        if (targetPage > 1 && list.length === 0) {
          setHasNextPage(false);
          return;
        }

        setProducts(list);
        setPage(targetPage);
        // A full page means there may be more; a partial page means we're at the end.
        setHasNextPage(list.length === pageSize);
      } catch (error) {
        console.error('[usePagination] Error going to page:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [categoryId, initialParams, slug, search, pageSize],
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
