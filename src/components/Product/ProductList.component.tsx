import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/router';
import { Product } from '@/types/product';
import { useProductFilters, type RestProduct } from '@/hooks/useProductFilters';
import { usePagination } from '@/hooks/usePagination';
import { useCollectionController } from '@/features/collection/useCollectionController';
import ProductCard from './ProductCard.component';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner.component';
import type { ApiFacetGroup, CollectionFilterState, RouteScope } from '@/features/collection/types';

const ProductFilters = dynamic(() => import('./ProductFilters.component'), {
  ssr: false,
  loading: () => (
    <div className="px-2 py-4 text-sm text-gray-500">
      Loading filters...
    </div>
  ),
});

export type { RestProduct } from '@/hooks/useProductFilters';

interface ProductListProps {
  products: Product[] | RestProduct[];
  pageInfo?: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
  slug?: string;
  categoryId?: number;
  query?: any;
  queryParams?: Record<string, string | number | boolean>;
  queryVariables?: Record<string, any>;
  context?: any;
  totalCount?: number;
  initialHasNextPage?: boolean;
  initialFacets?: ApiFacetGroup[];
  forcedState?: Partial<CollectionFilterState>;
  omitManagedQueryKeys?: string[];
  customRouteScope?: RouteScope;
  fetchAllForSort?: boolean;
  paginationEndpoint?: string;
  paginationPageParamKey?: string;
  paginationPerPageParamKey?: string;
  syncFilterStateToUrl?: boolean;
  initialPage?: number;
}

type UiSortValue = 'popular' | 'price-low' | 'price-high' | 'newest' | 'avg-rating';

const OFFSCREEN_ARCHIVE_CARD_STYLE: CSSProperties = {
  contentVisibility: 'auto',
  containIntrinsicSize: '360px 520px',
};

const fromQueryValue = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
};

