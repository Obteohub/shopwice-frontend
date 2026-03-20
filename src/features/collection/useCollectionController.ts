import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NextRouter } from 'next/router';
import {
  trackFilterApplied,
  trackFilterCleared,
  trackNoResults,
  trackPaginationChanged,
  trackSortChanged,
} from './analytics';
import { fetchCollectionFacets, fetchCollectionProducts, fetchCollectionTotalCount } from './apiClient';
import {
  applyCollectionStatePatch,
  buildCollectionRequestKey,
  buildCollectionUrlFromState,
  createDefaultCollectionFilterState,
  isManagedCollectionQueryKey,
  parseAsPathQuery,
  parseCollectionFilterState,
  toCollectionQueryRecord,
} from './queryState';
import type {
  ApiFacetGroup,
  CollectionFilterState,
  RouteScope,
  SortOrder,
  SortOrderBy,
  StockStatus,
} from './types';

type CollectionControllerArgs<TProduct> = {
  enabled?: boolean;
  router: NextRouter;
  initialProducts: TProduct[];
  initialFacets?: ApiFacetGroup[];
  initialTotalCount?: number;
  initialHasNextPage?: boolean;
  queryParams?: Record<string, string | number | boolean | undefined>;
  routeScope?: RouteScope;
  defaultPerPage?: number;
  searchFallback?: string;
  forcedState?: Partial<CollectionFilterState>;
  omitManagedQueryKeys?: string[];
};

type PanelState = {
  isLoading: boolean;
  error: string | null;
};

const normalizeArray = (value: string[]) => {
  const seen = new Set<string>();
  const output: string[] = [];

  value.forEach((entry) => {
    const normalized = String(entry || '').trim();
    const key = normalized.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    output.push(normalized);
  });

  return output;
};

const toggleValueInArray = (current: string[], nextValue: string) => {
  const normalizedValue = String(nextValue || '').trim();
  if (!normalizedValue) return normalizeArray(current);

  const exists = current.some(
    (entry) => String(entry || '').toLowerCase() === normalizedValue.toLowerCase(),
  );

  if (exists) {
    return normalizeArray(
      current.filter(
        (entry) => String(entry || '').toLowerCase() !== normalizedValue.toLowerCase(),
      ),
    );
  }

  return normalizeArray([...current, normalizedValue]);
};

const toQueryRecordFromRouterState = (
  router: NextRouter,
  queryParams?: Record<string, string | number | boolean | undefined>,
) => {
  const baseQuery = toCollectionQueryRecord((queryParams || {}) as Record<string, string | number | boolean>);
  const routerQuery = toCollectionQueryRecord(
    (router.query || {}) as Record<string, string | string[] | undefined>,
  );
  const asPathQuery = parseAsPathQuery(router.asPath || '');
  const liveQuery = {
    ...routerQuery,
    ...asPathQuery,
  };

  const hasManagedKeysInLiveQuery = Object.keys(liveQuery).some((key) => isManagedCollectionQueryKey(key));
  if (hasManagedKeysInLiveQuery) {
    return liveQuery;
  }

  // Once router is ready, the URL (router.query/asPath) is the source of truth.
  // Do not keep inheriting managed keys (like page) from stale SSR props across client navigations.
  if (router.isReady) {
    return liveQuery;
  }

  return {
    ...baseQuery,
    ...liveQuery,
  };
};

const hasStateChanged = (
  previous: CollectionFilterState,
  next: CollectionFilterState,
  routeScope?: RouteScope,
) => buildCollectionRequestKey(previous, routeScope) !== buildCollectionRequestKey(next, routeScope);

const changedFilterKeys = (previous: CollectionFilterState, next: CollectionFilterState) => {
  const keys: Array<keyof CollectionFilterState> = [
    'search',
    'category',
    'brand',
    'tag',
    'location',
    'minPrice',
    'maxPrice',
    'minRating',
    'maxRating',
    'stockStatus',
    'inStock',
    'onSale',
    'attributes',
    'page',
    'perPage',
    'orderby',
    'order',
  ];

  return keys.filter((key) => {
    const prevValue = JSON.stringify(previous[key]);
    const nextValue = JSON.stringify(next[key]);
    return prevValue !== nextValue;
  });
};

