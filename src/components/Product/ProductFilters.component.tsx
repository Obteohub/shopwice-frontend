import { Dispatch, SetStateAction } from 'react';
import { Product, ProductType } from '@/types/product';

import Button from '@/components/UI/Button.component';
import Checkbox from '@/components/UI/Checkbox.component';
import RangeSlider from '@/components/UI/RangeSlider.component';
import Accordion from '@/components/UI/Accordion.component';

interface ProductFiltersProps {
  selectedAttributes: Record<string, string[]>;
  toggleAttribute: (attributeName: string, value: string) => void;
  selectedBrands: string[];
  setSelectedBrands: Dispatch<SetStateAction<string[]>>;
  selectedLocations: string[];
  setSelectedLocations: Dispatch<SetStateAction<string[]>>;
  selectedCategories: string[];
  setSelectedCategories: Dispatch<SetStateAction<string[]>>;
  priceRange: [number, number];
  setPriceRange: Dispatch<SetStateAction<[number, number]>>;
  minRating: number;
  setMinRating: Dispatch<SetStateAction<number>>;
  showOnSaleOnly: boolean;
  setShowOnSaleOnly: Dispatch<SetStateAction<boolean>>;
  productTypes: ProductType[];
  toggleProductType: (id: string) => void;
  products: Product[];
  resetFilters: () => void;
}

const ProductFilters = ({
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
  products,
  resetFilters,
}: ProductFiltersProps) => {
  // Get all unique attributes and their options
  const derivedAttributesMap = new Map<string, Set<string>>();

  const normalizeOption = (option: unknown) => {
    if (option === null || option === undefined) return null;
    if (typeof option === 'string' || typeof option === 'number') return String(option);
    if (typeof option === 'object') {
      const maybe = option as { name?: string; label?: string; value?: string };
      return maybe.name || maybe.label || maybe.value || null;
    }
    return null;
  };

  products.forEach((product) => {
    product.attributes?.nodes?.forEach((attr) => {
      if (!attr.name) return; // Skip attributes without a name
      if (!derivedAttributesMap.has(attr.name)) {
        derivedAttributesMap.set(attr.name, new Set());
      }
      attr.options?.forEach((option) => {
        const normalized = normalizeOption(option);
        if (normalized) derivedAttributesMap.get(attr.name)!.add(normalized);
      });
    });
  });

  const attributes = Array.from(derivedAttributesMap.entries()).map(([name, optionsSet]) => ({
    name,
    options: Array.from(optionsSet).sort((a, b) => String(a ?? '').localeCompare(String(b ?? ''))),
  })).filter(attr => attr?.name && Array.isArray(attr?.options) && attr.options.length > 0);

  // Get unique brands
  const brands = Array.from(
    new Set(
      products.flatMap(
        (product: Product) =>
          product.productBrand?.nodes?.map((node) => node.name) || [],
      ),
    ),
  ).sort((a, b) => String(a ?? '').localeCompare(String(b ?? '')));

  // Get unique locations
  const locations = Array.from(
    new Set(
      products.flatMap(
        (product: Product) =>
          product.productLocation?.nodes?.map((node) => node.name) || [],
      ),
    ),
  ).sort((a, b) => String(a ?? '').localeCompare(String(b ?? '')));

  // Get unique categories
  const categories = Array.from(
    new Set(
      products.flatMap(
        (product: Product) =>
          product.productCategories?.nodes?.map((cat) => cat.name) || [],
      ),
    ),
  ).sort((a, b) => String(a ?? '').localeCompare(String(b ?? '')));

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand],
    );
  };

  const toggleLocation = (location: string) => {
    setSelectedLocations((prev) =>
      prev.includes(location) ? prev.filter((l) => l !== location) : [...prev, location],
    );
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-lg lg:rounded-none">
        <div className="mb-0">
          <Accordion title="Rating">
            <div className="space-y-0.5">
              {[4, 3, 2, 1].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setMinRating(minRating === rating ? 0 : rating)}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-colors ${minRating === rating ? 'bg-blue-50 border border-blue-600' : 'hover:bg-gray-50'
                    }`}
                  aria-label={`Filter by rating ${rating} stars and up`}
                >
                  <div className="flex">
                    {Array.from({ length: 5 }, (_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm">& Up</span>
                </button>
              ))}
            </div>
          </Accordion>
        </div>

        <div className="mb-0">
          <Accordion title="Availability">
            <Checkbox
              id="on-sale"
              label="On Sale"
              checked={showOnSaleOnly}
              onChange={() => setShowOnSaleOnly(!showOnSaleOnly)}
            />
          </Accordion>
        </div>

        <div className="mb-0">
          <Accordion title="Price" defaultOpen={true}>
            <div className="px-2 pt-1 pb-2">
              <RangeSlider
                id="price-range"
                label="Price"
                min={0}
                max={50000}
                value={priceRange[1]}
                startValue={priceRange[0]}
                onChange={(value) => setPriceRange([priceRange[0], value])}
                formatValue={(value) => `GH₵ ${value}`}
              />
            </div>
          </Accordion>
        </div>

        {/* Dynamic Attributes */}
        {attributes.map((attribute) => {
          if (!attribute || !attribute.name) return null;

          const cleanName = (attribute.name.startsWith('pa_')
            ? attribute.name.replace('pa_', '')
            : attribute.name);

          const capitalizedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();

          return (
            <div key={attribute.name} className="mb-0">
              <Accordion title={capitalizedName}>
                <div className="space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
                  {attribute.options.map((option, index) => (
                    <Checkbox
                      key={`${attribute.name}-${option}-${index}`}
                      id={`${attribute.name}-${option}`}
                      label={option}
                      checked={selectedAttributes[attribute.name]?.includes(option) || false}
                      onChange={() => toggleAttribute(attribute.name, option)}
                    />
                  ))}
                </div>
              </Accordion>
            </div>
          );
        })}

        {brands.length > 0 && (
          <div className="mb-0">
            <Accordion title="Brand">
              <div className="space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
                {brands.map((brand, index) => (
                  <Checkbox
                    key={`${brand}-${index}`}
                    id={`brand-${brand}`}
                    label={brand}
                    checked={selectedBrands.includes(brand)}
                    onChange={() => toggleBrand(brand)}
                  />
                ))}
              </div>
            </Accordion>
          </div>
        )}

        {locations.length > 0 && (
          <div className="mb-0">
            <Accordion title="Location">
              <div className="space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
                {locations.map((location, index) => (
                  <Checkbox
                    key={`${location}-${index}`}
                    id={`location-${location}`}
                    label={location}
                    checked={selectedLocations.includes(location)}
                    onChange={() => toggleLocation(location)}
                  />
                ))}
              </div>
            </Accordion>
          </div>
        )}

        {categories.length > 0 && (
          <div className="mb-0">
            <Accordion title="Category" defaultOpen={true}>
              <div className="space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
                {categories.map((category, index) => (
                  <Checkbox
                    key={`${category}-${index}`}
                    id={`category-${category}`}
                    label={category}
                    checked={selectedCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                  />
                ))}
              </div>
            </Accordion>
          </div>
        )}

        <div className="mt-4 px-2">
          <Button
            handleButtonClick={resetFilters}
            variant="reset"
          >
            Reset filter
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductFilters;
