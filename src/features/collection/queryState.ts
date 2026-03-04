import type {
  CollectionFilterState,
  CollectionQueryRecord,
  RouteScope,
  SortOrder,
  SortOrderBy,
  StockStatus,
} from './types';
import { DEFAULT_COLLECTION_PER_PAGE } from './types';

const VALID_SORT_BY = new Set<SortOrderBy>(['date', 'price', 'popularity', 'rating']);
const VALID_SORT_ORDER = new Set<SortOrder>(['ASC', 'DESC']);
const VALID_STOCK_STATUS = new Set<StockStatus>(['instock', 'outofstock', 'onbackorder']);

const FILTER_CONTROL_KEYS = new Set([
  'search',
  'category',
  'categoryId',
  'category_id',
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
  'page',
  'perPage',
  'orderby',
  'order',
]);

const ATTRIBUTE_PREFIXES = ['pa_', 'attr_', 'attribute_'];

const normalizeText = (value: unknown): string => String(value ?? '').trim();

const toLower = (value: unknown): string => normalizeText(value).toLowerCase();

const splitCsv = (value: unknown): string[] => {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  return normalized
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const dedupe = (values: string[]): string[] => {
  const output: string[] = [];
  const seen = new Set<string>();
  values.forEach((value) => {
    const key = value.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    output.push(value);
  });
  return output;
};

const parsePositiveInt = (value: unknown, fallback: number): number => {
  const parsed = Number(normalizeText(value));
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  return fallback;
};

const parseMaybeNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  const normalized = normalizeText(value);
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
};

const parseMaybeBoolean = (value: unknown): boolean | undefined => {
  const normalized = toLower(value);
  if (!normalized) return undefined;
  if (['1', 'true', 'yes'].includes(normalized)) return true;
  if (['0', 'false', 'no'].includes(normalized)) return false;
  return undefined;
};

const canonicalizeAttributeKey = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^pa_/, '')
    .replace(/^attr_/, '')
    .replace(/^attribute_/, '')
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-');

const parseAttributeFilters = (query: CollectionQueryRecord) => {
  const attributes: Record<string, string[]> = {};

  Object.entries(query).forEach(([key, rawValue]) => {
    const lowerKey = key.toLowerCase();
    const hasPrefix = ATTRIBUTE_PREFIXES.some((prefix) => lowerKey.startsWith(prefix));
    if (!hasPrefix) return;

    const cleanedKey = canonicalizeAttributeKey(lowerKey);
    if (!cleanedKey) return;

    const values = Array.isArray(rawValue)
      ? rawValue.flatMap((entry) => splitCsv(entry))
      : splitCsv(rawValue);

    const normalized = dedupe(values.map((entry) => normalizeText(entry)).filter(Boolean));
    if (!normalized.length) return;

    attributes[cleanedKey] = normalized;
  });

  return attributes;
};

const toSingleString = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return normalizeText(value[0]);
  return normalizeText(value);
};

const toCsvValues = (value: string | string[] | undefined): string[] => {
  if (Array.isArray(value)) {
    return dedupe(value.flatMap((entry) => splitCsv(entry)).map((entry) => normalizeText(entry)).filter(Boolean));
  }
  return dedupe(splitCsv(value).map((entry) => normalizeText(entry)).filter(Boolean));
};

const sanitizeSortBy = (value: unknown): SortOrderBy | undefined => {
  const normalized = toLower(value) as SortOrderBy;
  return VALID_SORT_BY.has(normalized) ? normalized : undefined;
};

const sanitizeSortOrder = (value: unknown): SortOrder | undefined => {
  const normalized = normalizeText(value).toUpperCase() as SortOrder;
  return VALID_SORT_ORDER.has(normalized) ? normalized : undefined;
};

const sanitizeStockStatus = (values: string[]): StockStatus[] =>
  dedupe(values.map((value) => toLower(value)))
    .filter((value): value is StockStatus => VALID_STOCK_STATUS.has(value as StockStatus));

const applyRouteScope = (
  state: CollectionFilterState,
  routeScope?: RouteScope,
): CollectionFilterState => {
  if (!routeScope?.taxonomy || routeScope.value === undefined || routeScope.value === null) {
    return state;
  }

  const value = normalizeText(routeScope.value);
  if (!value) return state;

  if (routeScope.taxonomy === 'category') {
    return { ...state, category: state.category || value };
  }

  if (routeScope.taxonomy === 'brand') {
    return { ...state, brand: state.brand.length ? state.brand : [value] };
  }

  if (routeScope.taxonomy === 'tag') {
    return { ...state, tag: state.tag.length ? state.tag : [value] };
  }

  return { ...state, location: state.location.length ? state.location : [value] };
};

