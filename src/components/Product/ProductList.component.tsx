import { useMemo, useState } from 'react';
import { Product } from '@/types/product';
import { useProductFilters, type RestProduct } from '@/hooks/useProductFilters';
import { usePagination } from '@/hooks/usePagination';
import ProductCard from './ProductCard.component';
import ProductFilters from './ProductFilters.component';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner.component';
import type { ApiFacetGroup, CollectionFilterState, RouteScope } from '@/features/collection/types';

export type { RestProduct } from '@/hooks/useProductFilters';

interface ProductListProps {
  products: Product[] | RestProduct[];
  pageInfo?: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
  slug?: string;
  categoryId?: number;
  query?: any;
  queryParams?: Record<string, string | number | boolean>;
  queryVariables?: Record<string, any>;
  context?: any;
  totalCount?: number;
  initialHasNextPage?: boolean;
  initialFacets?: ApiFacetGroup[];
  forcedState?: Partial<CollectionFilterState>;
  omitManagedQueryKeys?: string[];
  customRouteScope?: RouteScope;
  fetchAllForSort?: boolean;
}

const ProductList = ({
  products: initialProducts,
  pageInfo,
  slug,
  categoryId,
  queryParams,
  queryVariables,
  totalCount,
  initialHasNextPage,
  initialFacets,
  forcedState,
  omitManagedQueryKeys,
  customRouteScope,
  fetchAllForSort = false,
}: ProductListProps) => {
  void queryVariables;
  void categoryId;
  void queryParams;
  void initialHasNextPage;
  void initialFacets;
  void forcedState;
  void omitManagedQueryKeys;
  void customRouteScope;

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [clientPage, setClientPage] = useState(1);

  const pageSize = 24;
  const pagination = usePagination({
    initialProducts: initialProducts as any,
    initialHasNextPage: pageInfo?.hasNextPage || false,
    slug: slug || '',
    pageSize,
  });

  const allProducts = useMemo(() => {
    if (fetchAllForSort) return initialProducts;
    return (pagination.products as unknown as Product[]) || initialProducts;
  }, [fetchAllForSort, initialProducts, pagination.products]);

  const {
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
    resetFilters,
    filteredProducts,
  } = useProductFilters(allProducts as any);

  const effectivePage = fetchAllForSort ? clientPage : pagination.page;
  const pagedProducts = fetchAllForSort
    ? filteredProducts.slice((effectivePage - 1) * pageSize, effectivePage * pageSize)
    : filteredProducts;
  const hasPreviousPage = effectivePage > 1;
  const hasNextPage = fetchAllForSort
    ? effectivePage * pageSize < filteredProducts.length
    : pagination.hasNextPage;

  const loadNext = () => {
    if (fetchAllForSort) {
      if (hasNextPage) setClientPage((prev) => prev + 1);
      return;
    }
    void pagination.goToPage(pagination.page + 1);
  };

  const loadPrevious = () => {
    if (fetchAllForSort) {
      if (hasPreviousPage) setClientPage((prev) => Math.max(1, prev - 1));
      return;
    }
    void pagination.goToPage(Math.max(1, pagination.page - 1));
  };

  const toggleValue = (values: string[], nextValue: string) => {
    const normalized = String(nextValue || '').trim().toLowerCase();
    if (!normalized) return values;
    const exists = values.some((value) => value.trim().toLowerCase() === normalized);
    if (exists) {
      return values.filter((value) => value.trim().toLowerCase() !== normalized);
    }
    return [...values, nextValue];
  };

  const filterState = useMemo(
    () => ({
      category: selectedCategories[0],
      brand: selectedBrands,
      tag: [],
      location: selectedLocations,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
      minRating: minRating || undefined,
      maxRating: undefined,
      stockStatus: [] as Array<'instock' | 'outofstock' | 'onbackorder'>,
      inStock: undefined,
      onSale: showOnSaleOnly || undefined,
      attributes: selectedAttributes,
      page: effectivePage,
      perPage: pageSize,
    }),
    [
      effectivePage,
      minRating,
      pageSize,
      priceRange,
      selectedAttributes,
      selectedBrands,
      selectedCategories,
      selectedLocations,
      showOnSaleOnly,
    ],
  );

  return (
    <div className="w-full px-1 md:px-4 lg:grid lg:grid-cols-[240px_1fr] lg:gap-4 py-1" id="results-header">
      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <h2 className="text-xl font-bold mb-4 text-[#2c3338] uppercase tracking-tight">Filters</h2>
          <ProductFilters
            state={filterState}
            facets={[]}
            onToggleCategory={(value) =>
              setSelectedCategories((prev) =>
                prev[0]?.toLowerCase() === value.toLowerCase() ? [] : [value],
              )
            }
            onToggleBrand={(value) => setSelectedBrands((prev) => toggleValue(prev, value))}
            onSetBrands={setSelectedBrands}
            onToggleTag={() => undefined}
            onToggleLocation={(value) =>
              setSelectedLocations((prev) => toggleValue(prev, value))
            }
            onToggleStockStatus={() => undefined}
            onToggleAttribute={toggleAttribute}
            onSetBoolean={(key, value) => {
              if (key === 'onSale') setShowOnSaleOnly(Boolean(value));
            }}
            onSetNumber={(key, value) => {
              if (key === 'minPrice') {
                setPriceRange((prev) => [value ?? prev[0], prev[1]]);
              }
              if (key === 'maxPrice') {
                setPriceRange((prev) => [prev[0], value ?? prev[1]]);
              }
              if (key === 'minRating') setMinRating(value ?? 0);
            }}
            onClearAll={resetFilters}
            isLoading={pagination.isLoading}
            error={null}
          />
        </div>
      </aside>

      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center flex-shrink-1 min-w-0 overflow-hidden">
            <p className="text-xs md:text-sm text-gray-500 font-normal truncate" suppressHydrationWarning>
              <span className="md:inline hidden">Found </span>
              <span className="font-semibold text-gray-900">
                {typeof totalCount === 'number' ? totalCount : filteredProducts.length}
              </span>
              <span className="md:inline hidden"> products</span>
              <span className="md:hidden inline"> items found</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden lg:block relative">
              <select
                id="sort-select-desktop"
                aria-label="Sort products"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as
                      | 'popular'
                      | 'price-low'
                      | 'price-high'
                      | 'newest'
                      | 'avg-rating',
                  )
                }
                className="border rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="popular">Popular</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest</option>
                <option value="avg-rating">Top Rated</option>
              </select>
            </div>

            <div className="relative lg:hidden">
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 border rounded-md bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
                aria-label="Sort"
              >
                <span className="text-sm font-medium text-gray-700">Sort</span>
              </button>
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-xl border border-gray-100 z-40 py-1">
                    {[
                      { value: 'popular', label: 'Popular' },
                      { value: 'price-low', label: 'Price: Low to High' },
                      { value: 'price-high', label: 'Price: High to Low' },
                      { value: 'newest', label: 'Newest' },
                      { value: 'avg-rating', label: 'Top Rated' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(
                            option.value as
                              | 'popular'
                              | 'price-low'
                              | 'price-high'
                              | 'newest'
                              | 'avg-rating',
                          );
                          setIsSortOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-2.5 text-sm ${sortBy === option.value ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setIsFilterOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 border rounded-md bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              <span className="text-sm font-medium">Filters</span>
            </button>
          </div>
        </div>

        {isFilterOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsFilterOpen(false)} />
            <div className="relative ml-auto w-full max-w-sm h-full bg-white shadow-xl overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-semibold">Filters</h2>
                <button onClick={() => setIsFilterOpen(false)} className="p-1" aria-label="Close filters">x</button>
              </div>
              <div className="px-6 py-6">
                <ProductFilters
                  state={filterState}
                  facets={[]}
                  onToggleCategory={(value) =>
                    setSelectedCategories((prev) =>
                      prev[0]?.toLowerCase() === value.toLowerCase() ? [] : [value],
                    )
                  }
                  onToggleBrand={(value) => setSelectedBrands((prev) => toggleValue(prev, value))}
                  onSetBrands={setSelectedBrands}
                  onToggleTag={() => undefined}
                  onToggleLocation={(value) =>
                    setSelectedLocations((prev) => toggleValue(prev, value))
                  }
                  onToggleStockStatus={() => undefined}
                  onToggleAttribute={toggleAttribute}
                  onSetBoolean={(key, value) => {
                    if (key === 'onSale') setShowOnSaleOnly(Boolean(value));
                  }}
                  onSetNumber={(key, value) => {
                    if (key === 'minPrice') {
                      setPriceRange((prev) => [value ?? prev[0], prev[1]]);
                    }
                    if (key === 'maxPrice') {
                      setPriceRange((prev) => [prev[0], value ?? prev[1]]);
                    }
                    if (key === 'minRating') setMinRating(value ?? 0);
                  }}
                  onClearAll={resetFilters}
                  isLoading={pagination.isLoading}
                  error={null}
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-1 gap-y-2 md:gap-x-3 md:gap-y-6">
          {pagedProducts.map((product: any, index: number) => (
            <ProductCard
              key={product.databaseId || product.id || `${product.slug}-${index}`}
              databaseId={Number(product.databaseId || product.id || 0) || undefined}
              name={product.name}
              price={product.price}
              regularPrice={product.regularPrice}
              salePrice={product.salePrice}
              onSale={product.onSale}
              slug={product.slug}
              image={product.image}
              averageRating={product.averageRating}
              attributes={product.attributes}
              stockQuantity={product.stockQuantity}
              reviewCount={product.reviewCount}
            />
          ))}
        </div>

        {pagination.isLoading && (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner color="orange" size="md" />
          </div>
        )}

        {!pagination.isLoading && (
          <div className="flex justify-center items-center gap-4 py-8 mt-4 border-t border-gray-100">
            <button
              onClick={loadPrevious}
              disabled={!hasPreviousPage}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${hasPreviousPage
                ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm'
                : 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-100'
                }`}
            >
              Previous
            </button>
            <span className="text-sm font-medium text-gray-600">
              Page {effectivePage}
            </span>
            <button
              onClick={loadNext}
              disabled={!hasNextPage}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${hasNextPage
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200'
                : 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-100'
                }`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductList;
