import { useMemo, useState } from 'react';
import { Product, ProductType } from '@/types/product';
import {
  getUniqueProductTypes,
  parsePrice,
} from '@/utils/functions/productUtils';

export const useProductFilters = (products: Product[]) => {
  const [sortBy, setSortBy] = useState('popular');
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string[]>>({});
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [minRating, setMinRating] = useState<number>(0);
  const [showOnSaleOnly, setShowOnSaleOnly] = useState(false);

  const [productTypes, setProductTypes] = useState<ProductType[]>(() =>
    products ? getUniqueProductTypes(products) : [],
  );

  /* ---------------- Toggle Functions ---------------- */

  const toggleProductType = (id: string) => {
    setProductTypes((prev) =>
      prev.map((type) =>
        type.id === id ? { ...type, checked: !type.checked } : type,
      ),
    );
  };

  const toggleAttribute = (attributeName: string, value: string) => {
    setSelectedAttributes((prev) => {
      const current = prev[attributeName] || [];

      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];

      if (!updated.length) {
        const { [attributeName]: _, ...rest } = prev;
        return rest;
      }

      return { ...prev, [attributeName]: updated };
    });
  };

  /* ---------------- Reset Filters ---------------- */

  const resetFilters = () => {
    setSelectedAttributes({});
    setSelectedBrands([]);
    setSelectedLocations([]);
    setSelectedCategories([]);
    setPriceRange([0, 50000]);
    setMinRating(0);
    setShowOnSaleOnly(false);

    setProductTypes((prev) =>
      prev.map((type) => ({ ...type, checked: false })),
    );
  };

  /* ---------------- Filtering Logic ---------------- */

  const filteredProducts = useMemo(() => {
    if (!products) return [];

    const selectedTypes = productTypes
      .filter((t) => t.checked)
      .map((t) => t.name.toLowerCase());

    const filtered = products.filter((product) => {
      const price = parsePrice(product.price);

      /* Price */
      if (price < priceRange[0] || price > priceRange[1]) return false;

      /* Product Type */
      if (selectedTypes.length) {
        const productCats =
          product.productCategories?.nodes?.map((c) =>
            c.name.toLowerCase(),
          ) || [];

        if (!selectedTypes.some((type) => productCats.includes(type)))
          return false;
      }

      /* Attributes */
      for (const [attrName, values] of Object.entries(selectedAttributes)) {
        const productAttr = product.attributes?.nodes?.find(
          (a) => a.name === attrName,
        );

        const optionsRaw = productAttr?.options || [];
        const options = optionsRaw
          .map((opt: any) => {
            if (opt === null || opt === undefined) return null;
            if (typeof opt === 'string' || typeof opt === 'number') return String(opt);
            if (typeof opt === 'object') return opt.name || opt.label || opt.value || null;
            return null;
          })
          .filter(Boolean) as string[];

        if (!values.some((v) => options.includes(v))) return false;
      }

      /* Brands */
      if (selectedBrands.length) {
        const brands =
          product.productBrand?.nodes?.map((b) => b.name) || [];

        if (!selectedBrands.some((b) => brands.includes(b))) return false;
      }

      /* Locations */
      if (selectedLocations.length) {
        const locations =
          product.productLocation?.nodes?.map((l) => l.name) || [];

        if (!selectedLocations.some((l) => locations.includes(l)))
          return false;
      }

      /* Categories */
      if (selectedCategories.length) {
        const cats =
          product.productCategories?.nodes?.map((c) => c.name) || [];

        if (!selectedCategories.some((c) => cats.includes(c))) return false;
      }

      /* Rating */
      if (minRating && (product.averageRating || 0) < minRating)
        return false;

      /* Sale */
      if (showOnSaleOnly && !product.onSale) return false;

      return true;
    });

    /* ---------------- Sorting ---------------- */

    return [...filtered].sort((a, b) => {
      const priceA = parsePrice(a.price);
      const priceB = parsePrice(b.price);

      switch (sortBy) {
        case 'price-low':
          return priceA - priceB;

        case 'price-high':
          return priceB - priceA;

        case 'newest':
          return b.databaseId - a.databaseId;

        case 'avg-rating':
          return (b.averageRating || 0) - (a.averageRating || 0);

        default:
          return 0;
      }
    });
  }, [
    products,
    productTypes,
    selectedAttributes,
    selectedBrands,
    selectedLocations,
    selectedCategories,
    priceRange,
    minRating,
    showOnSaleOnly,
    sortBy,
  ]);

  return {
    sortBy,
    setSortBy,

    selectedAttributes,
    toggleAttribute,

    selectedBrands,
    setSelectedBrands,

    selectedLocations,
    setSelectedLocations,

    selectedCategories,
    setSelectedCategories,

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
