import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';
import type {
  ApiFacetGroup,
  ApiFacetTerm,
  CollectionDataResponse,
  CollectionFilterState,
  ProductListEnvelope,
  RouteScope,
} from './types';
import { buildApiParamsFromFilterState } from './queryState';

type RequestParams = Record<string, string | number | boolean>;

const inflightCollectionRequests = new Map<string, Promise<unknown>>();
const inflightCollectionCountRequests = new Map<string, Promise<number>>();
const collectionCountCache = new Map<string, { value: number; expiresAt: number }>();

const COLLECTION_COUNT_CACHE_TTL_MS = Math.max(
  5_000,
  Number(process.env.NEXT_PUBLIC_COLLECTION_COUNT_CACHE_TTL_MS ?? process.env.COLLECTION_COUNT_CACHE_TTL_MS ?? 60_000),
);
const COLLECTION_COUNT_PROBE_MAX_PAGE = Math.max(
  1_024,
  Number(process.env.NEXT_PUBLIC_COLLECTION_COUNT_PROBE_MAX_PAGE ?? process.env.COLLECTION_COUNT_PROBE_MAX_PAGE ?? 262_144),
);

const collectionDebugRaw = String(
  process.env.NEXT_PUBLIC_COLLECTION_DEBUG_QUERY ?? process.env.COLLECTION_DEBUG_QUERY ?? '',
)
  .trim()
  .toLowerCase();
const COLLECTION_DEBUG_ENABLED = ['1', 'true', 'yes', 'on'].includes(collectionDebugRaw);

const createAbortError = () => {
  const error = new Error('The operation was aborted.');
  error.name = 'AbortError';
  return error;
};

const withAbortSignal = <T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> => {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(createAbortError());

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(createAbortError());
    signal.addEventListener('abort', onAbort, { once: true });

    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
};

const serializeParams = (params: RequestParams) => {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .sort(([left], [right]) => left.localeCompare(right));

  const searchParams = new URLSearchParams();
  entries.forEach(([key, value]) => {
    searchParams.append(key, String(value));
  });

  return searchParams.toString();
};

const buildRequestKey = (endpoint: string, params: RequestParams) => {
  const query = serializeParams(params);
  return query ? `${endpoint}?${query}` : endpoint;
};

const withInFlightDedupe = <T>(key: string, producer: () => Promise<T>): Promise<T> => {
  const existing = inflightCollectionRequests.get(key);
  if (existing) return existing as Promise<T>;

  const nextPromise = producer().finally(() => {
    if (inflightCollectionRequests.get(key) === nextPromise) {
      inflightCollectionRequests.delete(key);
    }
  });

  inflightCollectionRequests.set(key, nextPromise as Promise<unknown>);
  return nextPromise;
};

const withCountInFlightDedupe = (key: string, producer: () => Promise<number>): Promise<number> => {
  const existing = inflightCollectionCountRequests.get(key);
  if (existing) return existing;

  const nextPromise = producer().finally(() => {
    if (inflightCollectionCountRequests.get(key) === nextPromise) {
      inflightCollectionCountRequests.delete(key);
    }
  });

  inflightCollectionCountRequests.set(key, nextPromise);
  return nextPromise;
};

const logProductsQueryDebug = (params: RequestParams) => {
  if (!COLLECTION_DEBUG_ENABLED) return;
  const query = serializeParams(params);
  const requestUrl = query ? `${ENDPOINTS.PRODUCTS}?${query}` : ENDPOINTS.PRODUCTS;
  console.info('[Collection Debug] products query', {
    requestUrl,
    params,
  });
};

const readCachedCollectionCount = (key: string): number | undefined => {
  const entry = collectionCountCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    collectionCountCache.delete(key);
    return undefined;
  }
  return entry.value;
};

const writeCachedCollectionCount = (key: string, value: number) => {
  if (!Number.isFinite(value) || value < 0) return;
  collectionCountCache.set(key, {
    value: Math.floor(value),
    expiresAt: Date.now() + COLLECTION_COUNT_CACHE_TTL_MS,
  });
};

