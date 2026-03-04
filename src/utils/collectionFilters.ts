type PrimitiveFilter = string | number | boolean;

export type SharedCollectionFilters = Record<string, PrimitiveFilter>;

type BuildSharedCollectionFiltersArgs = {
  queryParams?: Record<string, string | number | boolean>;
  categoryId?: number;
  slug?: string;
  search?: string;
};

const normalizeValue = (value: unknown): PrimitiveFilter | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  return null;
};

export const buildSharedCollectionFilters = ({
  queryParams = {},
  categoryId,
  slug,
  search,
}: BuildSharedCollectionFiltersArgs): SharedCollectionFilters => {
  const filters: SharedCollectionFilters = {};

  const category = normalizeValue(queryParams.category);
  const brand = normalizeValue(queryParams.brand);
  const location = normalizeValue(queryParams.location);
  const tag = normalizeValue(
    queryParams.tag ?? queryParams.tags ?? queryParams.product_tag,
  );
  const searchValue = normalizeValue(queryParams.search ?? search);
  const minPrice = normalizeValue(
    queryParams.minPrice ?? queryParams.min_price,
  );
  const maxPrice = normalizeValue(
    queryParams.maxPrice ?? queryParams.max_price,
  );
  const onSale = normalizeValue(queryParams.onSale ?? queryParams.on_sale);
  const minRating = normalizeValue(queryParams.minRating ?? queryParams.min_rating);
  const orderby = normalizeValue(queryParams.orderby);
  const order = normalizeValue(queryParams.order);

  if (category !== null) {
    filters.category = category;
  } else if (categoryId != null) {
    filters.category = categoryId;
  }

  // `slug` represents route slugs for multiple taxonomies (category/brand/tag/location).
  // Never coerce route slug into `category` here; taxonomy route filters must come
  // explicitly from `queryParams` or `categoryId` to avoid incorrect API filters.
  void slug;

  if (brand !== null) filters.brand = brand;
  if (location !== null) filters.location = location;
  if (tag !== null) filters.tag = tag;
  if (searchValue !== null) filters.search = searchValue;
  if (minPrice !== null) filters.minPrice = minPrice;
  if (maxPrice !== null) filters.maxPrice = maxPrice;
  if (onSale !== null) filters.onSale = onSale;
  if (minRating !== null) filters.minRating = minRating;
  if (orderby !== null) filters.orderby = orderby;
  if (order !== null) filters.order = order;

  Object.entries(queryParams).forEach(([key, rawValue]) => {
    if (!key.startsWith('attribute_')) return;
    const value = normalizeValue(rawValue);
    if (value === null) return;
    filters[key] = value;
  });

  return filters;
};
