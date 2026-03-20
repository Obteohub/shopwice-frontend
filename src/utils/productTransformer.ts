/**
 * Product Data Transformer (REST ONLY)
 * Normalizes API responses into a consistent REST shape for components.
 */
import { normalizeImageUrl } from './image';

const toArray = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);
const toArrayLoose = <T,>(v: any): T[] => {
  if (Array.isArray(v)) return v as T[];
  if (v && typeof v === 'object') {
    if (Array.isArray((v as any).items)) return (v as any).items as T[];
    if ('src' in v || 'sourceUrl' in v || 'url' in v || 'id' in v) return [v as T];
  }
  return [];
};

const toVariationArray = <T,>(value: any): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== 'object') return [];

  if (Array.isArray((value as any).items)) return (value as any).items as T[];
  if (Array.isArray((value as any).data)) return (value as any).data as T[];
  if (Array.isArray((value as any).results)) return (value as any).results as T[];
  if (Array.isArray((value as any).nodes)) return (value as any).nodes as T[];
  if (Array.isArray((value as any).variations)) return (value as any).variations as T[];
  if (Array.isArray((value as any).available_variations)) return (value as any).available_variations as T[];
  if (Array.isArray((value as any).availableVariations)) return (value as any).availableVariations as T[];

  const objectValues = Object.values(value);
  if (
    objectValues.length > 0 &&
    objectValues.every((entry) => entry && typeof entry === 'object')
  ) {
    return objectValues as T[];
  }

  if ('id' in (value as any) || 'variation_id' in (value as any) || 'databaseId' in (value as any)) {
    return [value as T];
  }

  return [];
};

const normalizeText = (value: unknown) => String(value ?? '').trim();

const normalizeOptions = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) =>
        typeof entry === 'object'
          ? (entry?.name || entry?.label || entry?.value || entry?.slug || String(entry))
          : String(entry),
      )
      .map((entry) => normalizeText(entry))
      .filter(Boolean);
  }
  if (value && typeof value === 'object') {
    return normalizeOptions(Object.values(value));
  }
  const text = normalizeText(value);
  return text ? [text] : [];
};

const extractVariationAttributes = (variation: any) => {
  const attributesSource = variation?.attributes ?? variation?.attribute ?? variation?.options;
  const normalized: Array<{ name: string; option: string }> = [];

  if (Array.isArray(attributesSource)) {
    for (const attr of attributesSource) {
      const name = normalizeText(
        attr?.name ??
          attr?.label ??
          attr?.slug ??
          attr?.attribute ??
          attr?.key,
      );
      const option = normalizeText(
        attr?.option ??
          attr?.value ??
          attr?.name ??
          attr?.label,
      );
      if (name || option) normalized.push({ name, option });
    }
    return normalized;
  }

  if (attributesSource && typeof attributesSource === 'object') {
    for (const [rawName, rawValue] of Object.entries(attributesSource)) {
      const name = normalizeText(rawName);
      const option = normalizeText(rawValue);
      if (name || option) normalized.push({ name, option });
    }
  }

  return normalized;
};

const buildVariationName = (variation: any) => {
  const explicit = normalizeText(variation?.name ?? variation?.title);
  if (explicit) return explicit;

  const attributes = extractVariationAttributes(variation);
  if (!attributes.length) return '';

  return attributes
    .map((attr) => normalizeText(attr.option || attr.name))
    .filter(Boolean)
    .join(' / ');
};

const toSlugFragment = (value: unknown) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const extractSlugFromPathLike = (value: unknown) => {
  const raw = normalizeText(value);
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    return parsed.pathname
      .split('/')
      .filter(Boolean)
      .pop()
      ?.trim()
      .toLowerCase() || '';
  } catch {
    return raw
      .split('?')[0]
      .split('#')[0]
      .split('/')
      .filter(Boolean)
      .pop()
      ?.trim()
      .toLowerCase() || '';
  }
};