const normalizeForcedAttributes = (value: unknown) => {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  const output: Record<string, string[]> = {};
  Object.entries(source).forEach(([taxonomy, rawValues]) => {
    if (!Array.isArray(rawValues)) return;
    const normalizedTaxonomy = String(taxonomy || '').trim().toLowerCase();
    if (!normalizedTaxonomy) return;
    const values = normalizeArray(rawValues.map((entry) => String(entry || '').trim()).filter(Boolean));
    if (!values.length) return;
    output[normalizedTaxonomy] = values;
  });
  return output;
};

const applyForcedState = (
  state: CollectionFilterState,
  forcedState?: Partial<CollectionFilterState>,
): CollectionFilterState => {
  if (!forcedState) return state;

  const next: CollectionFilterState = { ...state };

  if (forcedState.search !== undefined) {
    const value = String(forcedState.search || '').trim();
    next.search = value || undefined;
  }
  if (forcedState.category !== undefined) {
    const value = String(forcedState.category || '').trim();
    next.category = value || undefined;
  }
  if (Array.isArray(forcedState.brand)) {
    next.brand = normalizeArray(forcedState.brand.map((entry) => String(entry || '').trim()).filter(Boolean));
  }
  if (Array.isArray(forcedState.tag)) {
    next.tag = normalizeArray(forcedState.tag.map((entry) => String(entry || '').trim()).filter(Boolean));
  }
  if (Array.isArray(forcedState.location)) {
    next.location = normalizeArray(forcedState.location.map((entry) => String(entry || '').trim()).filter(Boolean));
  }
  if (forcedState.minPrice !== undefined) next.minPrice = forcedState.minPrice;
  if (forcedState.maxPrice !== undefined) next.maxPrice = forcedState.maxPrice;
  if (forcedState.minRating !== undefined) next.minRating = forcedState.minRating;
  if (forcedState.maxRating !== undefined) next.maxRating = forcedState.maxRating;
  if (Array.isArray(forcedState.stockStatus)) {
    next.stockStatus = normalizeArray(forcedState.stockStatus.map((entry) => String(entry || '').trim())) as StockStatus[];
  }
  if (forcedState.inStock !== undefined) next.inStock = forcedState.inStock;
  if (forcedState.onSale !== undefined) next.onSale = forcedState.onSale;

  const forcedAttributes = normalizeForcedAttributes(forcedState.attributes);
  if (forcedAttributes) next.attributes = forcedAttributes;

  if (forcedState.page !== undefined) next.page = forcedState.page;
  if (forcedState.perPage !== undefined) next.perPage = forcedState.perPage;
  if (forcedState.orderby !== undefined) next.orderby = forcedState.orderby;
  if (forcedState.order !== undefined) next.order = forcedState.order;

  return next;
};

const canonicalTaxonomyKey = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-');

const normalizeSlugToken = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-');

const getTaxonomyTermsFromProduct = (product: unknown, field: string): Array<{ name: string; slug?: string }> => {
  if (!product || typeof product !== 'object') return [];
  const value = (product as Record<string, unknown>)[field];
  const source = Array.isArray(value) ? value : [];
  return source
    .map((entry) => {
      if (!entry) return null;
      if (typeof entry === 'string') {
        const name = entry.trim();
        if (!name) return null;
        return { name };
      }
      if (typeof entry !== 'object') return null;
      const node = entry as Record<string, unknown>;
      const name = String(node.name ?? '').trim();
      if (!name) return null;
      const slug = String(node.slug ?? '').trim() || undefined;
      return { name, slug };
    })
    .filter(Boolean) as Array<{ name: string; slug?: string }>;
};

const buildTaxonomyFallbackFacets = (products: unknown[]): ApiFacetGroup[] => {
  const buckets: Record<'category' | 'brand' | 'location' | 'tag', Map<string, { name: string; value: string; count: number }>> = {
    category: new Map(),
    brand: new Map(),
    location: new Map(),
    tag: new Map(),
  };

  const addTerms = (
    field: 'categories' | 'brands' | 'locations' | 'tags',
    bucket: Map<string, { name: string; value: string; count: number }>,
  ) => {
    products.forEach((product) => {
      const terms = getTaxonomyTermsFromProduct(product, field);
      const seenInProduct = new Set<string>();
      terms.forEach((term) => {
        const name = String(term.name || '').trim();
        const slug = normalizeSlugToken(term.slug || name);
        const value = String(term.slug || term.name || '').trim();
        if (!name || !slug || !value) return;
        if (seenInProduct.has(slug)) return;
        seenInProduct.add(slug);
        const existing = bucket.get(slug);
        if (existing) {
          existing.count += 1;
          return;
        }
        bucket.set(slug, { name, value, count: 1 });
      });
    });
  };

  addTerms('categories', buckets.category);
  addTerms('brands', buckets.brand);
  addTerms('locations', buckets.location);
  addTerms('tags', buckets.tag);

  const toFacet = (taxonomy: 'category' | 'brand' | 'location' | 'tag', label: string) => {
    const source = buckets[taxonomy];
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
    toFacet('category', 'Categories'),
    toFacet('brand', 'Brands'),
    toFacet('location', 'Locations'),
    toFacet('tag', 'Tags'),
  ].filter(Boolean) as ApiFacetGroup[];
};

