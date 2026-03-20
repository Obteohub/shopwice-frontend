import { useEffect, useMemo, useState } from 'react';

/** ---------- REST Types ---------- */
type TaxonomyTerm = { id?: number | string; name: string; slug?: string; parent?: number };

type RestAttribute = {
  name: string;
  slug?: string;
  taxonomy?: string;
  options?: Array<
    string | number | { name?: string; label?: string; value?: string }
  > | null;
  nodes?: Array<{
    name?: string;
    slug?: string;
    taxonomy?: string;
    options?: Array<
      string | number | { name?: string; label?: string; value?: string }
    > | null;
  }> | null;
};

export type RestProduct = {
  id: number | string;

  name?: string;
  slug?: string;

  price?: string | number | null;
  regularPrice?: string | number | null;
  salePrice?: string | number | null;
  onSale?: boolean;

  averageRating?: number;
  reviewCount?: number;
  stockQuantity?: number | null;
  stockStatus?: 'instock' | 'outofstock' | 'onbackorder' | string | null;
  inStock?: boolean | null;

  categories?: TaxonomyTerm[] | null;
  brands?: TaxonomyTerm[] | null;
  locations?: TaxonomyTerm[] | null;
  tags?: TaxonomyTerm[] | null;

  attributes?: RestAttribute[] | null;

  // Optional (if your API includes them)
  dateCreated?: string; // ISO
  dateModified?: string; // ISO
};

type ProductTypeFilter = {
  id: string;
  name: string;
  checked: boolean;
};

type PreparedProduct = {
  product: RestProduct;
  price: number;
  rating: number;
  onSale: boolean;
  newestScore: number;
  inStock: boolean;
  stockStatus: 'instock' | 'outofstock' | 'onbackorder';
  categorySet: Set<string>;
  brandSet: Set<string>;
  locationSet: Set<string>;
  tagSet: Set<string>;
  searchBlob: string;
  attributeMap: Map<string, Set<string>>;
  hasAttributes: boolean;
};

/** ---------- Helpers ---------- */
const parsePrice = (value: any) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object') {
    const candidate =
      value.amount ??
      value.value ??
      value.raw ??
      value.price ??
      value.current ??
      value.min ??
      value.max;
    if (candidate !== undefined) return parsePrice(candidate);
  }

  const str = String(value);
  // Handles currency-prefixed values and plain numerics, e.g. "1,200.00" or "1200".
  const num = Number(str.replace(/[^0-9.,]/g, '').replace(/,/g, ''));
  return Number.isFinite(num) ? num : 0;
};

const normalizeOption = (opt: any): string | null => {
  if (opt === null || opt === undefined) return null;
  if (typeof opt === 'string' || typeof opt === 'number') return String(opt);
  if (typeof opt === 'object')
    return opt.name || opt.label || opt.value || null;
  return null;
};

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const canonicalizeAttributeKey = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^pa_/, '')
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-');

const normalizeTerms = (value: unknown): TaxonomyTerm[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (!entry) return null;
        if (typeof entry === 'string') return { name: entry };
        if (typeof entry === 'object') {
          const term = entry as { name?: string; slug?: string; parent?: number };
          if (!term.name) return null;
          return { name: term.name, slug: term.slug, parent: term.parent };
        }
        return null;
      })
      .filter(Boolean) as TaxonomyTerm[];
  }

  if (value && typeof value === 'object') {
    const maybeNodes = (value as { nodes?: unknown[] }).nodes;
    if (Array.isArray(maybeNodes)) return normalizeTerms(maybeNodes);
  }

  return [];
};

const normalizeAttributes = (value: unknown): RestAttribute[] => {
  if (Array.isArray(value)) return value as RestAttribute[];
  if (value && typeof value === 'object') {
    const maybeNodes = (value as { nodes?: RestAttribute[] }).nodes;
    if (Array.isArray(maybeNodes)) return maybeNodes;
  }
  return [];
};

const getAttributeKeys = (attr: RestAttribute): string[] => {
  const keys = [attr.slug, attr.taxonomy, attr.name]
    .filter(Boolean)
    .map((key) => canonicalizeAttributeKey(String(key)));
  return Array.from(new Set(keys));
};

const createValueSet = (values: Array<string | undefined>) =>
  new Set(values.filter(Boolean).map((value) => normalizeText(value)));