const buildSyntheticVariationsFromAttributes = ({
  product,
  attributes,
  stockQuantity,
  stockStatus,
  manageStock,
}: {
  product: any;
  attributes: Array<{ name?: string; slug?: string; options?: string[]; isVariation?: boolean }>;
  stockQuantity: any;
  stockStatus: string;
  manageStock: boolean | undefined;
}) => {
  const variationAttributes = attributes
    .filter((attr) => Boolean(attr?.isVariation))
    .map((attr) => ({
      name: normalizeText(attr?.name || attr?.slug || 'Option'),
      options: normalizeOptions(attr?.options).filter(Boolean),
    }))
    .filter((attr) => attr.options.length > 0);

  if (variationAttributes.length === 0) return [];

  const MAX_SYNTHETIC_VARIATIONS = 120;
  let combinations: Array<Array<{ name: string; option: string }>> = [[]];

  for (const attr of variationAttributes) {
    const next: Array<Array<{ name: string; option: string }>> = [];
    for (const combo of combinations) {
      for (const option of attr.options) {
        next.push([...combo, { name: attr.name, option: normalizeText(option) }]);
        if (next.length >= MAX_SYNTHETIC_VARIATIONS) break;
      }
      if (next.length >= MAX_SYNTHETIC_VARIATIONS) break;
    }
    combinations = next;
    if (combinations.length >= MAX_SYNTHETIC_VARIATIONS) break;
  }

  const productId = normalizeText(product?.id ?? product?.product_id ?? product?.databaseId) || 'product';
  const baseSku = normalizeText(product?.sku);

  return combinations.map((combo, index) => {
    const optionLabel = combo.map((entry) => entry.option).filter(Boolean).join(' / ');
    const optionKey =
      combo
        .map((entry) => toSlugFragment(entry.option || entry.name))
        .filter(Boolean)
        .join('-') || `option-${index + 1}`;

    return {
      id: `synthetic-${productId}-${index + 1}-${optionKey}`,
      name: optionLabel || `Option ${index + 1}`,
      sku: baseSku ? `${baseSku}-${optionKey}` : '',
      price: pickFirst(product, ['price', 'display_price']),
      regularPrice: pickFirst(product, ['regularPrice', 'regular_price']),
      salePrice: pickFirst(product, ['salePrice', 'sale_price']),
      stockQuantity,
      stockStatus,
      manageStock,
      attributes: combo,
      image: null,
      synthetic: true,
    };
  });
};

const unwrapProductPayload = (value: any) => {
  if (!value || typeof value !== 'object') return value;

  // Common middleware wrappers: { data: product } / { product: product } / { item: product }
  if (value.data && typeof value.data === 'object' && !Array.isArray(value.data)) {
    return unwrapProductPayload(value.data);
  }
  if (value.product && typeof value.product === 'object' && !Array.isArray(value.product)) {
    return unwrapProductPayload(value.product);
  }
  if (value.item && typeof value.item === 'object' && !Array.isArray(value.item)) {
    return unwrapProductPayload(value.item);
  }

  return value;
};

const pickFirst = (obj: any, keys: string[]) => {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k];
  }
  return undefined;
};

const parseNumberish = (value: any): number | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '').trim();
    if (!cleaned) return undefined;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : undefined;
  }
  return undefined;
};

const normalizeStockStatusValue = (value: any): string => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '');

  if (!normalized) return '';
  if (normalized === 'instock' || normalized === 'available') return 'instock';
  if (normalized === 'outofstock' || normalized === 'soldout' || normalized === 'unavailable') {
    return 'outofstock';
  }
  if (normalized === 'onbackorder' || normalized === 'backorder' || normalized === 'backordered') {
    return 'onbackorder';
  }
  return normalized;
};

const deriveStockStatus = (obj: any, fallbackQuantity?: number | string | null): string => {
  const directStatus = normalizeStockStatusValue(
    pickFirst(obj, ['stockStatus', 'stock_status', 'stockstatus', 'availability']),
  );
  if (directStatus) return directStatus;

  const inStockRaw = pickFirst(obj, ['inStock', 'in_stock', 'isInStock', 'is_in_stock']);
  if (typeof inStockRaw === 'boolean') return inStockRaw ? 'instock' : 'outofstock';
  if (String(inStockRaw ?? '').trim() === '1') return 'instock';
  if (String(inStockRaw ?? '').trim() === '0') return 'outofstock';

  const backordersAllowed =
    Boolean(obj?.backorders_allowed) ||
    String(obj?.backorders ?? '').toLowerCase() === 'yes';
  if (backordersAllowed) return 'onbackorder';

  const qty = parseNumberish(
    pickFirst(obj, ['stockQuantity', 'stock_quantity', 'stock', 'quantity']) ??
      fallbackQuantity,
  );
  if (qty !== undefined) return qty > 0 ? 'instock' : 'outofstock';

  return '';
};

