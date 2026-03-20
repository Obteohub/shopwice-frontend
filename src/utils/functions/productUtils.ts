import { Product, ProductCategory, ProductType } from '@/types/product';

export const getUniqueProductTypes = (
  products: Product[] = [],
): ProductType[] => {
  const categoryMap = new Map<string, ProductType>();

  for (const product of products) {
    const categories = product?.categories;

    if (!categories?.length) continue;

    for (const cat of categories as ProductCategory[]) {
      if (!cat?.slug || !cat?.name) continue;

      const normalizedSlug = cat.slug.trim().toLowerCase();

      if (!categoryMap.has(normalizedSlug)) {
        categoryMap.set(normalizedSlug, {
          id: normalizedSlug,
          name: cat.name.trim(),
          checked: false,
        });
      }
    }
  }

  return Array.from(categoryMap.values()).sort((a, b) =>
    String(a?.name ?? '').localeCompare(String(b?.name ?? ''), undefined, { sensitivity: 'base' }),
  );
};

/**
 * Parse price string to number
 */
export const parsePrice = (price?: string | number | null): number => {
  if (price === null || price === undefined) return 0;
  if (typeof price === 'number') return price;
  return Number(price.replace(/[^\d.]/g, '')) || 0;
};
/**
 * Extract slug from a full URL or path
 */
export const getSlugFromUrl = (url?: string | null): string => {
  if (!url) return '';

  const raw = String(url).trim();
  if (!raw) return '';

  const safeDecode = (value: string) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  const withoutHash = raw.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  const withoutOrigin = withoutQuery.replace(/^https?:\/\/[^/]+/i, '');
  const segments = withoutOrigin
    .split('/')
    .map((segment) => safeDecode(segment).trim())
    .filter(Boolean);

  if (!segments.length) return '';

  // Always use the last path segment — WooCommerce places the product slug last
  // regardless of permalink structure (e.g. /product/slug/ or /product/category/slug/).
  const candidate = segments[segments.length - 1];

  return candidate.replace(/\/+$/g, '').trim();
};