export const createDefaultCollectionFilterState = (
  perPage = DEFAULT_COLLECTION_PER_PAGE,
): CollectionFilterState => ({
  search: undefined,
  category: undefined,
  brand: [],
  tag: [],
  location: [],
  minPrice: undefined,
  maxPrice: undefined,
  minRating: undefined,
  maxRating: undefined,
  stockStatus: [],
  inStock: undefined,
  onSale: undefined,
  attributes: {},
  page: 1,
  perPage,
  orderby: undefined,
  order: undefined,
});

export const parseCollectionFilterState = (
  query: CollectionQueryRecord,
  options?: {
    defaultPerPage?: number;
    routeScope?: RouteScope;
    searchFallback?: string;
  },
): CollectionFilterState => {
  const defaultPerPage = options?.defaultPerPage || DEFAULT_COLLECTION_PER_PAGE;
  const state = createDefaultCollectionFilterState(defaultPerPage);

  const search = toSingleString(query.search) || normalizeText(options?.searchFallback);
  if (search) state.search = search;

  const category = toSingleString(query.category ?? query.categoryId ?? query.category_id);
  if (category) state.category = category;

  state.brand = toCsvValues(query.brand);
  state.tag = toCsvValues(query.tag || query.tags);
  state.location = toCsvValues(query.location);

  state.minPrice = parseMaybeNumber(query.minPrice ?? query.min_price);
  state.maxPrice = parseMaybeNumber(query.maxPrice ?? query.max_price);
  state.minRating = parseMaybeNumber(query.minRating ?? query.min_rating);
  state.maxRating = parseMaybeNumber(query.maxRating ?? query.max_rating);

  const stockStatusRaw = toCsvValues(query.stockStatus ?? query.stock_status);
  state.stockStatus = sanitizeStockStatus(stockStatusRaw);

  state.inStock = parseMaybeBoolean(query.inStock ?? query.in_stock);
  state.onSale = parseMaybeBoolean(query.onSale ?? query.on_sale);

  state.page = parsePositiveInt(query.page, 1);
  state.perPage = parsePositiveInt(query.perPage ?? query.per_page, defaultPerPage);
  state.orderby = sanitizeSortBy(query.orderby);
  state.order = sanitizeSortOrder(query.order);

  state.attributes = parseAttributeFilters(query);

  const normalized = applyRouteScope(state, options?.routeScope);

  if (normalized.minPrice !== undefined && normalized.maxPrice !== undefined && normalized.minPrice > normalized.maxPrice) {
    const safeMin = normalized.maxPrice;
    normalized.maxPrice = normalized.minPrice;
    normalized.minPrice = safeMin;
  }

  if (
    normalized.minRating !== undefined &&
    normalized.maxRating !== undefined &&
    normalized.minRating > normalized.maxRating
  ) {
    const safeMin = normalized.maxRating;
    normalized.maxRating = normalized.minRating;
    normalized.minRating = safeMin;
  }

  return normalized;
};

const addQueryValue = (target: Record<string, string>, key: string, value: unknown) => {
  const normalized = normalizeText(value);
  if (!normalized) return;
  target[key] = normalized;
};

