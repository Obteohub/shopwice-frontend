import React from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout/Layout.component';
import BackButton from '@/components/UI/BackButton.component';
import ProductList from '@/components/Product/ProductList.component';
import { Product } from '@/types/product';
import type { RestProduct } from '@/hooks/useProductFilters';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner.component';
import type { ApiFacetGroup, CollectionFilterState, RouteScope } from '@/features/collection/types';
import { decodeHtmlEntities } from '@/utils/text';

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
  initialPage?: number;
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
  initialPage,
  loading = false,
  breadcrumbs,
}: TaxonomyListingPageProps) => {
  void brandHierarchy;

  const safeTitle = decodeHtmlEntities(String(title || 'Products'));
  const normalizedBreadcrumbs =
    Array.isArray(breadcrumbs) && breadcrumbs.length > 0
      ? breadcrumbs
      : [{ label: safeTitle, href: null }];

  return (
    <Layout title={title || 'Products'} fullWidth={true}>
      <div className="px-2 md:px-4 pt-1 pb-1">
        <BackButton />
        <nav className="mb-2 text-sm text-gray-500" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/" className="hover:text-gray-900 transition-colors">
                Home
              </Link>
            </li>
            {normalizedBreadcrumbs.map((crumb, index) => {
              const label = decodeHtmlEntities(String(crumb?.label || '').trim()) || safeTitle;
              const href = typeof crumb?.href === 'string' ? crumb.href : null;
              const isLast = index === normalizedBreadcrumbs.length - 1;
              const key = `${label}-${index}`;

              return (
                <React.Fragment key={key}>
                  <li className="text-gray-400" aria-hidden="true">
                    /
                  </li>
                  <li>
                    {!isLast && href ? (
                      <Link href={href} className="hover:text-gray-900 transition-colors">
                        {label}
                      </Link>
                    ) : (
                      <span className="font-medium text-gray-900">{label}</span>
                    )}
                  </li>
                </React.Fragment>
              );
            })}
          </ol>
        </nav>

        <header className="mb-6">
          <h1 className="text-[22px] font-bold text-[#2c3338] mb-1 capitalize tracking-tight text-center">
            {loading ? (
              title === 'Loading...' ? 'Loading...' : <span className="animate-pulse bg-gray-200 text-transparent rounded select-none">Loading Category</span>
            ) : (
              (title || 'Products').toLowerCase()
            )}
          </h1>
          {description && (
            <div
              className="text-sm leading-relaxed text-gray-500 max-w-none w-full"
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
              queryParams={queryParams}
              queryVariables={queryVariables || {}}
              totalCount={totalCount}
              initialHasNextPage={initialHasNextPage}
              initialFacets={initialFacets}
              forcedState={forcedState}
              omitManagedQueryKeys={omitManagedQueryKeys}
              customRouteScope={customRouteScope}
              fetchAllForSort={fetchAllForSort}
              initialPage={initialPage}
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
