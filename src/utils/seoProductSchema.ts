const toStringValue = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const CMS_SCHEMA_HOSTS = new Set(['cms.shopwice.com', 'www.cms.shopwice.com']);

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string') {
    const normalized = value.replace(/[^0-9.-]/g, '').trim();
    if (!normalized) return undefined;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const getSchemaTypes = (value: unknown): string[] => {
  if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => toStringValue(entry))
    .filter(Boolean);
};

const isSchemaType = (node: unknown, expected: string): boolean => {
  if (!node || typeof node !== 'object') return false;
  return getSchemaTypes((node as Record<string, unknown>)['@type']).includes(expected);
};

const dedupeStrings = (values: string[]) => {
  const seen = new Set<string>();
  const output: string[] = [];
  values.forEach((value) => {
    const key = value.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    output.push(value);
  });
  return output;
};

const rewriteSchemaSiteUrl = (value: unknown, canonicalUrl: string) => {
  const raw = toStringValue(value);
  if (!raw || !canonicalUrl) return value;

  try {
    const parsed = new URL(raw);
    const target = new URL(canonicalUrl);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname || '/';
    const isCmsHost = CMS_SCHEMA_HOSTS.has(hostname);
    const isMediaAsset =
      pathname.startsWith('/wp-content/') ||
      pathname.startsWith('/wp-json/') ||
      /\.(?:png|jpe?g|webp|avif|gif|svg|ico|pdf)$/i.test(pathname);

    if (!isCmsHost || isMediaAsset) return value;

    return `${target.origin}${pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return value;
  }
};

const normalizeSchemaSiteUrls = (value: unknown, canonicalUrl: string): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeSchemaSiteUrls(entry, canonicalUrl));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const source = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};

  Object.entries(source).forEach(([key, entry]) => {
    if (key === '@id' || key === 'url') {
      next[key] = rewriteSchemaSiteUrl(entry, canonicalUrl);
      return;
    }

    next[key] = normalizeSchemaSiteUrls(entry, canonicalUrl);
  });

  return next;
};

const readCurrency = (product: Record<string, any>) =>
  toStringValue(product?.currency) ||
  toStringValue(product?.currencyCode) ||
  'GHS';

const readAvailability = (product: Record<string, any>) => {
  const stockStatus = toStringValue(product?.stockStatus || product?.stock_status).toLowerCase();
  const backordersAllowed =
    product?.backorders_allowed === true ||
    toStringValue(product?.backorders_allowed).toLowerCase() === 'yes';
  const stockQuantity = toFiniteNumber(product?.stockQuantity);
  const manageStock = product?.manageStock === true;

  if (stockStatus.includes('outofstock') || stockStatus === 'out_of_stock') {
    return 'https://schema.org/OutOfStock';
  }
  if (stockStatus.includes('onbackorder') || stockStatus === 'on_backorder' || backordersAllowed) {
    return 'https://schema.org/BackOrder';
  }
  if (manageStock && stockQuantity !== undefined && stockQuantity <= 0 && !backordersAllowed) {
    return 'https://schema.org/OutOfStock';
  }
  return 'https://schema.org/InStock';
};

const readPrice = (product: Record<string, any>): number | undefined => {
  const sale = toFiniteNumber(product?.salePrice);
  const price = toFiniteNumber(product?.price);
  const regular = toFiniteNumber(product?.regularPrice);
  const candidate = sale ?? price ?? regular;
  if (candidate === undefined || candidate <= 0) return undefined;
  return candidate;
};

const readBrandName = (product: Record<string, any>) => {
  const brands = Array.isArray(product?.brands) ? product.brands : [];
  for (const brand of brands) {
    const name = toStringValue(brand?.name);
    if (name) return name;
  }
  return '';
};

const readImageUrls = (product: Record<string, any>) => {
  const values: string[] = [];
  const images = Array.isArray(product?.images) ? product.images : [];
  images.forEach((image: any) => {
    const url =
      toStringValue(image?.src) ||
      toStringValue(image?.url) ||
      toStringValue(image?.sourceUrl);
    if (url) values.push(url);
  });

  const primaryImage =
    toStringValue(product?.image?.src) ||
    toStringValue(product?.image?.url) ||
    toStringValue(product?.image?.sourceUrl);
  if (primaryImage) values.push(primaryImage);

  return dedupeStrings(values);
};

const readReviewCount = (product: Record<string, any>) => {
  const reviewCount = toFiniteNumber(product?.reviewCount);
  const ratingCount = toFiniteNumber(product?.ratingCount);
  const count = reviewCount ?? ratingCount;
  if (count === undefined || count <= 0) return undefined;
  return Math.floor(count);
};

const readAverageRating = (product: Record<string, any>) => {
  const avg = toFiniteNumber(product?.averageRating);
  if (avg === undefined || avg <= 0) return undefined;
  return Math.max(0, Math.min(5, avg));
};

const buildReviewSchemas = (product: Record<string, any>) => {
  const reviews = Array.isArray(product?.reviews) ? product.reviews : [];
  return reviews
    .slice(0, 5)
    .map((review: any) => {
      const rating = toFiniteNumber(review?.rating);
      const authorName =
        toStringValue(review?.reviewer) ||
        toStringValue(review?.author?.name) ||
        toStringValue(review?.author_name);
      const body =
        toStringValue(review?.review) ||
        toStringValue(review?.description) ||
        toStringValue(review?.content?.rendered);
      const datePublished =
        toStringValue(review?.dateCreated) ||
        toStringValue(review?.date_created) ||
        toStringValue(review?.date);

      const reviewSchema: Record<string, any> = {
        '@type': 'Review',
      };

      if (authorName) {
        reviewSchema.author = { '@type': 'Person', name: authorName };
      }
      if (body) reviewSchema.reviewBody = body;
      if (datePublished) reviewSchema.datePublished = datePublished;
      if (rating !== undefined) {
        reviewSchema.reviewRating = {
          '@type': 'Rating',
          ratingValue: String(rating),
          bestRating: '5',
          worstRating: '1',
        };
      }

      return reviewSchema;
    })
    .filter((entry) => Object.keys(entry).length > 1);
};

const enrichOffers = (
  offers: unknown,
  product: Record<string, any>,
  canonicalUrl: string,
) => {
  const price = readPrice(product);
  const priceCurrency = readCurrency(product);
  const availability = readAvailability(product);

  const normalizeOfferNode = (offer: Record<string, any>) => {
    const nextOffer: Record<string, any> = { ...offer };
    if (!nextOffer['@type']) nextOffer['@type'] = 'Offer';
    if (!toStringValue(nextOffer.price) && price !== undefined) nextOffer.price = String(price);
    if (!toStringValue(nextOffer.priceCurrency) && priceCurrency) nextOffer.priceCurrency = priceCurrency;
    if (!toStringValue(nextOffer.availability) && availability) nextOffer.availability = availability;
    if (!toStringValue(nextOffer.url) && canonicalUrl) nextOffer.url = canonicalUrl;
    return nextOffer;
  };

  if (Array.isArray(offers)) {
    return offers
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => normalizeOfferNode(entry as Record<string, any>));
  }

  if (offers && typeof offers === 'object') {
    return normalizeOfferNode(offers as Record<string, any>);
  }

  if (price === undefined) return null;

  return {
    '@type': 'Offer',
    price: String(price),
    priceCurrency,
    availability,
    url: canonicalUrl,
  };
};

const enrichAggregateRating = (aggregateRating: unknown, product: Record<string, any>) => {
  const ratingValue = readAverageRating(product);
  const reviewCount = readReviewCount(product);
  if (ratingValue === undefined || reviewCount === undefined) return aggregateRating ?? null;

  if (aggregateRating && typeof aggregateRating === 'object') {
    const next = { ...(aggregateRating as Record<string, any>) };
    if (!next['@type']) next['@type'] = 'AggregateRating';
    if (!toStringValue(next.ratingValue)) next.ratingValue = String(ratingValue);
    if (!toStringValue(next.reviewCount)) next.reviewCount = String(reviewCount);
    return next;
  }

  return {
    '@type': 'AggregateRating',
    ratingValue: String(ratingValue),
    reviewCount: String(reviewCount),
  };
};

const enrichProductNode = (
  node: Record<string, any>,
  product: Record<string, any>,
  canonicalUrl: string,
) => {
  const next: Record<string, any> = normalizeSchemaSiteUrls(node, canonicalUrl) as Record<string, any>;

  const sku = toStringValue(product?.sku);
  if (!toStringValue(next.sku) && sku) next.sku = sku;

  const images = readImageUrls(product);
  if (!next.image && images.length) next.image = images;

  const brandName = readBrandName(product);
  if (!next.brand && brandName) {
    next.brand = { '@type': 'Brand', name: brandName };
  }

  const enrichedOffers = enrichOffers(next.offers, product, canonicalUrl);
  if (enrichedOffers) {
    next.offers = enrichedOffers;
  }

  const enrichedAggregateRating = enrichAggregateRating(next.aggregateRating, product);
  if (enrichedAggregateRating) {
    next.aggregateRating = enrichedAggregateRating;
  }

  if (!next.review) {
    const reviews = buildReviewSchemas(product);
    if (reviews.length === 1) {
      next.review = reviews[0];
    } else if (reviews.length > 1) {
      next.review = reviews;
    }
  }

  return next;
};

export const enrichRankMathProductSchemas = (
  schemas: unknown,
  product: Record<string, any>,
  canonicalUrl: string,
) => {
  if (!Array.isArray(schemas)) return [];

  let hasProductSchema = false;

  const enriched = schemas.map((schema) => {
    if (!schema || typeof schema !== 'object') return schema;
    const source = normalizeSchemaSiteUrls(schema, canonicalUrl) as Record<string, any>;

    if (isSchemaType(source, 'Product')) {
      hasProductSchema = true;
      return enrichProductNode(source, product, canonicalUrl);
    }

    const graph = Array.isArray(source['@graph']) ? source['@graph'] : null;
    if (!graph) return source;

    const nextGraph = graph.map((node) => {
      if (!node || typeof node !== 'object') return node;
      if (!isSchemaType(node, 'Product')) return node;
      hasProductSchema = true;
      return enrichProductNode(node as Record<string, any>, product, canonicalUrl);
    });

    return {
      ...source,
      '@graph': nextGraph,
    };
  });

  if (!hasProductSchema && process.env.NODE_ENV !== 'production') {
    console.warn('[SEO] RankMath JSON-LD does not contain a Product schema for this product URL.');
  }

  return enriched;
};