const normalizeFacetTerm = (term: unknown): ApiFacetTerm | null => {
  if (term === null || term === undefined) return null;
  if (typeof term === 'string' || typeof term === 'number') {
    const value = String(term).trim();
    if (!value) return null;
    return { name: value, value, slug: value.toLowerCase() };
  }
  if (typeof term !== 'object') return null;

  const node = term as Record<string, unknown>;
  const name = String(node.name ?? node.label ?? node.value ?? node.slug ?? '').trim();
  if (!name) return null;
  const id =
    node.id !== undefined && node.id !== null && String(node.id).trim() !== ''
      ? String(node.id).trim()
      : node.term_id !== undefined && node.term_id !== null && String(node.term_id).trim() !== ''
        ? String(node.term_id).trim()
        : undefined;
  const value = String(node.value ?? id ?? node.slug ?? name).trim();
  const slug = String(node.slug ?? name).trim().toLowerCase();
  const count = Number(node.count ?? node.total ?? node.doc_count ?? NaN);

  return {
    id,
    name,
    value,
    slug,
    count: Number.isFinite(count) ? count : undefined,
  };
};

const normalizeFacetTerms = (value: unknown): ApiFacetTerm[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeFacetTerm(entry))
      .filter(Boolean) as ApiFacetTerm[];
  }

  if (!value || typeof value !== 'object') return [];

  const source = value as Record<string, unknown>;
  if (Array.isArray(source.terms)) return normalizeFacetTerms(source.terms);
  if (Array.isArray(source.items)) return normalizeFacetTerms(source.items);
  if (Array.isArray(source.values)) return normalizeFacetTerms(source.values);

  return Object.entries(source)
    .map(([name, count], index) => {
      const parsed = Number(count);
      return {
        id: String(index),
        name,
        value: name,
        slug: name.toLowerCase(),
        count: Number.isFinite(parsed) ? parsed : undefined,
      } satisfies ApiFacetTerm;
    })
    .filter((entry) => !!entry.name);
};

const normalizeFacetGroups = (value: unknown): ApiFacetGroup[] => {
  if (Array.isArray(value)) {
    return value
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => entry as ApiFacetGroup);
  }

  if (!value || typeof value !== 'object') return [];
  const source = value as Record<string, unknown>;

  if (Array.isArray(source.attributes)) return normalizeFacetGroups(source.attributes);
  if (Array.isArray(source.nodes)) return normalizeFacetGroups(source.nodes);

  if (source.taxonomy || source.name || source.label || source.options || source.terms) {
    return [source as ApiFacetGroup];
  }

  return Object.values(source).flatMap((entry) => normalizeFacetGroups(entry));
};

const mergeFacetGroups = (groups: ApiFacetGroup[]) => {
  const merged = new Map<string, ApiFacetGroup>();

  groups.forEach((group) => {
    const taxonomy = String(group.taxonomy ?? group.name ?? group.label ?? '').trim().toLowerCase();
    if (!taxonomy) return;

    const existing = merged.get(taxonomy);
    const incomingTerms = normalizeFacetTerms(group.terms);
    const incomingOptions = Array.isArray(group.options) ? group.options : [];

    if (!existing) {
      merged.set(taxonomy, {
        taxonomy,
        name: String(group.name ?? group.label ?? taxonomy),
        label: String(group.label ?? group.name ?? taxonomy),
        terms: incomingTerms,
        options: incomingOptions,
      });
      return;
    }

    const termBySlug = new Map<string, ApiFacetTerm>();
    [...normalizeFacetTerms(existing.terms), ...incomingTerms].forEach((term) => {
      const key = String(term.slug ?? term.name ?? '').trim().toLowerCase();
      if (!key || termBySlug.has(key)) return;
      termBySlug.set(key, term);
    });

    const optionSet = new Set<string>();
    [...(Array.isArray(existing.options) ? existing.options : []), ...incomingOptions].forEach((option) => {
      const normalized = String(option ?? '').trim();
      if (!normalized) return;
      optionSet.add(normalized);
    });

    merged.set(taxonomy, {
      ...existing,
      terms: Array.from(termBySlug.values()),
      options: Array.from(optionSet.values()),
    });
  });

  return Array.from(merged.values());
};