const mergeMissingTaxonomyFacets = (primary: ApiFacetGroup[], fallback: ApiFacetGroup[]) => {
  if (!fallback.length) return primary;

  const aliases: Record<string, Set<string>> = {
    category: new Set(['category', 'categories', 'product-category']),
    brand: new Set(['brand', 'brands', 'product-brand']),
    location: new Set(['location', 'locations', 'product-location']),
    tag: new Set(['tag', 'tags', 'product-tag']),
  };

  const hasTaxonomy = (groups: ApiFacetGroup[], taxonomy: string) => {
    const allowed = aliases[taxonomy] || new Set([taxonomy]);
    return groups.some((group) => {
      const key = canonicalTaxonomyKey(group.taxonomy ?? group.name ?? group.label);
      return allowed.has(key);
    });
  };

  const merged = [...primary];
  fallback.forEach((group) => {
    const key = canonicalTaxonomyKey(group.taxonomy ?? group.name ?? group.label);
    if (!key) return;
    if (hasTaxonomy(merged, key)) return;
    merged.push(group);
  });
  return merged;
};

const ROUTE_SCOPE_TAXONOMY_KEYS: Record<string, string[]> = {
  category: ['categories', 'category', 'product-category'],
  brand: ['brands', 'brand', 'product-brand'],
  tag: ['tags', 'tag', 'product-tag'],
  location: ['locations', 'location', 'product-location'],
};

const resolveScopedCountFromFacets = (
  groups: ApiFacetGroup[],
  routeScope: RouteScope | undefined,
  state: CollectionFilterState,
): number | undefined => {
  if (!Array.isArray(groups) || groups.length === 0) return undefined;

  const tryResolve = (taxonomyKeys: string[], values: string[]) => {
    const taxonomySet = new Set(taxonomyKeys.map((entry) => canonicalTaxonomyKey(entry)));
    const valueSet = new Set(values.map((entry) => String(entry || '').trim().toLowerCase()).filter(Boolean));
    if (!taxonomySet.size || !valueSet.size) return undefined;

    for (const group of groups) {
      const taxonomy = canonicalTaxonomyKey(group.taxonomy ?? group.name ?? group.label);
      if (!taxonomySet.has(taxonomy)) continue;

      const terms = Array.isArray(group.terms) ? group.terms : [];
      for (const term of terms) {
        const termCandidates = [
          String(term.value ?? '').trim().toLowerCase(),
          String(term.id ?? '').trim().toLowerCase(),
          String(term.slug ?? '').trim().toLowerCase(),
          String(term.name ?? '').trim().toLowerCase(),
        ].filter(Boolean);
        if (!termCandidates.some((candidate) => valueSet.has(candidate))) continue;

        const count = Number(term.count);
        if (!Number.isFinite(count)) continue;
        return count;
      }
    }

    return undefined;
  };

  const routeTaxonomy = canonicalTaxonomyKey(routeScope?.taxonomy);
  const routeValue = String(routeScope?.value ?? '').trim();
  if (routeTaxonomy && routeValue) {
    const routeCount = tryResolve(
      ROUTE_SCOPE_TAXONOMY_KEYS[routeTaxonomy] || [routeTaxonomy],
      [routeValue],
    );
    if (Number.isFinite(routeCount)) return Number(routeCount);
  }

  if (state.brand.length === 1) {
    const brandCount = tryResolve(ROUTE_SCOPE_TAXONOMY_KEYS.brand, state.brand);
    if (Number.isFinite(brandCount)) return Number(brandCount);
  }

  if (state.tag.length === 1) {
    const tagCount = tryResolve(ROUTE_SCOPE_TAXONOMY_KEYS.tag, state.tag);
    if (Number.isFinite(tagCount)) return Number(tagCount);
  }

  if (state.location.length === 1) {
    const locationCount = tryResolve(ROUTE_SCOPE_TAXONOMY_KEYS.location, state.location);
    if (Number.isFinite(locationCount)) return Number(locationCount);
  }

  if (state.category) {
    const categoryCount = tryResolve(ROUTE_SCOPE_TAXONOMY_KEYS.category, [state.category]);
    if (Number.isFinite(categoryCount)) return Number(categoryCount);
  }

  return undefined;
};