const parseManageStockValue = (value: any): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return undefined;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
};

const extractUnitsSold = (obj: any): number | undefined => {
  const direct = pickFirst(obj, [
    'unitsSold',
    'units_sold',
    'totalSales',
    'total_sales',
    'sales',
    'sold',
  ]);
  const directParsed = parseNumberish(direct);
  if (directParsed !== undefined) return directParsed;

  const meta = toArray<any>(obj?.metaData ?? obj?.meta_data);
  for (const entry of meta) {
    const key = String(entry?.key || '').toLowerCase();
    if (
      key === '_total_sales' ||
      key === 'total_sales' ||
      key === 'units_sold' ||
      key === 'unitssold' ||
      key === 'sales'
    ) {
      const parsed = parseNumberish(entry?.value);
      if (parsed !== undefined) return parsed;
    }
  }

  return undefined;
};

const getImageUrl = (img: any) =>
  normalizeImageUrl(img?.src) ||
  normalizeImageUrl(img?.url) ||
  normalizeImageUrl(img?.sourceUrl) ||
  normalizeImageUrl(img?.source_url) ||
  normalizeImageUrl(img?.image) ||
  '';

const normalizeImage = (img: any) => {
  const src = getImageUrl(img);
  if (!src) return null;
  return {
    sourceUrl: src,
    altText: img?.altText || img?.alt_text || img?.alt || '',
    src,
    alt: img?.alt || img?.altText || img?.alt_text || '',
  };
};

  const dedupeBySrc = (images: any[]) => {
  const seen = new Set<string>();
  return images.filter((img) => {
    const src = img?.sourceUrl || img?.src;
    if (!src) return false;
    if (seen.has(src)) return false;
    seen.add(src);
    return true;
  });
};