const createAttributeMap = (attributes: RestAttribute[]) => {
  const attributeMap = new Map<string, Set<string>>();

  attributes.forEach((attr) => {
    const keySet = new Set<string>(getAttributeKeys(attr));
    (attr.nodes || []).forEach((node) => {
      getAttributeKeys(node as RestAttribute).forEach((key) => keySet.add(key));
    });
    const keys = Array.from(keySet);
    if (keys.length === 0) return;

    const allOptions = [
      ...(Array.isArray(attr.options) ? attr.options : []),
      ...(attr.nodes || []).flatMap((node) =>
        Array.isArray(node.options) ? node.options : [],
      ),
    ];

    const values = allOptions
      .map(normalizeOption)
      .filter(Boolean)
      .map((option) => normalizeText(option));
    if (values.length === 0) return;

    const valueSet = new Set(values);

    keys.forEach((key) => {
      if (!attributeMap.has(key)) attributeMap.set(key, new Set<string>());
      valueSet.forEach((value) => attributeMap.get(key)!.add(value));
    });
  });

  return attributeMap;
};

const getAttributeSearchValues = (attributes: RestAttribute[]) =>
  attributes.flatMap((attr) => [
    attr.name || '',
    attr.slug || '',
    attr.taxonomy || '',
    ...(Array.isArray(attr.options) ? attr.options : [])
      .map(normalizeOption)
      .filter(Boolean)
      .map((option) => String(option)),
    ...(attr.nodes || []).flatMap((node) => [
      node.name || '',
      node.slug || '',
      node.taxonomy || '',
      ...(Array.isArray(node.options) ? node.options : [])
        .map(normalizeOption)
        .filter(Boolean)
        .map((option) => String(option)),
    ]),
  ]);

const getUniqueCategoryTypes = (
  products: RestProduct[],
): ProductTypeFilter[] => {
  const names = new Set<string>();

  (products || []).forEach((p) => {
    normalizeTerms(p.categories).forEach((c) => {
      if (c?.name) names.add(String(c.name));
    });
  });

  return Array.from(names)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      checked: false,
    }));
};

const toTime = (iso?: string) => {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
};