export const useCollectionController = <TProduct>({
  enabled = true,
  router,
  initialProducts,
  initialFacets,
  initialTotalCount,
  initialHasNextPage,
  queryParams,
  routeScope,
  defaultPerPage,
  searchFallback,
  forcedState,
  omitManagedQueryKeys,
}: CollectionControllerArgs<TProduct>) => {
  const resolvedPerPage = Number(defaultPerPage) > 0 ? Number(defaultPerPage) : 24;
  const isEnabled = enabled !== false;
  const includeMobileVariations = useMemo(() => {
    const parseTruthy = (value: unknown) => {
      const normalized = String(value ?? '').trim().toLowerCase();
      return ['1', 'true', 'yes', 'on'].includes(normalized);
    };

    const direct = queryParams?.includeMobileVariations;
    if (typeof direct === 'boolean') return direct;
    if (direct !== undefined) return parseTruthy(direct);
    return false;
  }, [queryParams?.includeMobileVariations]);

  const makeStateFromRoute = useCallback(() => {
    const sourceQuery = toQueryRecordFromRouterState(router, queryParams);
    const parsed = parseCollectionFilterState(sourceQuery, {
      defaultPerPage: resolvedPerPage,
      routeScope,
      searchFallback,
    });
    return applyForcedState(parsed, forcedState);
  }, [forcedState, queryParams, resolvedPerPage, routeScope, router, searchFallback]);

  const [state, setState] = useState<CollectionFilterState>(() => makeStateFromRoute());
  const [searchInput, setSearchInput] = useState<string>(() => state.search || '');
  const [products, setProducts] = useState<TProduct[]>(initialProducts);
  const [totalCount, setTotalCount] = useState<number>(
    Number.isFinite(Number(initialTotalCount)) ? Number(initialTotalCount) : initialProducts.length,
  );
  const [hasNextPage, setHasNextPage] = useState<boolean>(Boolean(initialHasNextPage));
  const [facets, setFacets] = useState<ApiFacetGroup[]>(Array.isArray(initialFacets) ? initialFacets : []);
  const [productsPanel, setProductsPanel] = useState<PanelState>({
    isLoading: false,
    error: null,
  });
  const [facetsPanel, setFacetsPanel] = useState<PanelState>({
    isLoading: false,
    error: null,
  });
  const inflightAbortRef = useRef<AbortController | null>(null);
  const activeRequestIdRef = useRef(0);
  const previousStateRef = useRef<CollectionFilterState>(state);
  // Skip the products re-fetch on first mount when SSR already provided products.
  const skipInitialProductFetchRef = useRef(initialProducts.length > 0);
  const skipInitialFacetsFetchRef = useRef(Array.isArray(initialFacets) && initialFacets.length > 0);
  // Stable ref so effects can call router methods without listing the whole object as a dep.
  const routerRef = useRef(router);
  const pendingManagedUrlRef = useRef<string | null>(null);
  useEffect(() => {
    routerRef.current = router;
  });

  useEffect(() => {
    previousStateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!isEnabled) return;
    const syncFromRoute = (completedUrl?: string) => {
      const completed = String(completedUrl || routerRef.current.asPath || '').trim();
      const pendingManagedUrl = pendingManagedUrlRef.current;
      if (pendingManagedUrl && completed && completed !== pendingManagedUrl) {
        // Ignore stale route completions from older shallow updates.
        return;
      }
      if (pendingManagedUrl && completed === pendingManagedUrl) {
        pendingManagedUrlRef.current = null;
      }

      const next = makeStateFromRoute();

      setState((previous) => {
        if (!hasStateChanged(previous, next, routeScope)) return previous;
        return next;
      });
      setSearchInput(next.search || '');
    };

    router.events?.on('routeChangeComplete', syncFromRoute);
    router.events?.on('hashChangeComplete', syncFromRoute);

    return () => {
      router.events?.off('routeChangeComplete', syncFromRoute);
      router.events?.off('hashChangeComplete', syncFromRoute);
    };
  }, [isEnabled, makeStateFromRoute, routeScope, router.events]);

  const applyPatch = useCallback(
    (
      patch: Partial<CollectionFilterState>,
      reason: 'filter' | 'clear' | 'sort' | 'pagination' = 'filter',
    ) => {
      setState((previous) => {
        const nextPatched = applyCollectionStatePatch(previous, patch, {
          resetPageOnFilterChange: reason !== 'pagination',
        });
        const next = applyForcedState(nextPatched, forcedState);

        if (!hasStateChanged(previous, next, routeScope)) return previous;

        const keys = changedFilterKeys(previous, next).map(String);
        const payload = {
          changedKeys: keys,
          page: next.page,
          perPage: next.perPage,
          routeTaxonomy: routeScope?.taxonomy || null,
          routeValue: routeScope?.value || null,
        };

        if (reason === 'clear') {
          trackFilterCleared(payload);
        } else if (reason === 'sort') {
          trackSortChanged({
            ...payload,
            orderby: next.orderby || null,
            order: next.order || null,
          });
        } else if (reason === 'pagination') {
          trackPaginationChanged(payload);
        } else {
          trackFilterApplied(payload);
        }

        return next;
      });
    },
    [forcedState, routeScope],
  );

  useEffect(() => {
    if (!isEnabled) return;
    const normalized = searchInput.trim();
    const nextSearch = normalized || undefined;
    if ((state.search || undefined) === nextSearch) return;

    const timer = window.setTimeout(() => {
      applyPatch({ search: nextSearch }, 'filter');
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [applyPatch, isEnabled, searchInput, state.search]);

  const stateRequestKey = useMemo(
    () => buildCollectionRequestKey(state, routeScope),
    [routeScope, state],
  );

  useEffect(() => {
    if (!isEnabled) return;
    const r = routerRef.current;
    if (!r.isReady) return;

    const currentPath = (r.asPath || '').split('?')[0] || r.pathname;
    const currentQuery = parseAsPathQuery(r.asPath || '');
    const nextUrl = buildCollectionUrlFromState(currentPath, state, currentQuery, {
      defaultPerPage: resolvedPerPage,
      routeScope,
      includePagination: true,
      omitKeys: omitManagedQueryKeys,
    });

    if (nextUrl === r.asPath) return;
    pendingManagedUrlRef.current = nextUrl;
    void r.replace(nextUrl, undefined, { shallow: true, scroll: false }).catch(() => {
      if (pendingManagedUrlRef.current === nextUrl) {
        pendingManagedUrlRef.current = null;
      }
    });
  // router.isReady is the only router primitive we need to react to;
  // stateRequestKey captures all state + routeScope changes via buildCollectionRequestKey.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, omitManagedQueryKeys, resolvedPerPage, router.isReady, stateRequestKey]);

  useEffect(() => {
    if (!isEnabled) return;
    if (!router.isReady) return;

    const controller = new AbortController();

    const run = async () => {
      activeRequestIdRef.current += 1;
      const requestId = activeRequestIdRef.current;

      inflightAbortRef.current?.abort();
      inflightAbortRef.current = controller;

      const skipProducts = skipInitialProductFetchRef.current;
      skipInitialProductFetchRef.current = false;
      const skipFacets = skipInitialFacetsFetchRef.current;
      skipInitialFacetsFetchRef.current = false;

      if (!skipProducts) {
        setProductsPanel({ isLoading: true, error: null });
      }
      if (!skipFacets) {
        setFacetsPanel((previous) => ({
          // Keep the panel visually stable when we already have facet data.
          // Only show a loading state on the very first load.
          isLoading: previous.isLoading || facets.length === 0,
          error: null,
        }));
      } else {
        setFacetsPanel({ isLoading: false, error: null });
      }

      const productsPromise = skipProducts
        ? Promise.resolve(null)
        : fetchCollectionProducts<TProduct>(
          state,
          routeScope,
          includeMobileVariations,
          controller.signal,
        );
      const facetsPromise = skipFacets
        ? Promise.resolve<ApiFacetGroup[] | null>(null)
        : fetchCollectionFacets(
          state,
          routeScope,
          includeMobileVariations,
          controller.signal,
        );

      const results = await Promise.allSettled([productsPromise, facetsPromise]);
      if (controller.signal.aborted) return;
      if (requestId !== activeRequestIdRef.current) return;

      const [productsResult, facetsResult] = results;

      if (!skipProducts) {
        if (productsResult.status === 'fulfilled' && productsResult.value !== null) {
          const resolvedFacets =
            facetsResult.status === 'fulfilled' && Array.isArray(facetsResult.value)
              ? facetsResult.value
              : facets;
          setProducts(productsResult.value.products);
          const productsLength = productsResult.value.products.length;
          const totalFromPayload = Number(productsResult.value.totalCount);
          const totalFromScopedFacets = resolveScopedCountFromFacets(resolvedFacets, routeScope, state);

          let resolvedTotalCount: number | undefined;
          if (Number.isFinite(totalFromPayload)) {
            resolvedTotalCount = totalFromPayload;
          } else if (Number.isFinite(totalFromScopedFacets)) {
            resolvedTotalCount = Number(totalFromScopedFacets);
          }

          if (Number.isFinite(resolvedTotalCount)) {
            setTotalCount(Number(resolvedTotalCount));
          } else {
            // Keep the UI responsive with a temporary count, then replace with exact count.
            setTotalCount(productsLength);
            const discoveredTotal = await fetchCollectionTotalCount(
              state,
              routeScope,
              includeMobileVariations,
            ).catch(() => undefined);
            if (controller.signal.aborted) return;
            if (requestId !== activeRequestIdRef.current) return;
            if (Number.isFinite(Number(discoveredTotal))) {
              setTotalCount(Number(discoveredTotal));
            }
          }

          setHasNextPage(Boolean(productsResult.value.hasNextPage));
          setProductsPanel({ isLoading: false, error: null });
        } else if (productsResult.status === 'rejected') {
          const message = String(productsResult.reason?.message || 'Failed to load products');
          setProductsPanel({ isLoading: false, error: message });
        }
      }

      const resolvedProductsForFallback = (
        productsResult.status === 'fulfilled' && productsResult.value !== null
          ? productsResult.value.products
          : products
      ) as unknown[];
      const fallbackFacets = buildTaxonomyFallbackFacets(resolvedProductsForFallback);

      if (!skipFacets) {
        if (facetsResult.status === 'fulfilled' && Array.isArray(facetsResult.value)) {
          setFacets(mergeMissingTaxonomyFacets(facetsResult.value, fallbackFacets));
          setFacetsPanel({ isLoading: false, error: null });
        } else if (facetsResult.status === 'rejected') {
          if (fallbackFacets.length > 0) {
            setFacets(fallbackFacets);
            setFacetsPanel({ isLoading: false, error: null });
          } else {
            const message = String(facetsResult.reason?.message || 'Failed to load filters');
            setFacetsPanel({ isLoading: false, error: message });
          }
        }
      }
    };

    void run();

    return () => controller.abort();
  // stateRequestKey = buildCollectionRequestKey(state, routeScope) — it deep-serialises both,
  // so listing routeScope/state separately would only add unstable object references as deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeMobileVariations, isEnabled, router.isReady, stateRequestKey]);

  const announcement = useMemo(
    () => `${totalCount.toLocaleString()} products found`,
    [totalCount],
  );

  useEffect(() => {
    if (!isEnabled) return;
    if (totalCount === 0 && !productsPanel.isLoading && !productsPanel.error) {
      trackNoResults({
        routeTaxonomy: routeScope?.taxonomy || null,
        routeValue: routeScope?.value || null,
        query: state,
      });
    }
  }, [isEnabled, productsPanel.error, productsPanel.isLoading, routeScope, state, totalCount]);

  const clearAll = useCallback(() => {
    const defaultState = createDefaultCollectionFilterState(resolvedPerPage);
    const scopedState = parseCollectionFilterState({}, {
      defaultPerPage: resolvedPerPage,
      routeScope,
      searchFallback,
    });
    const next = {
      ...defaultState,
      ...scopedState,
      page: 1,
    };
    const forcedNext = applyForcedState(next, forcedState);
    setSearchInput(forcedNext.search || '');

    const r = routerRef.current;
    if (r.isReady) {
      const currentPath = (r.asPath || '').split('?')[0] || r.pathname;
      const currentQuery = parseAsPathQuery(r.asPath || '');
      const clearUrl = buildCollectionUrlFromState(currentPath, forcedNext, currentQuery, {
        defaultPerPage: resolvedPerPage,
        routeScope,
        includePagination: true,
        omitKeys: omitManagedQueryKeys,
      });
      pendingManagedUrlRef.current = clearUrl;
      void r.replace(clearUrl, undefined, { shallow: true, scroll: false }).catch(() => {
        if (pendingManagedUrlRef.current === clearUrl) {
          pendingManagedUrlRef.current = null;
        }
      });
    }

    applyPatch(forcedNext, 'clear');
  }, [applyPatch, forcedState, omitManagedQueryKeys, resolvedPerPage, routeScope, searchFallback]);

  const setSort = useCallback(
    (orderby?: SortOrderBy, order?: SortOrder) => {
      applyPatch({ orderby, order }, 'sort');
    },
    [applyPatch],
  );

  const setPage = useCallback(
    (page: number) => {
      if (!Number.isFinite(page) || page < 1) return;
      applyPatch({ page: Math.floor(page) }, 'pagination');
    },
    [applyPatch],
  );

  const setPerPage = useCallback(
    (perPage: number) => {
      if (!Number.isFinite(perPage) || perPage < 1) return;
      applyPatch({ perPage: Math.floor(perPage), page: 1 }, 'pagination');
    },
    [applyPatch],
  );

  const toggleCategory = useCallback(
    (value: string | undefined) => {
      const normalized = String(value || '').trim();
      if (!normalized) {
        applyPatch({ category: undefined }, 'filter');
        return;
      }
      applyPatch(
        {
          category:
            String(state.category || '').toLowerCase() === normalized.toLowerCase()
              ? undefined
              : normalized,
        },
        'filter',
      );
    },
    [applyPatch, state.category],
  );

  const toggleBrand = useCallback(
    (value: string) => {
      applyPatch({ brand: toggleValueInArray(state.brand, value) }, 'filter');
    },
    [applyPatch, state.brand],
  );

  const toggleTag = useCallback(
    (value: string) => {
      applyPatch({ tag: toggleValueInArray(state.tag, value) }, 'filter');
    },
    [applyPatch, state.tag],
  );

  const toggleLocation = useCallback(
    (value: string) => {
      applyPatch({ location: toggleValueInArray(state.location, value) }, 'filter');
    },
    [applyPatch, state.location],
  );

  const toggleStockStatus = useCallback(
    (value: StockStatus) => {
      const next = toggleValueInArray(state.stockStatus, value) as StockStatus[];
      applyPatch({ stockStatus: next }, 'filter');
    },
    [applyPatch, state.stockStatus],
  );

  const setBoolean = useCallback(
    (key: 'inStock' | 'onSale', value: boolean | undefined) => {
      applyPatch({ [key]: value } as Partial<CollectionFilterState>, 'filter');
    },
    [applyPatch],
  );

  const setNumberValue = useCallback(
    (key: 'minPrice' | 'maxPrice' | 'minRating' | 'maxRating', value: number | undefined) => {
      applyPatch({ [key]: value } as Partial<CollectionFilterState>, 'filter');
    },
    [applyPatch],
  );

  const toggleAttribute = useCallback(
    (taxonomyKey: string, termValue: string) => {
      const normalizedTaxonomy = String(taxonomyKey || '').trim().toLowerCase();
      const normalizedTerm = String(termValue || '').trim();
      if (!normalizedTaxonomy || !normalizedTerm) return;

      const currentValues = state.attributes[normalizedTaxonomy] || [];
      const nextValues = toggleValueInArray(currentValues, normalizedTerm);

      const nextAttributes = { ...state.attributes };
      if (nextValues.length === 0) {
        delete nextAttributes[normalizedTaxonomy];
      } else {
        nextAttributes[normalizedTaxonomy] = nextValues;
      }

      applyPatch({ attributes: nextAttributes }, 'filter');
    },
    [applyPatch, state.attributes],
  );

  return {
    state,
    searchInput,
    setSearchInput,
    products,
    totalCount,
    hasNextPage,
    facets,
    productsPanel,
    facetsPanel,
    announcement,
    actions: {
      applyPatch,
      clearAll,
      setSort,
      setPage,
      setPerPage,
      toggleCategory,
      toggleBrand,
      toggleTag,
      toggleLocation,
      toggleStockStatus,
      setBoolean,
      setNumberValue,
      toggleAttribute,
    },
  };
};
