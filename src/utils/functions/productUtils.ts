import { Product, ProductCategory, ProductType } from '@/types/product';

export const getUniqueProductTypes = (
  products: Product[] = [],
): ProductType[] => {
  const categoryMap = new Map<string, ProductType>();

  for (const product of products) {
    const categories = product?.productCategories?.nodes;

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