const normalizeProductsPayload = <TProduct>(
  payload: unknown,
  perPage: number,
  page: number,
): ProductListEnvelope<TProduct> => {
  const fromArray = Array.isArray(payload) ? payload as TProduct[] : null;
  const source = payload && typeof payload === 'object' ? payload as Record<string, unknown> : null;

  const products =
    fromArray ||
    (Array.isArray(source?.products) ? source!.products as TProduct[] : null) ||
    (Array.isArray(source?.data) ? source!.data as TProduct[] : null) ||
    (Array.isArray(source?.results) ? source!.results as TProduct[] : null) ||
    (Array.isArray(source?.items) ? source!.items as TProduct[] : null) ||
    [];

  const totalCountCandidate = Number(
    source?.totalCount ??
    source?.total ??
    source?.count ??
    source?.total_products ??
    source?.found ??
    NaN,
  );

  const totalCount = Number.isFinite(totalCountCandidate) ? totalCountCandidate : undefined;

  const hasNextFromPayload =
    typeof source?.hasNextPage === 'boolean'
      ? Boolean(source.hasNextPage)
      : typeof source?.has_next_page === 'boolean'
        ? Boolean(source.has_next_page)
        : undefined;

  const hasNextPage =
    hasNextFromPayload ??
    (typeof totalCount === 'number'
      ? page * perPage < totalCount
      : products.length >= perPage);

  return {
    products,
    totalCount,
    hasNextPage,
  };
};

export const normalizeCollectionDataPayload = (payload: unknown): ApiFacetGroup[] => {
  if (!payload || typeof payload !== 'object') return [];

  const source = payload as CollectionDataResponse;
  const groups: ApiFacetGroup[] = [];

  const pushTerms = (taxonomy: string, label: string, value: unknown) => {
    const terms = normalizeFacetTerms(value);
    if (!terms.length) return;
    groups.push({ taxonomy, label, terms });
  };

  pushTerms('categories', 'Categories', source.categories);
  pushTerms('brand', 'Brand', source.brands);
  pushTerms('location', 'Location', source.locations);
  pushTerms('tag', 'Tags', source.tags);

  groups.push(...normalizeFacetGroups(source.attributes));
  groups.push(...normalizeFacetGroups(source.attributeGroups));
  groups.push(...normalizeFacetGroups(source.facets?.attributes));

  return mergeFacetGroups(groups);
};

export const fetchCollectionProducts = async <TProduct>(
  filters: CollectionFilterState,
  routeScope: RouteScope | undefined,
  includeMobileVariations = false,
  signal?: AbortSignal,
): Promise<ProductListEnvelope<TProduct>> => {
  const params = buildApiParamsFromFilterState(filters, {
    includePagination: true,
    routeScope,
  }) as RequestParams;
  // Always send explicit pagination params so backend does not fall back to
  // a larger default page size (which increases payload and latency).
  params.page = Math.max(1, Number(filters.page || 1));
  params.per_page = Math.max(1, Number(filters.perPage || 24));
  params.include_totals = true;
  if (includeMobileVariations) {
    params.includeMobileVariations = true;
  }
  const requestParams = params as RequestParams;
  const requestKey = buildRequestKey(ENDPOINTS.PRODUCTS, requestParams);

  logProductsQueryDebug(requestParams);

  const payloadPromise = withInFlightDedupe<unknown>(requestKey, () =>
    api.get<unknown>(ENDPOINTS.PRODUCTS, {
      params: requestParams,
    }),
  );
  const payload = await withAbortSignal(payloadPromise, signal);

  return normalizeProductsPayload<TProduct>(payload, filters.perPage, filters.page);
};

