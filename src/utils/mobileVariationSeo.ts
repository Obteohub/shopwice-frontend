type QueryValue = string | string[] | undefined;

type VariationAttributeEntry = {
  name?: string;
  slug?: string;
  key?: string;
  attribute?: string;
  option?: string;
  value?: string;
};

type VariationLike = {
  id?: number | string;
  variation_id?: number | string;
  sku?: string;
  price?: string | number | null;
  regularPrice?: string | number | null;
  regular_price?: string | number | null;
  salePrice?: string | number | null;
  sale_price?: string | number | null;
  stockStatus?: string;
  stock_status?: string;
  stockQuantity?: number | null;
  stock_quantity?: number | null;
  image?: { src?: string; url?: string; sourceUrl?: string } | null;
  attributes?: VariationAttributeEntry[] | Record<string, unknown>;
};

type ProductLike = {
  id?: number | string;
  slug?: string;
  name?: string;
  categories?: Array<{ name?: string; slug?: string; ancestors?: Array<{ name?: string; slug?: string }> }>;
  variations?: VariationLike[];
  currency?: string;
  currencyCode?: string;
  currency_code?: string;
};

export const MOBILE_STORAGE_ALLOWED = new Set(['128gb', '256gb', '512gb']);

const normalizeText = (value: unknown) => String(value ?? '').trim();
const normalizeLower = (value: unknown) => normalizeText(value).toLowerCase();
const toSlug = (value: unknown) =>
  normalizeLower(value)
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const ensureTaxonomySlug = (value: unknown) => {
  const raw = normalizeLower(value)
    .replace(/^attribute_/, '')
    .replace(/^pa_/, 'pa_');
  if (!raw) return '';
  return raw.startsWith('pa_') ? raw : `pa_${raw}`;
};

const normalizeAttributeParamKey = (value: string) => {
  const key = normalizeLower(value);
  if (!key.startsWith('attribute_')) return '';
  return key;
};

const readQueryFirst = (value: QueryValue) => {
  if (Array.isArray(value)) return normalizeText(value[0]);
  return normalizeText(value);
};

export const readAttributeQueryParams = (query: Record<string, QueryValue>) => {
  const entries: Record<string, string> = {};
  Object.entries(query || {}).forEach(([rawKey, rawValue]) => {
    const key = normalizeAttributeParamKey(rawKey);
    if (!key) return;
    const value = toSlug(readQueryFirst(rawValue));
    if (!value) return;
    entries[key] = value;
  });
  return entries;
};

const normalizeVariationAttributes = (variation: VariationLike) => {
  const output: Record<string, string> = {};
  const source = variation?.attributes;

  if (Array.isArray(source)) {
    source.forEach((entry) => {
      const taxonomy = ensureTaxonomySlug(
        entry?.slug ?? entry?.attribute ?? entry?.name ?? entry?.key,
      );
      const value = toSlug(entry?.option ?? entry?.value ?? '');
      if (!taxonomy || !value) return;
      output[`attribute_${taxonomy}`] = value;
    });
    return output;
  }

  if (source && typeof source === 'object') {
    Object.entries(source).forEach(([rawKey, rawValue]) => {
      const taxonomy = ensureTaxonomySlug(rawKey);
      const value = toSlug(rawValue);
      if (!taxonomy || !value) return;
      output[`attribute_${taxonomy}`] = value;
    });
  }

  return output;
};

export const buildVariationUrl = (
  productSlug: string,
  attributes: Record<string, string>,
) => {
  const base = `/product/${encodeURIComponent(normalizeText(productSlug))}/`;
  const params = new URLSearchParams();
  Object.entries(attributes)
    .filter(([key, value]) => key.startsWith('attribute_') && normalizeText(value))
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([key, value]) => {
      params.set(key, value);
    });

  const query = params.toString();
  return query ? `${base}?${query}` : base;
};

export const resolveSelectedVariation = (
  product: ProductLike | null | undefined,
  variations: VariationLike[] | null | undefined,
  queryAttributes: Record<string, string>,
) => {
  const list = Array.isArray(variations) ? variations : [];
  if (!list.length) return null;
  const requested = Object.entries(queryAttributes || {}).filter(([key, value]) => key.startsWith('attribute_') && value);
  if (!requested.length) return null;

  return (
    list.find((variation) => {
      const attrs = normalizeVariationAttributes(variation);
      return requested.every(([key, value]) => toSlug(attrs[key]) === toSlug(value));
    }) ?? null
  );
};

const detectStorageFromVariation = (variation: VariationLike | null | undefined) => {
  if (!variation) return '';
  const attrs = normalizeVariationAttributes(variation);
  const storageEntry = Object.entries(attrs).find(([key]) =>
    key.includes('storage') || key.includes('storage-capacity'),
  );
  return storageEntry ? toSlug(storageEntry[1]) : '';
};

export const isAllowedStorageVariation = (variation: VariationLike | null | undefined) =>
  MOBILE_STORAGE_ALLOWED.has(detectStorageFromVariation(variation));