const numericId = (id: number | string) => {
  const n =
    typeof id === 'number' ? id : Number(String(id).replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const taxonomyAttributeKeyToType = (
  key: string,
): 'brand' | 'category' | 'location' | 'tag' | null => {
  const normalized = canonicalizeAttributeKey(key);

  if (
    normalized === 'brand' ||
    normalized === 'brands' ||
    normalized === 'product-brand' ||
    normalized === 'product-brands'
  ) {
    return 'brand';
  }

  if (
    normalized === 'category' ||
    normalized === 'categories' ||
    normalized === 'product-category' ||
    normalized === 'product-categories'
  ) {
    return 'category';
  }

  if (
    normalized === 'location' ||
    normalized === 'locations' ||
    normalized === 'product-location' ||
    normalized === 'product-locations'
  ) {
    return 'location';
  }

  if (
    normalized === 'tag' ||
    normalized === 'tags' ||
    normalized === 'product-tag' ||
    normalized === 'product-tags'
  ) {
    return 'tag';
  }

  return null;
};

/** ---------- Hook ---------- */
export const useProductFilters = (products: RestProduct[]) => {
  const [sortBy, setSortBy] = useState<
    'popular' | 'price-low' | 'price-high' | 'newest' | 'avg-rating'
  >('popular');

  const priceBounds = useMemo<[number, number]>(() => {
    const prices = (products || [])
      .map((product) => parsePrice(product.price))
      .filter((price) => Number.isFinite(price) && price >= 0);

    if (prices.length === 0) return [0, 0];

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return [min, max];
  }, [products]);

  const [selectedAttributes, setSelectedAttributes] = useState<
    Record<string, string[]>
  >({});
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStockStatus, setSelectedStockStatus] = useState<
    Array<'instock' | 'outofstock' | 'onbackorder'>
  >([]);
  const [inStock, setInStock] = useState<boolean | undefined>(undefined);
  const [priceRange, setPriceRange] = useState<[number, number]>(() => priceBounds);
  const [minRating, setMinRating] = useState<number>(0);
  const [showOnSaleOnly, setShowOnSaleOnly] = useState(false);

  // “Product Types” now comes from REST categories
  const [productTypes, setProductTypes] = useState<ProductTypeFilter[]>(() =>
    products ? getUniqueCategoryTypes(products) : [],
  );

  const indexedProducts = useMemo<PreparedProduct[]>(() => {
    return (products || []).map((product) => {
      const categories = normalizeTerms(product.categories);
      const brands = normalizeTerms(product.brands);
      const locations = normalizeTerms(product.locations);
      const tags = normalizeTerms(product.tags);
      const attributes = normalizeAttributes(product.attributes);

      const searchBlob = normalizeText(
        [
          product.name,
          product.slug,
          ...categories.flatMap((c) => [c.name, c.slug || '']),
          ...brands.flatMap((b) => [b.name, b.slug || '']),
          ...locations.flatMap((l) => [l.name, l.slug || '']),
          ...tags.flatMap((t) => [t.name, t.slug || '']),
          ...getAttributeSearchValues(attributes),
        ].join(' '),
      );

      return {
        product,
        price: parsePrice(product.price),
        rating: product.averageRating || 0,
        onSale: Boolean(product.onSale),
        inStock:
          typeof product.inStock === 'boolean'
            ? product.inStock
            : Number(product.stockQuantity ?? 0) > 0,
        stockStatus:
          String(product.stockStatus || '').toLowerCase() === 'outofstock'
            ? 'outofstock'
            : String(product.stockStatus || '').toLowerCase() === 'onbackorder'
              ? 'onbackorder'
              : (typeof product.inStock === 'boolean' ? product.inStock : Number(product.stockQuantity ?? 0) > 0)
                ? 'instock'
                : 'outofstock',
        newestScore: Math.max(
          toTime(product.dateCreated),
          toTime(product.dateModified),
          numericId(product.id),
        ),
        categorySet: createValueSet(
          categories.flatMap((c) => [c.name, c.slug || '']),
        ),
        brandSet: createValueSet(brands.flatMap((b) => [b.name, b.slug || ''])),
        locationSet: createValueSet(
          locations.flatMap((l) => [l.name, l.slug || '']),
        ),
        tagSet: createValueSet(tags.flatMap((t) => [t.name, t.slug || ''])),
        searchBlob,
        attributeMap: createAttributeMap(attributes),
        hasAttributes: attributes.length > 0,
      };
    });
  }, [products]);

  useEffect(() => {
    setPriceRange((prev) => {
      const [boundMin, boundMax] = priceBounds;

      const nextMin = Math.max(boundMin, Math.min(prev[0], boundMax));
      const nextMax = Math.max(nextMin, Math.min(prev[1], boundMax));

      if (nextMin === prev[0] && nextMax === prev[1]) return prev;
      return [nextMin, nextMax];
    });
  }, [priceBounds]);

  /* ---------------- Toggle Functions ---------------- */

  const toggleProductType = (id: string) => {
    setProductTypes((prev) =>
      prev.map((type) =>
        type.id === id ? { ...type, checked: !type.checked } : type,
      ),
    );
  };

  const toggleAttribute = (attributeName: string, value: string) => {
    const normalizedAttributeName = canonicalizeAttributeKey(attributeName);
    if (!normalizedAttributeName) return;

    setSelectedAttributes((prev) => {
      const current = prev[normalizedAttributeName] || [];

      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];

      if (!updated.length) {
        const { [normalizedAttributeName]: removed, ...rest } = prev;
        void removed;
        return rest;
      }

      return { ...prev, [normalizedAttributeName]: updated };
    });
  };

  const toggleStockStatus = (value: 'instock' | 'outofstock' | 'onbackorder') => {
    setSelectedStockStatus((prev) =>
      prev.includes(value) ? prev.filter((entry) => entry !== value) : [...prev, value],
    );
  };

  /* ---------------- Reset Filters ---------------- */

  const resetFilters = () => {
    setSelectedAttributes({});
    setSelectedBrands([]);
    setSelectedLocations([]);
    setSelectedCategories([]);
    setSelectedTags([]);
    setSelectedStockStatus([]);
    setInStock(undefined);
    setPriceRange(priceBounds);
    setMinRating(0);
    setShowOnSaleOnly(false);

    setProductTypes((prev) =>
      prev.map((type) => ({ ...type, checked: false })),
    );
  };

  /* ---------------- Filtering + Sorting ---------------- */

  const filteredProducts = useMemo(() => {
    if (!indexedProducts.length) return [];

    const selectedTypes = productTypes
      .filter((t) => t.checked)
      .map((t) => t.name.toLowerCase());
    const hasAnyAttributeData = indexedProducts.some((entry) => entry.hasAttributes);
    const hasBrandData = indexedProducts.some((entry) => entry.brandSet.size > 0);
    const hasCategoryData = indexedProducts.some((entry) => entry.categorySet.size > 0);
    const hasLocationData = indexedProducts.some((entry) => entry.locationSet.size > 0);
    const hasTagData = indexedProducts.some((entry) => entry.tagSet.size > 0);

    const filtered = indexedProducts.filter((entry) => {
      const { price, rating, onSale, searchBlob } = entry;

      // In-stock toggle
      if (inStock === true && !entry.inStock) return false;

      // Explicit stock-status filters
      if (selectedStockStatus.length > 0 && !selectedStockStatus.includes(entry.stockStatus)) {
        return false;
      }

      // Price
      if (price < priceRange[0] || price > priceRange[1]) return false;

      // Product Type (category-driven)
      if (selectedTypes.length) {
        const productCats = Array.from(entry.categorySet);
        if (!selectedTypes.some((type) => productCats.includes(type)))
          return false;
      }

      // Attributes
      for (const [attrName, values] of Object.entries(selectedAttributes)) {
        const normalizedWantedValues = values.map((v) => normalizeText(v)).filter(Boolean);

        if (normalizedWantedValues.length === 0) continue;

        const normalizedKey = canonicalizeAttributeKey(attrName);
        const taxonomyType = taxonomyAttributeKeyToType(normalizedKey);
        if (taxonomyType) {
          if (
            (taxonomyType === 'brand' && !hasBrandData) ||
            (taxonomyType === 'category' && !hasCategoryData) ||
            (taxonomyType === 'location' && !hasLocationData) ||
            (taxonomyType === 'tag' && !hasTagData)
          ) {
            // Taxonomy data is missing in product payload; keep product and let
            // backend query params drive taxonomy filtering.
            continue;
          }

          const matchesTaxonomy = normalizedWantedValues.some((wanted) => {
            if (taxonomyType === 'brand') {
              return entry.brandSet.has(wanted) || searchBlob.includes(wanted);
            }
            if (taxonomyType === 'category') {
              return entry.categorySet.has(wanted) || searchBlob.includes(wanted);
            }
            if (taxonomyType === 'location') {
              return entry.locationSet.has(wanted) || searchBlob.includes(wanted);
            }
            return entry.tagSet.has(wanted) || searchBlob.includes(wanted);
          });

          if (!matchesTaxonomy) return false;
          continue;
        }

        if (!hasAnyAttributeData) continue;

        if (!entry.hasAttributes) {
          const hasFallbackMatch = normalizedWantedValues.some((wanted) =>
            searchBlob.includes(wanted),
          );
          if (!hasFallbackMatch && hasAnyAttributeData) return false;
          if (!hasFallbackMatch && !hasAnyAttributeData) return false;
          continue;
        }

        const options = entry.attributeMap.get(normalizedKey);
        if (!options) return false;

        if (!normalizedWantedValues.some((wanted) => options.has(wanted))) {
          const hasFallbackMatch = normalizedWantedValues.some((wanted) =>
            searchBlob.includes(wanted),
          );
          if (!hasFallbackMatch) return false;
        }
      }

      // Brands
      if (selectedBrands.length) {
        const hasBrandMatch = selectedBrands.some((brand) => {
          const normalizedBrand = normalizeText(brand);
          return entry.brandSet.has(normalizedBrand) || searchBlob.includes(normalizedBrand);
        });
        if (!hasBrandMatch) return false;
      }

      // Locations
      if (selectedLocations.length) {
        const hasLocationMatch = selectedLocations.some((location) => {
          const normalizedLocation = normalizeText(location);
          return (
            entry.locationSet.has(normalizedLocation) ||
            searchBlob.includes(normalizedLocation)
          );
        });
        if (!hasLocationMatch) return false;
      }

      // Categories
      if (selectedCategories.length) {
        const hasCategoryMatch = selectedCategories.some((category) => {
          const normalizedCategory = normalizeText(category);
          return (
            entry.categorySet.has(normalizedCategory) ||
            searchBlob.includes(normalizedCategory)
          );
        });
        if (!hasCategoryMatch) return false;
      }

      // Tags
      if (selectedTags.length) {
        const hasTagMatch = selectedTags.some((tag) => {
          const normalizedTag = normalizeText(tag);
          return (
            entry.tagSet.has(normalizedTag) ||
            searchBlob.includes(normalizedTag)
          );
        });
        if (!hasTagMatch) return false;
      }

      // Rating
      if (minRating && rating < minRating) return false;

      // Sale
      if (showOnSaleOnly && !onSale) return false;

      return true;
    });

    // Sorting
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;

        case 'price-high':
          return b.price - a.price;

        case 'newest':
          return b.newestScore - a.newestScore;

        case 'avg-rating':
          return b.rating - a.rating;

        // "popular" (default): keep server order
        default:
          return 0;
      }
    }).map((entry) => entry.product);
  }, [
    indexedProducts,
    productTypes,
    selectedAttributes,
    selectedBrands,
    selectedLocations,
    selectedCategories,
    selectedTags,
    selectedStockStatus,
    inStock,
    priceRange,
    minRating,
    showOnSaleOnly,
    sortBy,
  ]);

  return {
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

    productTypes,
    toggleProductType,

    resetFilters,
    filteredProducts,
  };
};