const resolveCountProbeBaseParams = (
  filters: CollectionFilterState,
  routeScope: RouteScope | undefined,
  includeMobileVariations = false,
): RequestParams => {
  const params = buildApiParamsFromFilterState(filters, {
    includePagination: false,
    routeScope,
  }) as RequestParams;
  delete params.page;
  delete params.per_page;
  delete params.perPage;
  delete params.perpage;
  if (includeMobileVariations) {
    params.includeMobileVariations = true;
  }
  return params;
};

const hasProductsAtProbePage = async (
  endpoint: string,
  baseParams: RequestParams,
  page: number,
): Promise<boolean> => {
  try {
    const payload = await api.get<unknown>(endpoint, {
      params: {
        ...baseParams,
        per_page: 1,
        page,
      },
    });
    const list = normalizeListPayload(payload);
    return list.length > 0;
  } catch (error) {
    const status = Number((error as { status?: number })?.status);
    // Woo-style APIs can report out-of-range pages as 400/404.
    if (status === 400 || status === 404) return false;
    throw error;
  }
};

const normalizeListPayload = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const source = payload as Record<string, unknown>;
  if (Array.isArray(source.products)) return source.products;
  if (Array.isArray(source.data)) return source.data;
  if (Array.isArray(source.results)) return source.results;
  if (Array.isArray(source.items)) return source.items;
  return [];
};

export const fetchCollectionTotalCount = async (
  filters: CollectionFilterState,
  routeScope: RouteScope | undefined,
  includeMobileVariations = false,
): Promise<number> => {
  const baseParams = resolveCountProbeBaseParams(filters, routeScope, includeMobileVariations);
  const countKey = buildRequestKey(ENDPOINTS.PRODUCTS, {
    ...baseParams,
    per_page: 1,
  });

  const cached = readCachedCollectionCount(countKey);
  if (Number.isFinite(cached)) return Number(cached);

  return withCountInFlightDedupe(countKey, async () => {
    const hasFirstPage = await hasProductsAtProbePage(ENDPOINTS.PRODUCTS, baseParams, 1);
    if (!hasFirstPage) {
      writeCachedCollectionCount(countKey, 0);
      return 0;
    }

    let low = 1;
    let high = 2;
    while (high <= COLLECTION_COUNT_PROBE_MAX_PAGE) {
      const exists = await hasProductsAtProbePage(ENDPOINTS.PRODUCTS, baseParams, high);
      if (!exists) break;
      low = high;
      high *= 2;
    }

    high = Math.min(high, COLLECTION_COUNT_PROBE_MAX_PAGE);
    let left = low + 1;
    let right = high;
    let lastPageWithProduct = low;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const exists = await hasProductsAtProbePage(ENDPOINTS.PRODUCTS, baseParams, mid);
      if (exists) {
        lastPageWithProduct = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    writeCachedCollectionCount(countKey, lastPageWithProduct);
    return lastPageWithProduct;
  });
};

export const fetchCollectionFacets = async (
  filters: CollectionFilterState,
  routeScope: RouteScope | undefined,
  includeMobileVariations = false,
  signal?: AbortSignal,
): Promise<ApiFacetGroup[]> => {
  const params = buildApiParamsFromFilterState(filters, {
    includePagination: false,
    routeScope,
  });
  const requestParams = params as RequestParams;
  if (includeMobileVariations) {
    requestParams.includeMobileVariations = true;
  }
  const requestKey = buildRequestKey(ENDPOINTS.COLLECTION_DATA, requestParams);

  const payloadPromise = withInFlightDedupe<unknown>(requestKey, () =>
    api.get<unknown>(ENDPOINTS.COLLECTION_DATA, {
      params: requestParams,
    }),
  );
  const payload = await withAbortSignal(payloadPromise, signal);

  return normalizeCollectionDataPayload(payload);
};

export const fetchCollectionPanels = async <TProduct>(
  filters: CollectionFilterState,
  routeScope: RouteScope | undefined,
  includeMobileVariations = false,
  signal?: AbortSignal,
) => {
  const [products, facets] = await Promise.all([
    fetchCollectionProducts<TProduct>(filters, routeScope, includeMobileVariations, signal),
    fetchCollectionFacets(filters, routeScope, includeMobileVariations, signal),
  ]);

  return { products, facets };
};