const PHONE_MARKERS = ['mobile-phones', 'android-phones', 'basic-phones', 'smartphones', 'iphone'];
const nameLooksLikeMobileSubtree = (value: unknown) => {
  const text = normalizeLower(value);
  if (!text) return false;
  if (text.includes('mobile phone')) return true;
  if (text.includes('smartphone')) return true;
  if (text.includes('android phone')) return true;
  if (text.includes('basic phone')) return true;
  return false;
};

export const isMobilePhoneProduct = (product: ProductLike | null | undefined) => {
  const categories = Array.isArray(product?.categories) ? product!.categories! : [];
  return categories.some((category) => {
    const slug = normalizeLower(category?.slug);
    const name = normalizeLower(category?.name);
    const inNode = PHONE_MARKERS.some((marker) => slug.includes(marker)) || nameLooksLikeMobileSubtree(name);
    if (inNode) return true;
    const ancestors = Array.isArray(category?.ancestors) ? category.ancestors : [];
    return ancestors.some((ancestor) => {
      const ancestorSlug = normalizeLower(ancestor?.slug);
      const ancestorName = normalizeLower(ancestor?.name);
      return PHONE_MARKERS.some((marker) => ancestorSlug.includes(marker)) || nameLooksLikeMobileSubtree(ancestorName);
    });
  });
};

export const buildVariationLabel = (variation: VariationLike | null | undefined) => {
  if (!variation) return '';
  const attrs = normalizeVariationAttributes(variation);
  return Object.values(attrs)
    .filter(Boolean)
    .map((entry) => String(entry).replace(/-/g, ' '))
    .map((entry) => entry.replace(/\b\w/g, (m) => m.toUpperCase()))
    .join(' / ');
};

export const getIndexingRules = (
  product: ProductLike,
  selectedVariation: VariationLike | null,
  queryAttributes: Record<string, string>,
  isMobileProduct: boolean,
) => {
  const hasVariationParam = Object.keys(queryAttributes || {}).some((key) => key.startsWith('attribute_'));

  if (!hasVariationParam) {
    return { robots: 'index,follow', indexable: true, hasVariationParam };
  }

  if (!isMobileProduct) {
    return { robots: 'noindex,follow', indexable: false, hasVariationParam };
  }

  if (!selectedVariation) {
    return { robots: 'noindex,follow', indexable: false, hasVariationParam };
  }

  if (!isAllowedStorageVariation(selectedVariation)) {
    return { robots: 'noindex,follow', indexable: false, hasVariationParam };
  }

  return { robots: 'index,follow', indexable: true, hasVariationParam };
};

export const getCanonicalUrl = (
  product: ProductLike,
  selectedVariation: VariationLike | null,
  queryAttributes: Record<string, string>,
  isMobileProduct: boolean,
  absoluteParentUrl: string,
  absoluteCurrentUrl: string,
) => {
  const rules = getIndexingRules(product, selectedVariation, queryAttributes, isMobileProduct);
  if (!rules.hasVariationParam) return absoluteParentUrl;
  if (!rules.indexable) return absoluteParentUrl;
  return absoluteCurrentUrl;
};

const toAvailability = (variation: VariationLike) => {
  const status = normalizeLower(variation?.stockStatus ?? variation?.stock_status);
  if (status.includes('out')) return 'https://schema.org/OutOfStock';
  if (status.includes('backorder')) return 'https://schema.org/BackOrder';
  return 'https://schema.org/InStock';
};

const toPrice = (variation: VariationLike) => {
  const raw = variation?.salePrice ?? variation?.sale_price ?? variation?.price;
  const cleaned = normalizeText(raw).replace(/,/g, '');
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  return match ? match[0] : '';
};

export const buildProductGroupJsonLd = (
  product: ProductLike,
  selectedVariation: VariationLike,
  siblingVariants: VariationLike[],
  canonicalUrl: string,
) => {
  const productName = normalizeText(product?.name || 'Mobile Phone');
  const productSlug = normalizeText(product?.slug);
  const currency =
    normalizeText(product?.currencyCode || product?.currency_code || product?.currency) || 'GHS';

  const toVariantNode = (variation: VariationLike) => {
    const attrs = normalizeVariationAttributes(variation);
    const label = buildVariationLabel(variation);
    const url = buildVariationUrl(productSlug, attrs);
    return {
      '@type': 'Product',
      name: label ? `${productName} - ${label}` : productName,
      sku: normalizeText(variation?.sku) || undefined,
      url,
      offers: {
        '@type': 'Offer',
        priceCurrency: currency,
        price: toPrice(variation) || undefined,
        availability: toAvailability(variation),
        url,
      },
    };
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProductGroup',
        name: productName,
        url: canonicalUrl,
        hasVariant: siblingVariants.map((variation) => toVariantNode(variation)),
      },
      toVariantNode(selectedVariation),
    ],
  };
};

export const buildVariationUrlMap = (
  product: ProductLike,
  variations: VariationLike[] | null | undefined,
) => {
  const list = Array.isArray(variations) ? variations : [];
  const slug = normalizeText(product?.slug);
  const byId = new Map<string, string>();

  list.forEach((variation) => {
    const attrs = normalizeVariationAttributes(variation);
    const url = buildVariationUrl(slug, attrs);
    const id = normalizeText(variation?.id ?? variation?.variation_id);
    if (!id) return;
    byId.set(id, url);
  });

  return byId;
};