export const serializeCollectionFilterState = (
  state: CollectionFilterState,
  options?: {
    defaultPerPage?: number;
    routeScope?: RouteScope;
    includePagination?: boolean;
    omitKeys?: string[];
  },
): Record<string, string> => {
  const defaultPerPage = options?.defaultPerPage || DEFAULT_COLLECTION_PER_PAGE;
  const includePagination = options?.includePagination !== false;
  const omitKeys = new Set((options?.omitKeys || []).map((key) => String(key).toLowerCase()));
  const shouldOmit = (key: string) => omitKeys.has(String(key).toLowerCase());
  const query: Record<string, string> = {};

  if (!shouldOmit('search')) addQueryValue(query, 'search', state.search);

  const routeScope = options?.routeScope;
  const isRouteCategory = routeScope?.taxonomy === 'category';
  const isRouteBrand = routeScope?.taxonomy === 'brand';
  const isRouteTag = routeScope?.taxonomy === 'tag';
  const isRouteLocation = routeScope?.taxonomy === 'location';

  if (!isRouteCategory && !shouldOmit('category')) addQueryValue(query, 'category', state.category);
  if (!isRouteBrand && !shouldOmit('brand') && state.brand.length) query.brand = dedupe(state.brand).join(',');
  if (!isRouteTag && !shouldOmit('tag') && state.tag.length) query.tag = dedupe(state.tag).join(',');
  if (!isRouteLocation && !shouldOmit('location') && state.location.length) query.location = dedupe(state.location).join(',');

  if (!shouldOmit('minPrice') && state.minPrice !== undefined) query.minPrice = String(state.minPrice);
  if (!shouldOmit('maxPrice') && state.maxPrice !== undefined) query.maxPrice = String(state.maxPrice);
  if (!shouldOmit('minRating') && state.minRating !== undefined) query.minRating = String(state.minRating);
  if (!shouldOmit('maxRating') && state.maxRating !== undefined) query.maxRating = String(state.maxRating);

  if (!shouldOmit('stockStatus') && state.stockStatus.length) query.stockStatus = dedupe(state.stockStatus).join(',');
  if (!shouldOmit('inStock') && state.inStock !== undefined) query.inStock = String(state.inStock);
  if (!shouldOmit('onSale') && state.onSale !== undefined) query.onSale = String(state.onSale);

  Object.entries(state.attributes).forEach(([attributeKey, values]) => {
    const key = canonicalizeAttributeKey(attributeKey);
    const normalizedValues = dedupe(values.map((value) => normalizeText(value)).filter(Boolean));
    if (!key || !normalizedValues.length) return;
    const attributeParamKey = `pa_${key}`;
    if (!shouldOmit(attributeParamKey)) {
      query[attributeParamKey] = normalizedValues.join(',');
    }
  });

  if (!shouldOmit('orderby') && state.orderby) query.orderby = state.orderby;
  if (!shouldOmit('order') && state.order) query.order = state.order;

  if (includePagination) {
    if (!shouldOmit('page') && state.page > 1) query.page = String(state.page);
    if (!shouldOmit('perPage') && state.perPage !== defaultPerPage) query.perPage = String(state.perPage);
  }

  return query;
};

export const buildApiParamsFromFilterState = (
  state: CollectionFilterState,
  options?: {
    includePagination?: boolean;
    routeScope?: RouteScope;
  },
): Record<string, string | number | boolean> => {
  const includePagination = options?.includePagination !== false;
  const query = serializeCollectionFilterState(state, {
    includePagination,
    routeScope: options?.routeScope,
  });

  const params: Record<string, string | number | boolean> = {};

  Object.entries(query).forEach(([key, value]) => {
    if (key === 'category') {
      // Middleware contract: category filters are always sent as `category`.
      // Value can be either slug or numeric ID.
      params.category = value;
      return;
    }
    if (key === 'perPage') {
      params.per_page = Number(value);
      return;
    }
    if (key === 'page') {
      params.page = Number(value);
      return;
    }
    if (key === 'minPrice' || key === 'maxPrice' || key === 'minRating' || key === 'maxRating') {
      params[key] = Number(value);
      return;
    }
    if (key === 'inStock' || key === 'onSale') {
      params[key] = value === 'true';
      return;
    }
    params[key] = value;
  });

  if (options?.routeScope?.taxonomy === 'category' && !params.category && options.routeScope.value !== undefined) {
    params.category = String(options.routeScope.value);
  }
  if (options?.routeScope?.taxonomy === 'brand' && !params.brand && options.routeScope.value !== undefined) {
    params.brand = String(options.routeScope.value);
  }
  if (options?.routeScope?.taxonomy === 'tag' && !params.tag && options.routeScope.value !== undefined) {
    params.tag = String(options.routeScope.value);
  }
  if (options?.routeScope?.taxonomy === 'location' && !params.location && options.routeScope.value !== undefined) {
    params.location = String(options.routeScope.value);
  }

  return params;
};

export const isManagedCollectionQueryKey = (key: string) => {
  if (FILTER_CONTROL_KEYS.has(key)) return true;
  const lower = key.toLowerCase();
  return ATTRIBUTE_PREFIXES.some((prefix) => lower.startsWith(prefix));
};