export function normalizeProduct(product: any) {
  if (!product) return null;

  const p = unwrapProductPayload(product);

  // --- Base IDs ---
  const id = p.id ?? p.product_id ?? p.databaseId ?? p.productId;
  const resolvedSlug = normalizeText(
    p.slug ??
    p.handle ??
    extractSlugFromPathLike(p.url ?? p.href ?? p.link ?? p.permalink),
  ).toLowerCase();
  const frontendProductUrl = resolvedSlug ? `/product/${encodeURIComponent(resolvedSlug)}` : '';

  // --- Categories / Brands / Locations ---
  // Accept only REST-style arrays.
  const categories = toArrayLoose<any>(p.categories ?? p.product_categories);
  const brands = toArrayLoose<any>(p.brands ?? p.product_brands);
  const locations = toArrayLoose<any>(p.locations ?? p.product_locations);

  // --- Attributes ---
  // Only REST-style attributes array
  const attributesRaw = toArrayLoose<any>(p.attributes);
  const attributes = attributesRaw.map((attr) => {
    const name = attr?.name ?? attr?.label ?? attr?.slug ?? '';
    const ownOptions = Array.isArray(attr?.options)
      ? attr.options
      : (attr?.value ? [attr.value] : (attr?.option ? [attr.option] : []));
    const rawOptions = [...ownOptions];
    const options = rawOptions
      .map((o: any) => (typeof o === 'object' ? (o?.name || o?.label || o?.value || o?.slug || String(o)) : String(o)))
      .filter((option) => String(option || '').trim().length > 0);
    const normalizedId = parseNumberish(attr?.id ?? attr?.attribute_id ?? attr?.term_id) ?? 0;
    const normalizedSlug = normalizeText(attr?.slug ?? attr?.taxonomy ?? name).toLowerCase();
    const isVariation = Boolean(
      attr?.isVariation ??
      attr?.is_variation ??
      attr?.variation ??
      attr?.for_variation,
    );

    return {
      ...attr,
      id: Number.isFinite(normalizedId) ? Number(normalizedId) : 0,
      slug: normalizedSlug,
      name,
      options: normalizeOptions(options),
      isVariation,
    };
  });

  const normalizedStockQuantity = pickFirst(p, [
    'stockQuantity',
    'stock_quantity',
    'stock',
    'quantity',
  ]);
  const normalizedStockStatus = deriveStockStatus(p, normalizedStockQuantity);
  const normalizedManageStock = parseManageStockValue(
    pickFirst(p, ['manageStock', 'manage_stock']),
  );

  // --- Variations ---
  // Normalize to: [{ id, name, stockQuantity, stockStatus, sku, image? }]
  const variationCandidates =
    p.variations ??
    p.variation ??
    p.variants ??
    p.availableVariations ??
    p.available_variations ??
    p.variationData ??
    p.variation_data;
  const variationsRaw = toVariationArray<any>(variationCandidates);
  const resolvedVariations = variationsRaw.map((v) => {
    const vObj =
      v && typeof v === 'object'
        ? v
        : {
            id: v,
          };
    const variationStockQuantity = pickFirst(vObj, [
      'stockQuantity',
      'stock_quantity',
      'stock',
      'quantity',
    ]);
    const variationStockStatus = deriveStockStatus(vObj, variationStockQuantity);
    const variationManageStock = parseManageStockValue(
      pickFirst(vObj, ['manageStock', 'manage_stock']),
    );
    const vImage = vObj?.image ? normalizeImage(vObj.image) : null;
    const variationId =
      vObj?.id ??
      vObj?.variation_id ??
      vObj?.databaseId ??
      (typeof v === 'string' || typeof v === 'number' ? v : undefined);

    return {
      ...vObj,
      id: variationId,
      name: buildVariationName(vObj),
      sku: vObj?.sku ?? '',
      price: pickFirst(vObj, ['price', 'display_price']),
      regularPrice: pickFirst(vObj, ['regularPrice', 'regular_price']),
      salePrice: pickFirst(vObj, ['salePrice', 'sale_price']),
      stockQuantity: variationStockQuantity ?? null,
      stockStatus: variationStockStatus,
      attributes: extractVariationAttributes(vObj),
      manageStock:
        variationManageStock !== undefined
          ? variationManageStock
          : normalizedManageStock,
      image: vImage
        ? {
            sourceUrl: vImage.sourceUrl,
            altText: vImage.altText,
            src: vImage.src,
            alt: vImage.alt,
          }
        : null,
    };
  });
  const normalizedProductType = normalizeText(
    p?.type ?? p?.productType ?? p?.product_type,
  ).toLowerCase();
  const isExplicitVariableProduct =
    normalizedProductType === 'variable' || normalizedProductType === 'variation';
  const hasMultiOptionVariationAttribute = attributes.some(
    (attr) => Boolean(attr?.isVariation) && Array.isArray(attr?.options) && attr.options.length > 1,
  );
  const shouldBuildSyntheticVariations =
    resolvedVariations.length === 0 &&
    (isExplicitVariableProduct || hasMultiOptionVariationAttribute);

  const syntheticVariations = shouldBuildSyntheticVariations
    ? buildSyntheticVariationsFromAttributes({
        product: p,
        attributes,
        stockQuantity: normalizedStockQuantity,
        stockStatus: normalizedStockStatus,
        manageStock: normalizedManageStock,
      })
    : [];
  const variations = resolvedVariations.length > 0 ? resolvedVariations : syntheticVariations;

  // --- Reviews ---
  // Only REST-style reviews array
  const reviewsRaw = toArrayLoose<any>(p.reviews ?? p.product_reviews);
  const reviews = reviewsRaw.map((rev, index) => ({
    id: String(rev?.id ?? `${id ?? 'product'}-review-${index}`),
    content: rev?.review ?? rev?.content ?? '',
    rating: Number(rev?.rating ?? 0),
    date: rev?.date_created ?? rev?.date ?? '',
    reviewer: rev?.reviewer ?? rev?.author_name ?? 'Verified Buyer',
  }));

  // --- Images ---
  // Unify: main image + images[] + gallery_images[] (REST only)
  const mainImage = p.image ? normalizeImage(p.image) : null;

  const imagesFromImages = toArrayLoose<any>(p.images)
    .map(normalizeImage)
    .filter(Boolean) as Array<{ sourceUrl: string; altText: string; src: string; alt: string }>;

  const imagesFromGallery = toArrayLoose<any>(p.gallery_images ?? p.galleryImages)
    .map((img) => normalizeImage(img))
    .filter(Boolean) as Array<{ sourceUrl: string; altText: string; src: string; alt: string }>;

  const images = dedupeBySrc(
    [
      ...(mainImage ? [mainImage] : []),
      ...imagesFromImages,
      ...imagesFromGallery,
    ].filter(Boolean)
  );
  const primaryImage = mainImage || images[0] || null;
  const galleryImages = images.slice(mainImage ? 1 : 0);

  // --- Related / Upsell / CrossSell / Bought Together ---
  // Normalize to plain arrays of products (if present)
  const related = toArrayLoose<any>(p.related ?? p.related_products);
  const upsell = toArrayLoose<any>(p.upsell ?? p.upsells);
  const crossSell = toArrayLoose<any>(
    p.crossSell ?? p.cross_sell ?? p.crossSells ?? p.cross_sells,
  );
  const boughtTogether = toArrayLoose<any>(
    p.boughtTogether ??
      p.bought_together ??
      p.frequentlyBoughtTogether ??
      p.frequently_bought_together,
  );
  const relatedIds = toArrayLoose<any>(p.relatedIds ?? p.related_ids);
  const upsellIds = toArrayLoose<any>(p.upsellIds ?? p.upsell_ids);
  const crossSellIds = toArrayLoose<any>(p.crossSellIds ?? p.cross_sell_ids);
  const boughtTogetherIds = toArrayLoose<any>(
    p.boughtTogetherIds ??
      p.bought_together_ids ??
      p.frequentlyBoughtTogetherIds ??
      p.frequently_bought_together_ids,
  );

  // --- Prices / stock ---
  // Keep values as-is (your UI already formats)
  const normalizedSales = extractUnitsSold(p);
  const normalizedAverageRating = parseNumberish(
    pickFirst(p, ['averageRating', 'average_rating', 'rating', 'avg_rating']),
  );
  const normalizedReviewCount = parseNumberish(
    pickFirst(p, ['reviewCount', 'rating_count', 'ratingCount']),
  );

  const normalized = {
    ...p,

    // Core normalized fields
    id,
    slug: resolvedSlug || p.slug || '',
    url: frontendProductUrl || p.url || '',
    href: frontendProductUrl || p.href || '',
    link: frontendProductUrl || p.link || '',
    productUrl: frontendProductUrl || p.productUrl || '',
    image: primaryImage,
    categories,
    brands,
    locations,
    attributes,
    variations,
    reviews,
    images,
    galleryImages,
    related,
    upsell,
    crossSell,
    boughtTogether,
    relatedIds,
    upsellIds,
    crossSellIds,
    boughtTogetherIds,

    // Preserve common backend key variants too.
    upsells: upsell,
    crossSells: crossSell,

    // Make sure these exist consistently (even if empty)
    metaData: toArray<any>(p.metaData ?? p.meta_data),

    // Normalize stock keys for convenience
    stockStatus: normalizedStockStatus,
    stockQuantity: normalizedStockQuantity ?? null,
    manageStock: normalizedManageStock,
    totalSales: normalizedSales,
    unitsSold: normalizedSales,
    averageRating:
      normalizedAverageRating !== undefined ? Number(normalizedAverageRating.toFixed(1)) : 0,
    reviewCount:
      normalizedReviewCount !== undefined ? Math.max(0, Math.floor(normalizedReviewCount)) : 0,
    backorders_allowed: p.backorders_allowed ?? (p.backorders === 'yes'),
  };

  return normalized;
}
