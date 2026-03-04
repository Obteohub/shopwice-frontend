export type SortOrderBy = 'date' | 'price' | 'popularity' | 'rating';
export type SortOrder = 'ASC' | 'DESC';
export type StockStatus = 'instock' | 'outofstock' | 'onbackorder';

export type RouteTaxonomyType = 'category' | 'brand' | 'tag' | 'location';

export type RouteScope = {
  taxonomy?: RouteTaxonomyType;
  value?: string | number;
};

export type AttributeFilterMap = Record<string, string[]>;

export type CollectionFilterState = {
  search?: string;
  category?: string;
  brand: string[];
  tag: string[];
  location: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  maxRating?: number;
  stockStatus: StockStatus[];
  inStock?: boolean;
  onSale?: boolean;
  attributes: AttributeFilterMap;
  page: number;
  perPage: number;
  orderby?: SortOrderBy;
  order?: SortOrder;
};

export type CollectionQueryRecord = Record<string, string | string[] | undefined>;

export type ApiFacetTerm = {
  id?: number | string;
  name?: string;
  label?: string;
  value?: string;
  slug?: string;
  count?: number;
};

export type ApiFacetGroup = {
  taxonomy?: string;
  name?: string;
  label?: string;
  options?: unknown[];
  terms?: ApiFacetTerm[];
};

export type CollectionDataResponse = {
  categories?: { terms?: ApiFacetTerm[] } | ApiFacetTerm[];
  brands?: { terms?: ApiFacetTerm[] } | ApiFacetTerm[];
  locations?: { terms?: ApiFacetTerm[] } | ApiFacetTerm[];
  tags?: { terms?: ApiFacetTerm[] } | ApiFacetTerm[];
  attributes?: ApiFacetGroup[];
  attributeGroups?: ApiFacetGroup[];
  facets?: { attributes?: ApiFacetGroup[] };
  [key: string]: unknown;
};

export type ProductListEnvelope<TProduct> = {
  products: TProduct[];
  totalCount?: number;
  hasNextPage?: boolean;
};

export const DEFAULT_COLLECTION_PER_PAGE = 24;
