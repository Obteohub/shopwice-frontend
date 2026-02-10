import { useEffect, useState } from 'react';
import { Product } from '@/types/product';
import { useProductFilters } from '@/hooks/useProductFilters';
import { usePagination } from '@/hooks/usePagination';
import ProductCard from './ProductCard.component';
import ProductFilters from './ProductFilters.component';
import client from '@/utils/apollo/ApolloClient';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner.component';

interface ProductListProps {
  products: Product[];
  title: string;
  pageInfo?: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
  slug?: string;
  query?: any;
  queryVariables?: Record<string, any>;
  context?: any;
  totalCount?: number;
  fetchAllForSort?: boolean;
}

const ProductList = ({
  products: initialProducts,
  title,
  pageInfo,
  slug,
  query,
  queryVariables,
  context = { useDirectFetch: false, fetchOptions: { credentials: 'omit' } },
  totalCount,
  fetchAllForSort = false
}: ProductListProps) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const pageSize = 24;
  const [allProducts, setAllProducts] = useState<Product[]>(initialProducts);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isHydrated, setIsHydrated] = useState(false);

  const pagination = usePagination({
    initialProducts,
    initialHasNextPage: pageInfo?.hasNextPage || false,
    initialEndCursor: pageInfo?.endCursor || null,
    slug: slug || '',
    query,
    queryVariables,
    context
  });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!fetchAllForSort) {
      setAllProducts(pagination.products);
      return;
    }

    let cancelled = false;

    const fetchAllProducts = async () => {
      if (!query) {
        setAllProducts(initialProducts);
        return;
      }

      // Optimization: If SSR already fetched everything (hasNextPage is false), skip re-fetch.
      if (pageInfo && !pageInfo.hasNextPage && initialProducts.length > 0) {
        setAllProducts(initialProducts);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Optimization: Start from where SSR left off
        let after: string | null = pageInfo?.endCursor || null;
        let hasNext = pageInfo?.hasNextPage ?? true;
        const collected: Product[] = [...initialProducts];

        // If we don't have pageInfo, start from scratch (safety fallback)
        if (!pageInfo) {
            collected.length = 0;
            after = null;
            hasNext = true;
        }

        // Only show loading state if we don't have initial products to show
        if (initialProducts.length === 0) {
            setIsLoading(true);
        }

        while (hasNext) {
          const variables = {
            ...queryVariables,
            first: pageSize,
            after,
            ...(slug && !(queryVariables || {}).slug ? { slug } : {}),
          };

          const result = await client.query({
            query,
            variables,
            fetchPolicy: 'network-only',
          });

          const data = result.data;

          let nodes: Product[] = [];
          let pageInfoLocal = { hasNextPage: false, endCursor: null as string | null };

          if (data?.productBrand?.products) {
            nodes = data.productBrand.products.nodes || [];
            pageInfoLocal = data.productBrand.products.pageInfo;
          } else if (data?.productLocation?.products) {
            nodes = data.productLocation.products.nodes || [];
            pageInfoLocal = data.productLocation.products.pageInfo;
          } else if (data?.products) {
            nodes = data.products.nodes || [];
            pageInfoLocal = data.products.pageInfo;
          }

          collected.push(...nodes);
          hasNext = pageInfoLocal.hasNextPage;
          after = pageInfoLocal.endCursor;
          if (!after) hasNext = false;
        }

        if (!cancelled) {
          setAllProducts(collected.length > 0 ? collected : initialProducts);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e);
          setAllProducts(initialProducts);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchAllProducts();

    return () => {
      cancelled = true;
    };
  }, [fetchAllForSort, query, queryVariables, slug, initialProducts, pagination.products, pageSize, pageInfo]);

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
    productTypes,
    toggleProductType,
    resetFilters,
    filteredProducts
  } = useProductFilters(allProducts);

  const pagedProducts = fetchAllForSort
    ? filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredProducts;

  const ssrHasNext = pageInfo?.hasNextPage || false;
  const hasNextPage = fetchAllForSort
    ? (isHydrated ? currentPage * pageSize < filteredProducts.length : ssrHasNext)
    : pagination.hasNextPage;
  const hasPreviousPage = fetchAllForSort
    ? (isHydrated ? currentPage > 1 : false)
    : pagination.hasPreviousPage;

  const displayPage = fetchAllForSort ? (isHydrated ? currentPage : 1) : pagination.currentPage;

  const loadNext = () => {
    if (fetchAllForSort) {
      if (hasNextPage) setCurrentPage((p) => p + 1);
    } else {
      pagination.loadNext();
    }
  };

  const loadPrevious = () => {
    if (fetchAllForSort) {
      if (hasPreviousPage) setCurrentPage((p) => p - 1);
    } else {
      pagination.loadPrevious();
    }
  };

  return (
    <div className="w-full px-1 md:px-4 lg:grid lg:grid-cols-[240px_1fr] lg:gap-4 py-1" id="results-header">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <h2 className="text-xl font-bold mb-4 text-[#2c3338] uppercase tracking-tight">Filters</h2>
          <ProductFilters
            selectedAttributes={selectedAttributes}
            toggleAttribute={toggleAttribute}
            selectedBrands={selectedBrands}
            setSelectedBrands={setSelectedBrands}
            selectedLocations={selectedLocations}
            setSelectedLocations={setSelectedLocations}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            minRating={minRating}
            setMinRating={setMinRating}
            showOnSaleOnly={showOnSaleOnly}
            setShowOnSaleOnly={setShowOnSaleOnly}
            productTypes={productTypes}
            toggleProductType={toggleProductType}
            products={allProducts}
            resetFilters={resetFilters}
          />
        </div>
      </aside>

      <div className="flex flex-col">
        {/* Top Bar: Results, Sorting, Filter Button */}
        <div className="flex items-center justify-between mb-2 gap-2">
          {/* Results Count - Compact on mobile */}
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

          {/* Sorting & Filter Button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Desktop Sort (Visible lg+) */}
            <div className="hidden lg:block relative">
              <select
                id="sort-select-desktop"
                aria-label="Sort products"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="popular">Popular</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest</option>
                <option value="avg-rating">Top Rated</option>
              </select>
            </div>

            {/* Mobile Sort Icon (Visible < lg) */}
            <div className="relative lg:hidden">
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 border rounded-md bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
                aria-label="Sort"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-700">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Sort</span>
              </button>

              {/* Mobile Sort Dropdown */}
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsSortOpen(false)}></div>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-xl border border-gray-100 z-40 py-1">
                    {[
                      { value: 'popular', label: 'Popular' },
                      { value: 'price-low', label: 'Price: Low to High' },
                      { value: 'price-high', label: 'Price: High to Low' },
                      { value: 'newest', label: 'Newest' },
                      { value: 'avg-rating', label: 'Top Rated' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value);
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

            {/* Filter Button (Mobile Only) */}
            <button
              onClick={() => setIsFilterOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 border rounded-md bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5" />
              </svg>
              <span className="text-sm font-medium">Filters</span>
            </button>
          </div>
        </div>

        {/* Filter Sidebar Overlay */}
        {isFilterOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsFilterOpen(false)}></div>

            {/* Sidebar */}
            <div className="relative ml-auto w-full max-w-sm h-full bg-white shadow-xl overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-semibold">Filters</h2>
                <button 
                  onClick={() => setIsFilterOpen(false)} 
                  className="p-1"
                  aria-label="Close filters"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Filter Content */}
              <div className="px-6 py-6">
                <ProductFilters
                  selectedAttributes={selectedAttributes}
                  toggleAttribute={toggleAttribute}
                  selectedBrands={selectedBrands}
                  setSelectedBrands={setSelectedBrands}
                  selectedLocations={selectedLocations}
                  setSelectedLocations={setSelectedLocations}
                  selectedCategories={selectedCategories}
                  setSelectedCategories={setSelectedCategories}
                  priceRange={priceRange}
                  setPriceRange={setPriceRange}
                  minRating={minRating}
                  setMinRating={setMinRating}
                  showOnSaleOnly={showOnSaleOnly}
                  setShowOnSaleOnly={setShowOnSaleOnly}
                  productTypes={productTypes}
                  toggleProductType={toggleProductType}
                  products={allProducts}
                  resetFilters={resetFilters}
                />
              </div>
            </div>
          </div>
        )}

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-1 gap-y-2 md:gap-x-3 md:gap-y-6">
          {pagedProducts.map((product: Product, index: number) => (
            <ProductCard
              key={product.databaseId || `${product.slug}-${index}`}
              databaseId={product.databaseId}
              name={product.name}
              price={product.price}
              regularPrice={product.regularPrice}
              salePrice={product.salePrice}
              onSale={product.onSale}
              slug={product.slug}
              image={product.image}
              averageRating={product.averageRating}
              productCategories={product.productCategories}
              attributes={product.attributes}
              stockQuantity={product.stockQuantity}
              reviewCount={product.reviewCount}
            />
          ))}
        </div>

        {/* Loading Indicator */}
        {(isLoading || pagination.isLoading) && (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner color="orange" size="md" />
          </div>
        )}

        {/* Error State */}
        {(error || pagination.error) && (
          <div className="flex flex-col justify-center items-center py-8 gap-2">
            <p className="text-red-500">Failed to load products</p>
            <div className="flex gap-2">
              <button
                onClick={loadPrevious}
                disabled={!hasPreviousPage}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Try Previous
              </button>
              <button
                onClick={loadNext}
                disabled={!hasNextPage}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
              >
                Try Next
              </button>
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        {!isLoading && !error && (
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
              Page {displayPage}
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

        {!hasNextPage && !isLoading && !error && filteredProducts.length > 0 && (
          <div className="text-center pb-8 text-xs text-gray-400">
            End of results
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductList;