export const getPreservedQueryParams = (query: CollectionQueryRecord) => {
  const preserved: Record<string, string> = {};
  Object.entries(query).forEach(([key, value]) => {
    if (isManagedCollectionQueryKey(key)) return;
    const normalized = toSingleString(value);
    if (!normalized) return;
    preserved[key] = normalized;
  });
  return preserved;
};

const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const keys = Object.keys(source).sort((a, b) => a.localeCompare(b));
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJson(source[key])}`).join(',')}}`;
  }

  return JSON.stringify(value);
};

export const buildCollectionRequestKey = (state: CollectionFilterState, routeScope?: RouteScope) =>
  stableJson({ state, routeScope });

export const hasNonPaginationDiff = (
  previous: CollectionFilterState,
  next: CollectionFilterState,
) => {
  const prevComparable = { ...previous, page: 1 };
  const nextComparable = { ...next, page: 1 };
  return stableJson(prevComparable) !== stableJson(nextComparable);
};

export const applyCollectionStatePatch = (
  previous: CollectionFilterState,
  patch: Partial<CollectionFilterState>,
  options?: { resetPageOnFilterChange?: boolean },
): CollectionFilterState => {
  const resetPageOnFilterChange = options?.resetPageOnFilterChange !== false;

  const merged: CollectionFilterState = {
    ...previous,
    ...patch,
    brand: patch.brand ? dedupe(patch.brand) : previous.brand,
    tag: patch.tag ? dedupe(patch.tag) : previous.tag,
    location: patch.location ? dedupe(patch.location) : previous.location,
    stockStatus: patch.stockStatus ? sanitizeStockStatus(patch.stockStatus) : previous.stockStatus,
    attributes: patch.attributes || previous.attributes,
  };

  if (resetPageOnFilterChange && hasNonPaginationDiff(previous, merged)) {
    merged.page = 1;
  }

  return merged;
};

export const toUrlSearchParams = (query: Record<string, string>) => {
  const params = new URLSearchParams();
  Object.keys(query)
    .sort((a, b) => a.localeCompare(b))
    .forEach((key) => {
      const value = query[key];
      if (!value) return;
      params.set(key, value);
    });
  return params;
};

export const toCollectionQueryRecord = (
  query: Record<string, string | string[] | undefined | number | boolean>,
): CollectionQueryRecord => {
  const output: CollectionQueryRecord = {};
  Object.entries(query || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      output[key] = value.map((entry) => normalizeText(entry)).filter(Boolean);
      return;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      output[key] = String(value);
      return;
    }
    if (value === undefined) return;
    output[key] = normalizeText(value);
  });
  return output;
};

export const parseAsPathQuery = (asPath: string): CollectionQueryRecord => {
  const questionMarkIndex = asPath.indexOf('?');
  if (questionMarkIndex < 0) return {};

  const search = asPath.slice(questionMarkIndex + 1);
  const params = new URLSearchParams(search);
  const output: CollectionQueryRecord = {};

  params.forEach((value, key) => {
    const normalized = toSingleString(value);
    if (!normalized) return;
    output[key] = normalized;
  });

  return output;
};

export const mergeCollectionQueryWithPreservedParams = (
  state: CollectionFilterState,
  currentQuery: CollectionQueryRecord,
  options?: {
    defaultPerPage?: number;
    routeScope?: RouteScope;
    includePagination?: boolean;
    omitKeys?: string[];
  },
): Record<string, string> => {
  const preserved = getPreservedQueryParams(currentQuery);
  const managed = serializeCollectionFilterState(state, {
    defaultPerPage: options?.defaultPerPage,
    routeScope: options?.routeScope,
    includePagination: options?.includePagination,
    omitKeys: options?.omitKeys,
  });

  return {
    ...preserved,
    ...managed,
  };
};

export const buildCollectionUrlFromState = (
  currentPath: string,
  state: CollectionFilterState,
  currentQuery: CollectionQueryRecord,
  options?: {
    defaultPerPage?: number;
    routeScope?: RouteScope;
    includePagination?: boolean;
    omitKeys?: string[];
  },
) => {
  const query = mergeCollectionQueryWithPreservedParams(state, currentQuery, options);
  const search = toUrlSearchParams(query).toString();
  return search ? `${currentPath}?${search}` : currentPath;
};