const fromCsvQueryValue = (value: string | string[] | undefined): string[] => {
  const raw = fromQueryValue(value);
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const parseBool = (value: string | string[] | undefined): boolean | undefined => {
  const raw = fromQueryValue(value).toLowerCase();
  if (!raw) return undefined;
  if (raw === '1' || raw === 'true' || raw === 'yes') return true;
  if (raw === '0' || raw === 'false' || raw === 'no') return false;
  return undefined;
};

const parseNumber = (value: string | string[] | undefined): number | undefined => {
  const raw = fromQueryValue(value);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const ProductList = ({
  products: initialProducts,
  pageInfo,
  slug,
  categoryId,
  queryParams,
  queryVariables,
  totalCount,
  initialHasNextPage,
  initialFacets,
  forcedState,
  omitManagedQueryKeys,
  customRouteScope,
  fetchAllForSort = false,
  paginationEndpoint,
  paginationPageParamKey,
  paginationPerPageParamKey,
  syncFilterStateToUrl = false,
  initialPage = 1,
}: ProductListProps) => {
  void queryVariables;
  void categoryId;

  const router = useRouter();
  const useServerCollection = !fetchAllForSort && !paginationEndpoint;
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [clientPage, setClientPage] = useState(Math.max(1, Math.floor(Number(initialPage) || 1)));
  const [hasExplicitPriceFilter, setHasExplicitPriceFilter] = useState(false);
  const hasInitializedUrlState = useRef(false);

  const pageSize = 24;
  const collectionController = useCollectionController<any>({
    enabled: useServerCollection,
    router,
    initialProducts: initialProducts as any[],
    initialFacets,
    initialTotalCount: totalCount,
    initialHasNextPage: pageInfo?.hasNextPage ?? initialHasNextPage,
    queryParams,
    routeScope: customRouteScope,
    defaultPerPage: pageSize,
    searchFallback: typeof queryParams?.q === 'string' ? String(queryParams.q) : undefined,
    forcedState,
    omitManagedQueryKeys,
  });

  const pagination = usePagination({
    initialProducts: initialProducts as any,
    initialPage: Math.max(1, Math.floor(Number(initialPage) || 1)),
    initialHasNextPage: pageInfo?.hasNextPage ?? initialHasNextPage ?? false,
    slug: slug || '',
    params: queryParams,
    endpoint: paginationEndpoint,
    pageParamKey: paginationPageParamKey,
    perPageParamKey: paginationPerPageParamKey,
    pageSize,
  });

  const allProducts = useMemo(() => {
    if (useServerCollection) return [] as Product[];
    if (fetchAllForSort) return initialProducts;
    return (pagination.products as unknown as Product[]) || initialProducts;
  }, [fetchAllForSort, initialProducts, pagination.products, useServerCollection]);

  const effectiveFacets = useMemo<ApiFacetGroup[]>(() => {
    if (Array.isArray(initialFacets) && initialFacets.length > 0) {
      return initialFacets;
    }

    const buckets = {
      category: new Map<string, { name: string; value: string; count: number }>(),
      brand: new Map<string, { name: string; value: string; count: number }>(),
      location: new Map<string, { name: string; value: string; count: number }>(),
      tag: new Map<string, { name: string; value: string; count: number }>(),
    };
    const attributeBuckets = new Map<
      string,
      {
        taxonomy: string;
        label: string;
        terms: Map<string, { name: string; value: string; count: number }>;
      }
    >();

    const normalizeSlug = (value: unknown) =>
      String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/_+/g, '-');

    const addTerms = (
      terms: unknown,
      bucket: Map<string, { name: string; value: string; count: number }>,
    ) => {
      const list = Array.isArray(terms) ? terms : [];
      const seenInProduct = new Set<string>();
      list.forEach((entry: any) => {
        const name = String(entry?.name || entry || '').trim();
        const explicitSlug = String(entry?.slug || '').trim();
        const normalizedSlug = normalizeSlug(explicitSlug || name);
        const filterValue = explicitSlug || name;
        if (!name || !normalizedSlug || !filterValue) return;
        if (seenInProduct.has(normalizedSlug)) return;
        seenInProduct.add(normalizedSlug);
        const current = bucket.get(normalizedSlug);
        if (current) {
          current.count += 1;
          return;
        }
        bucket.set(normalizedSlug, { name, value: filterValue, count: 1 });
      });
    };

    const canonicalizeAttributeKey = (value: unknown) =>
      String(value || '')
        .trim()
        .toLowerCase()
        .replace(/^pa_/, '')
        .replace(/^attribute_/, '')
        .replace(/\s+/g, '-')
        .replace(/_+/g, '-');

    const addAttributeTerms = (attributes: unknown) => {
      const list = Array.isArray(attributes) ? attributes : [];
      list.forEach((entry: any) => {
        const rawLabel = String(entry?.name || entry?.label || entry?.taxonomy || entry?.slug || '').trim();
        const rawTaxonomy = String(entry?.taxonomy || entry?.slug || entry?.name || '').trim();
        const normalizedTaxonomy = canonicalizeAttributeKey(rawTaxonomy || rawLabel);
        if (!rawLabel || !normalizedTaxonomy) return;

        const bucketKey = `pa_${normalizedTaxonomy}`;
        const existingGroup = attributeBuckets.get(bucketKey) || {
          taxonomy: bucketKey,
          label: rawLabel,
          terms: new Map<string, { name: string; value: string; count: number }>(),
        };

        const seenInProduct = new Set<string>();
        const rawOptions = Array.isArray(entry?.options)
          ? entry.options
          : entry?.value
            ? [entry.value]
            : entry?.option
              ? [entry.option]
              : [];

        rawOptions.forEach((option: any) => {
          const name = String(
            option?.name ||
            option?.label ||
            option?.value ||
            option?.slug ||
            option ||
            '',
          ).trim();
          const slug = String(option?.slug || '').trim();
          const value = String(option?.value || option?.name || option?.label || slug || option || '').trim();
          const normalizedValue = (slug || value || name).toLowerCase();
          if (!name || !value || !normalizedValue || seenInProduct.has(normalizedValue)) return;
          seenInProduct.add(normalizedValue);

          const current = existingGroup.terms.get(normalizedValue);
          if (current) {
            current.count += 1;
            return;
          }

          existingGroup.terms.set(normalizedValue, {
            name,
            value,
            count: 1,
          });
        });

        if (existingGroup.terms.size > 0) {
          attributeBuckets.set(bucketKey, existingGroup);
        }
      });
    };

    (allProducts as any[]).forEach((product) => {
      addTerms(product?.categories, buckets.category);
      addTerms(product?.brands, buckets.brand);
      addTerms(product?.locations, buckets.location);
      addTerms(product?.tags, buckets.tag);
      addAttributeTerms(product?.attributes);
    });

    const toFacet = (
      taxonomy: string,
      label: string,
      source: Map<string, { name: string; value: string; count: number }>,
    ) => {
      const terms = Array.from(source.entries()).map(([slug, entry]) => ({
        value: entry.value,
        slug,
        name: entry.name,
        count: entry.count,
      }));
      if (!terms.length) return null;
      return {
        taxonomy,
        label,
        terms,
      } satisfies ApiFacetGroup;
    };

    return [
      toFacet('category', 'Categories', buckets.category),
      toFacet('brand', 'Brands', buckets.brand),
      toFacet('location', 'Locations', buckets.location),
      toFacet('tag', 'Tags', buckets.tag),
      ...Array.from(attributeBuckets.values()).map((group) => ({
        taxonomy: group.taxonomy,
        label: group.label,
        terms: Array.from(group.terms.values())
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((term) => ({
            value: term.value,
            slug: term.value.toLowerCase(),
            name: term.name,
            count: term.count,
          })),
      })),
    ].filter(Boolean) as ApiFacetGroup[];
  }, [allProducts, initialFacets]);

  const {
    sortBy,
    setSortBy,
    selectedAttributes,
    setSelectedAttributes,
    toggleAttribute,
    selectedBrands,
    setSelectedBrands,
    selectedLocations,
    setSelectedLocations,
    selectedCategories,
    setSelectedCategories,
    selectedTags,
    setSelectedTags,
    selectedStockStatus,
    setSelectedStockStatus,
    toggleStockStatus,
    inStock,
    setInStock,
    priceBounds,
    priceRange,
    setPriceRange,
    minRating,
    setMinRating,
    showOnSaleOnly,
    setShowOnSaleOnly,
    resetFilters,
    filteredProducts,
  } = useProductFilters(allProducts as any);

  const localEffectivePage = fetchAllForSort ? clientPage : pagination.page;
  const localPagedProducts = fetchAllForSort
    ? filteredProducts.slice((localEffectivePage - 1) * pageSize, localEffectivePage * pageSize)
    : filteredProducts;
  const localHasNextPage = fetchAllForSort
    ? localEffectivePage * pageSize < filteredProducts.length
    : pagination.hasNextPage;

  const effectivePage = useServerCollection ? collectionController.state.page : localEffectivePage;
  const pagedProducts = useServerCollection
    ? (collectionController.products as unknown as Product[])
    : localPagedProducts;
  const hasPreviousPage = effectivePage > 1;
  const hasNextPage = useServerCollection ? collectionController.hasNextPage : localHasNextPage;

  const isProductVisibleInListing = (product: any) => {
    const status = String(product?.stockStatus ?? product?.stock_status ?? '')
      .trim()
      .toLowerCase();
    if (status === 'outofstock' || status === 'out of stock') return false;
    if (status === 'instock' || status === 'in stock' || status === 'onbackorder') return true;

    if (typeof product?.inStock === 'boolean') return product.inStock;
    if (typeof product?.in_stock === 'boolean') return product.in_stock;

    const stockQuantityRaw = product?.stockQuantity ?? product?.stock_quantity;
    if (stockQuantityRaw !== undefined && stockQuantityRaw !== null) {
      const stockQuantity = Number(stockQuantityRaw);
      if (Number.isFinite(stockQuantity)) return stockQuantity > 0;
    }

    return true;
  };

  const visibleProducts = useMemo(
    () => (pagedProducts || []).filter((product: any) => isProductVisibleInListing(product)),
    [pagedProducts],
  );

  const loadNext = () => {
    if (useServerCollection) {
      if (hasNextPage) collectionController.actions.setPage(effectivePage + 1);
      return;
    }
    if (fetchAllForSort) {
      if (hasNextPage) setClientPage((prev) => prev + 1);
      return;
    }
    void pagination.goToPage(pagination.page + 1);
  };

  const loadPrevious = () => {
    if (useServerCollection) {
      if (hasPreviousPage) collectionController.actions.setPage(Math.max(1, effectivePage - 1));
      return;
    }
    if (fetchAllForSort) {
      if (hasPreviousPage) setClientPage((prev) => Math.max(1, prev - 1));
      return;
    }
    void pagination.goToPage(Math.max(1, pagination.page - 1));
  };

  const toggleValue = (values: string[], nextValue: string) => {
    const normalized = String(nextValue || '').trim().toLowerCase();
    if (!normalized) return values;
    const exists = values.some((value) => value.trim().toLowerCase() === normalized);
    if (exists) {
      return values.filter((value) => value.trim().toLowerCase() !== normalized);
    }
    return [...values, nextValue];
  };

  const serializeQuery = (queryObject: Record<string, unknown>) =>
    Object.entries(queryObject)
      .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${String(value)}`)
      .join('&');

  const omitPageKey = (queryObject: Record<string, unknown>) =>
    Object.entries(queryObject).reduce<Record<string, unknown>>((acc, [key, value]) => {
      if (key === 'page') return acc;
      acc[key] = value;
      return acc;
    }, {});

  useEffect(() => {
    if (!syncFilterStateToUrl || useServerCollection) return;
    if (!router.isReady || hasInitializedUrlState.current) return;

    const query = router.query as Record<string, string | string[] | undefined>;
    const sort = fromQueryValue(query.sort);
    if (sort === 'popular' || sort === 'price-low' || sort === 'price-high' || sort === 'newest' || sort === 'avg-rating') {
      setSortBy(sort);
    }

    const category = fromQueryValue(query.category);
    if (category) setSelectedCategories([category]);

    const brands = fromCsvQueryValue(query.brand);
    if (brands.length) setSelectedBrands(brands);

    const locations = fromCsvQueryValue(query.location);
    if (locations.length) setSelectedLocations(locations);

    const tags = fromCsvQueryValue(query.tag);
    if (tags.length) setSelectedTags(tags);

    const minPrice = parseNumber(query.minPrice);
    const maxPrice = parseNumber(query.maxPrice);
    if (minPrice !== undefined || maxPrice !== undefined) {
      // Local URL hydration intentionally seeds filter UI state once on mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasExplicitPriceFilter(true);
      setPriceRange((prev) => [minPrice ?? prev[0], maxPrice ?? prev[1]]);
    }

    const minRatingFromQuery = parseNumber(query.minRating);
    if (minRatingFromQuery !== undefined) setMinRating(minRatingFromQuery);

    const onSale = parseBool(query.onSale);
    if (onSale !== undefined) setShowOnSaleOnly(onSale);

    const inStockFromQuery = parseBool(query.inStock);
    if (inStockFromQuery !== undefined) setInStock(inStockFromQuery);

    const stockStatus = fromCsvQueryValue(query.stockStatus).filter(
      (entry): entry is 'instock' | 'outofstock' | 'onbackorder' =>
        entry === 'instock' || entry === 'outofstock' || entry === 'onbackorder',
    );
    if (stockStatus.length) setSelectedStockStatus(stockStatus);

    const urlAttributes = Object.entries(query).reduce<Record<string, string[]>>((acc, [key, value]) => {
      if (!key.startsWith('attr_')) return acc;
      const attrKey = key.slice(5).trim().toLowerCase();
      if (!attrKey) return acc;
      const values = fromCsvQueryValue(value);
      if (values.length > 0) acc[attrKey] = values;
      return acc;
    }, {});
    if (Object.keys(urlAttributes).length > 0) {
      setSelectedAttributes(urlAttributes);
    }

    if (fetchAllForSort) {
      const pageFromQuery = Math.max(1, Math.floor(parseNumber(query.page) || 1));
      setClientPage(pageFromQuery);
    }

    hasInitializedUrlState.current = true;
  }, [
    useServerCollection,
    fetchAllForSort,
    router.isReady,
    router.query,
    setInStock,
    setMinRating,
    setPriceRange,
    setSelectedAttributes,
    setSelectedBrands,
    setSelectedCategories,
    setSelectedLocations,
    setSelectedStockStatus,
    setSelectedTags,
    setShowOnSaleOnly,
    setSortBy,
    syncFilterStateToUrl,
  ]);

  useEffect(() => {
    if (!syncFilterStateToUrl || useServerCollection) return;
    if (!router.isReady || !hasInitializedUrlState.current) return;

    const query = router.query as Record<string, string | string[] | undefined>;
    const targetPage = Math.max(1, Math.floor(parseNumber(query.page) || 1));

    if (fetchAllForSort) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (targetPage !== clientPage) setClientPage(targetPage);
      return;
    }

    if (targetPage !== pagination.page) {
      void pagination.goToPage(targetPage);
    }
  }, [
    useServerCollection,
    clientPage,
    fetchAllForSort,
    pagination,
    router.isReady,
    router.query,
    syncFilterStateToUrl,
  ]);

  useEffect(() => {
    if (!syncFilterStateToUrl || useServerCollection) return;
    if (!router.isReady || !hasInitializedUrlState.current) return;

    const query: Record<string, string | string[]> = {};
    Object.entries(router.query as Record<string, string | string[] | undefined>).forEach(([key, value]) => {
      if (
        key === 'sort' ||
        key === 'category' ||
        key === 'brand' ||
        key === 'location' ||
        key === 'tag' ||
        key === 'minPrice' ||
        key === 'maxPrice' ||
        key === 'minRating' ||
        key === 'onSale' ||
        key === 'inStock' ||
        key === 'stockStatus' ||
        key === 'page' ||
        key.startsWith('attr_')
      ) {
        return;
      }
      if (Array.isArray(value)) {
        const normalized = value.map((entry) => String(entry || '').trim()).filter(Boolean);
        if (normalized.length > 0) query[key] = normalized;
        return;
      }
      const normalized = String(value || '').trim();
      if (normalized) query[key] = normalized;
    });

    if (sortBy && sortBy !== 'popular') query.sort = sortBy;
    if (selectedCategories[0]) query.category = selectedCategories[0];
    if (selectedBrands.length > 0) query.brand = selectedBrands.join(',');
    if (selectedLocations.length > 0) query.location = selectedLocations.join(',');
    if (selectedTags.length > 0) query.tag = selectedTags.join(',');
    if (hasExplicitPriceFilter) {
      if (priceRange[0] > (priceBounds?.[0] ?? 0)) query.minPrice = String(priceRange[0]);
      if (priceRange[1] < (priceBounds?.[1] ?? Number.MAX_SAFE_INTEGER)) {
        query.maxPrice = String(priceRange[1]);
      }
    }
    if (minRating > 0) query.minRating = String(minRating);
    if (showOnSaleOnly) query.onSale = '1';
    if (inStock === true) query.inStock = '1';
    if (inStock === false) query.inStock = '0';
    if (selectedStockStatus.length > 0) query.stockStatus = selectedStockStatus.join(',');
    if (effectivePage > 1) query.page = String(effectivePage);

    Object.entries(selectedAttributes).forEach(([key, values]) => {
      if (!Array.isArray(values) || values.length === 0) return;
      query[`attr_${String(key).trim().toLowerCase()}`] = values.join(',');
    });

    const currentSerialized = serializeQuery(router.query as Record<string, unknown>);
    const nextSerialized = serializeQuery(query);
    if (currentSerialized === nextSerialized) return;
    const currentPage = fromQueryValue((router.query as Record<string, string | string[] | undefined>).page);
    const nextPage = fromQueryValue(query.page);
    const pageChanged = currentPage !== nextPage;
    const currentWithoutPage = serializeQuery(omitPageKey(router.query as Record<string, unknown>));
    const nextWithoutPage = serializeQuery(omitPageKey(query));
    const onlyPageChanged = pageChanged && currentWithoutPage === nextWithoutPage;

    const navTarget = {
      pathname: router.pathname,
      query,
    };
    if (onlyPageChanged) {
      void router.push(navTarget, undefined, { shallow: true, scroll: false });
      return;
    }
    void router.replace(navTarget, undefined, { shallow: true, scroll: false });
  }, [
    useServerCollection,
    inStock,
    minRating,
    effectivePage,
    priceBounds,
    priceRange,
    router,
    selectedAttributes,
    selectedBrands,
    selectedCategories,
    selectedLocations,
    selectedStockStatus,
    selectedTags,
    hasExplicitPriceFilter,
    showOnSaleOnly,
    sortBy,
    syncFilterStateToUrl,
    router.query,
  ]);

  useEffect(() => {
    if (!isFilterOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFilterOpen]);

  useEffect(() => {
    if (!isFilterOpen) return;
    const onResize = () => {
      if (window.innerWidth >= 1024) {
        setIsFilterOpen(false);
      }
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isFilterOpen]);

  const extractSlugFromUrl = (value: unknown) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const withoutQuery = raw.split('?')[0];
    const clean = withoutQuery.replace(/^https?:\/\/[^/]+/i, '').split('/').filter(Boolean);
    const productIndex = clean.findIndex((entry) => entry.toLowerCase() === 'product');
    if (productIndex >= 0 && clean[productIndex + 1]) return clean[productIndex + 1];
    return clean[clean.length - 1] || '';
  };

  const localFilterState = useMemo(
    () => ({
      category: selectedCategories[0],
      brand: selectedBrands,
      tag: selectedTags,
      location: selectedLocations,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
      minRating: minRating || undefined,
      maxRating: undefined,
      stockStatus: selectedStockStatus,
      inStock,
      onSale: showOnSaleOnly || undefined,
      attributes: selectedAttributes,
      page: effectivePage,
      perPage: pageSize,
    }),
    [
      effectivePage,
      minRating,
      pageSize,
      priceRange,
      selectedAttributes,
      selectedBrands,
      selectedCategories,
      selectedLocations,
      selectedStockStatus,
      selectedTags,
      inStock,
      showOnSaleOnly,
    ],
  );

  const filterState = useServerCollection ? collectionController.state : localFilterState;
  const facets = useServerCollection ? collectionController.facets : effectiveFacets;
  const filterError = useServerCollection
    ? (collectionController.productsPanel.error || collectionController.facetsPanel.error)
    : null;
  const isFiltersLoading = useServerCollection
    ? (collectionController.productsPanel.isLoading || collectionController.facetsPanel.isLoading)
    : pagination.isLoading;
  const totalProductsCount = useServerCollection
    ? collectionController.totalCount
    : (typeof totalCount === 'number' ? totalCount : filteredProducts.length);
  const serverHasExplicitPriceFilter =
    filterState.minPrice !== undefined || filterState.maxPrice !== undefined;

  const resolveUiSortFromCollection = (): UiSortValue => {
    const orderby = collectionController.state.orderby;
    const order = collectionController.state.order;
    if (orderby === 'price' && order === 'ASC') return 'price-low';
    if (orderby === 'price' && order === 'DESC') return 'price-high';
    if (orderby === 'rating') return 'avg-rating';
    if (orderby === 'date') return 'newest';
    return 'popular';
  };

  const currentSortBy: UiSortValue = useServerCollection
    ? resolveUiSortFromCollection()
    : (sortBy as UiSortValue);

  const applySort = (nextSort: UiSortValue) => {
    if (!useServerCollection) {
      setSortBy(nextSort);
      return;
    }
    if (nextSort === 'price-low') {
      collectionController.actions.setSort('price', 'ASC');
      return;
    }
    if (nextSort === 'price-high') {
      collectionController.actions.setSort('price', 'DESC');
      return;
    }
    if (nextSort === 'newest') {
      collectionController.actions.setSort('date', 'DESC');
      return;
    }
    if (nextSort === 'avg-rating') {
      collectionController.actions.setSort('rating', 'DESC');
      return;
    }
    collectionController.actions.setSort('popularity', 'DESC');
  };

  const renderFiltersPanel = () => (
    <ProductFilters
      state={filterState}
      facets={facets}
      priceBounds={priceBounds}
      hasExplicitPriceFilter={useServerCollection ? serverHasExplicitPriceFilter : hasExplicitPriceFilter}
      onToggleCategory={(value) =>
        useServerCollection
          ? collectionController.actions.toggleCategory(value)
          : setSelectedCategories((prev) =>
              prev[0]?.toLowerCase() === value.toLowerCase() ? [] : [value],
            )
      }
      onToggleBrand={(value) =>
        useServerCollection
          ? collectionController.actions.toggleBrand(value)
          : setSelectedBrands((prev) => toggleValue(prev, value))
      }
      onSetBrands={(values) =>
        useServerCollection
          ? collectionController.actions.applyPatch({ brand: values }, 'filter')
          : setSelectedBrands(values)
      }
      onToggleTag={(value) =>
        useServerCollection
          ? collectionController.actions.toggleTag(value)
          : setSelectedTags((prev) => toggleValue(prev, value))
      }
      onToggleLocation={(value) =>
        useServerCollection
          ? collectionController.actions.toggleLocation(value)
          : setSelectedLocations((prev) => toggleValue(prev, value))
      }
      onToggleStockStatus={(value) =>
        useServerCollection
          ? collectionController.actions.toggleStockStatus(value)
          : toggleStockStatus(value)
      }
      onToggleAttribute={(taxonomy, value) =>
        useServerCollection
          ? collectionController.actions.toggleAttribute(taxonomy, value)
          : toggleAttribute(taxonomy, value)
      }
      onSetBoolean={(key, value) => {
        if (useServerCollection) {
          collectionController.actions.setBoolean(key, value);
          return;
        }
        if (key === 'inStock') setInStock(value);
        if (key === 'onSale') setShowOnSaleOnly(Boolean(value));
      }}
      onSetNumber={(key, value) => {
        if (useServerCollection) {
          collectionController.actions.setNumberValue(key, value);
          return;
        }
        if (key === 'minPrice') {
          setHasExplicitPriceFilter(true);
          setPriceRange((prev) => [value ?? prev[0], prev[1]]);
        }
        if (key === 'maxPrice') {
          setHasExplicitPriceFilter(true);
          setPriceRange((prev) => [prev[0], value ?? prev[1]]);
        }
        if (key === 'minRating') setMinRating(value ?? 0);
      }}
      onClearAll={() => {
        if (useServerCollection) {
          collectionController.actions.clearAll();
          return;
        }
        setHasExplicitPriceFilter(false);
        resetFilters();
      }}
      isLoading={isFiltersLoading}
      error={filterError}
      routeTaxonomy={customRouteScope?.taxonomy}
    />
  );

  return (
    <div className="w-full px-1 md:px-4 py-1 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6" id="results-header">
      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <h2 className="text-xl font-bold mb-4 text-[#2c3338] uppercase tracking-tight">Filters</h2>
          {renderFiltersPanel()}
        </div>
      </aside>

      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center flex-shrink-1 min-w-0 overflow-hidden">
            <p className="text-xs md:text-sm text-gray-500 font-normal truncate" suppressHydrationWarning>
              <span className="md:inline hidden">Found </span>
              <span className="font-semibold text-gray-900">
                {totalProductsCount}
              </span>
              <span className="md:inline hidden"> products</span>
              <span className="md:hidden inline"> items found</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden lg:block relative">
              <select
                id="sort-select-desktop"
                aria-label="Sort products"
                value={currentSortBy}
                onChange={(e) => applySort(e.target.value as UiSortValue)}
                className="border rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="popular">Popular</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest</option>
                <option value="avg-rating">Top Rated</option>
              </select>
            </div>

            <div className="relative lg:hidden">
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 border rounded-md bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
                aria-label="Sort"
              >
                <span className="text-sm font-medium text-gray-700">Sort</span>
              </button>
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-xl border border-gray-100 z-40 py-1">
                    {[
                      { value: 'popular', label: 'Popular' },
                      { value: 'price-low', label: 'Price: Low to High' },
                      { value: 'price-high', label: 'Price: High to Low' },
                      { value: 'newest', label: 'Newest' },
                      { value: 'avg-rating', label: 'Top Rated' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          applySort(option.value as UiSortValue);
                          setIsSortOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-2.5 text-sm ${currentSortBy === option.value ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setIsFilterOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 border rounded-md bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              <span className="text-sm font-medium">Filters</span>
            </button>
          </div>
        </div>

        <div
          className={`lg:hidden fixed inset-0 z-[120] ${isFilterOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'}`}
          aria-hidden={!isFilterOpen}
        >
          <div
            className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${isFilterOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setIsFilterOpen(false)}
          />
          <aside
            className={`absolute left-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl overflow-y-auto transition-transform duration-300 ease-out ${isFilterOpen ? 'translate-x-0' : '-translate-x-full'}`}
            aria-label="Filters panel"
          >
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button onClick={() => setIsFilterOpen(false)} className="p-1" aria-label="Close filters">x</button>
            </div>
            <div className="px-6 py-6">
              {renderFiltersPanel()}
            </div>
          </aside>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-1 gap-y-2 md:gap-x-3 md:gap-y-6">
          {visibleProducts.map((product: any, index: number) => (
            (() => {
              const resolvedUrl = String(
                product?.url || product?.href || product?.link || product?.permalink || product?.productUrl || '',
              ).trim();
              const resolvedSlug = String(product?.slug || '').trim() || extractSlugFromUrl(resolvedUrl);
              const resolvedRegularPrice = product?.regularPrice ?? product?.regular_price ?? '';
              const resolvedSalePrice = product?.salePrice ?? product?.sale_price ?? '';
              const resolvedOnSale = Boolean(
                product?.onSale ??
                product?.on_sale ??
                (resolvedRegularPrice && resolvedSalePrice && String(resolvedRegularPrice) !== String(resolvedSalePrice)),
              );

              return (
                <div
                  key={product.databaseId || product.id || product.variationId || `${resolvedSlug}-${index}`}
                  className="min-w-0"
                  style={index >= 10 ? OFFSCREEN_ARCHIVE_CARD_STYLE : undefined}
                >
                  <ProductCard
                    databaseId={Number(product.databaseId || product.id || product.productId || 0) || undefined}
                    id={Number(product.id || product.variationId || product.databaseId || 0) || undefined}
                    name={product.name || product.title || 'Product'}
                    price={product.price}
                    regularPrice={resolvedRegularPrice}
                    salePrice={resolvedSalePrice}
                    onSale={resolvedOnSale}
                    slug={resolvedSlug}
                    url={resolvedUrl || (resolvedSlug ? `/product/${resolvedSlug}/` : '')}
                    type={product.type}
                    variantLabel={product.variantLabel || product.variant_label}
                    image={product.image}
                    images={product.images}
                    thumbnail={product.thumbnail ?? product.thumbnailUrl ?? product.image_url}
                    averageRating={Number(product.averageRating ?? product.average_rating ?? 0)}
                    attributes={product.attributes}
                    stockQuantity={product.stockQuantity ?? product.stock_quantity}
                    reviewCount={Number(product.reviewCount ?? product.rating_count ?? 0)}
                  />
                </div>
              );
            })()
          ))}
        </div>

        {!isFiltersLoading && visibleProducts.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-500">
            No in-stock products available right now.
          </div>
        )}

        {isFiltersLoading && (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner color="orange" size="md" />
          </div>
        )}

        {!isFiltersLoading && (
          <div className="flex justify-center items-center gap-4 py-8 mt-4 border-t border-gray-100">
            <button
              onClick={loadPrevious}
              disabled={!hasPreviousPage}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${hasPreviousPage
                ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm'
                : 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-100'
                }`}
            >
              Previous
            </button>
            <span className="text-sm font-medium text-gray-600">
              Page {effectivePage}
            </span>
            <button
              onClick={loadNext}
              disabled={!hasNextPage}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${hasNextPage
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200'
                : 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-100'
                }`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductList;
