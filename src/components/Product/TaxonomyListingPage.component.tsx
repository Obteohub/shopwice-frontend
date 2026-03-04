import React from 'react';
import Layout from '@/components/Layout/Layout.component';
import BackButton from '@/components/UI/BackButton.component';
import ProductList from '@/components/Product/ProductList.component';
import { Product } from '@/types/product';
import type { RestProduct } from '@/hooks/useProductFilters';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner.component';
import type { ApiFacetGroup, CollectionFilterState, RouteScope } from '@/features/collection/types';

interface TaxonomyListingPageProps {
  title: string;
  products: Product[] | RestProduct[];
  pageInfo?: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
  slug: string;
  query?: any;
  queryParams?: Record<string, any>;
  queryVariables?: Record<string, any>;
  description?: string | null;
  emptyMessage?: string;
  topSlot?: React.ReactNode;
  totalCount?: number;
  initialHasNextPage?: boolean;
  initialFacets?: ApiFacetGroup[];
  forcedState?: Partial<CollectionFilterState>;
  omitManagedQueryKeys?: string[];
  customRouteScope?: RouteScope;
  brandHierarchy?: {
    trail: Array<{ label: string; path: string; isCurrent?: boolean }>;
    children: Array<{ label: string; path: string; count?: number; isCurrent?: boolean }>;
  };
  fetchAllForSort?: boolean;
  loading?: boolean;
  breadcrumbs?: Array<{ label?: string; href?: string | null }> | null;
}

const TaxonomyListingPage = ({
  title,
  products,
  pageInfo,
  slug,
  query,
  queryParams,
  queryVariables,
  description,
  emptyMessage = 'No products found',
  topSlot,
  totalCount,
  initialHasNextPage,
  initialFacets,
  forcedState,
  omitManagedQueryKeys,
  customRouteScope,
  brandHierarchy,
  fetchAllForSort,
  loading = false,
  breadcrumbs,
}: TaxonomyListingPageProps) => {
  void queryParams;
  void initialHasNextPage;
  void initialFacets;
  void forcedState;
  void omitManagedQueryKeys;
  void customRouteScope;
  void brandHierarchy;
  void breadcrumbs;
  return (
    <Layout title={title || 'Products'} fullWidth={true}>
      <div className="px-2 md:px-4 pt-1 pb-1">
        <BackButton />

        <header className="mb-6">
          <h1 className="text-[22px] font-bold text-[#2c3338] mb-1 capitalize tracking-tight">
            {loading ? (
              title === 'Loading...' ? 'Loading...' : <span className="animate-pulse bg-gray-200 text-transparent rounded select-none">Loading Category</span>
            ) : (
              (title || 'Products').toLowerCase()
            )}
          </h1>
          {description && (
            <div
              className="text-gray-500 max-w-3xl text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          )}
        </header>

        {topSlot}

        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <LoadingSpinner color="orange" size="lg" />
          </div>
        ) : (
          products && products.length > 0 ? (
            <ProductList
              products={products}
              pageInfo={pageInfo}
              slug={slug}
              query={query}
              queryVariables={queryVariables || {}}
              totalCount={totalCount}
              fetchAllForSort={fetchAllForSort}
            />
          ) : (
            <div className="flex justify-center items-center min-h-[400px]">
              <p className="text-xl text-gray-500">{emptyMessage}</p>
            </div>
          )
        )}
      </div>
    </Layout>
  );
};

export default TaxonomyListingPage;
