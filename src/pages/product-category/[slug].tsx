import React, { useMemo } from 'react';
import type { GetServerSideProps } from 'next';
import TaxonomyListingPage from '@/components/Product/TaxonomyListingPage.component';
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';
import type { Product } from '@/types/product';

type CategoryNode = {
  id?: number;
  databaseId?: number;
  name?: string;
  slug?: string;
  description?: string | null;
  count?: number;
};

type PageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

interface CategoryPageProps {
  category: CategoryNode | null;
  products: Product[];
  pageInfo: PageInfo;
  slug: string;
}

const normalizeList = <T,>(payload: any): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) return payload.data as T[];
    if (Array.isArray(payload.products)) return payload.products as T[];
    if (Array.isArray(payload.results)) return payload.results as T[];
  }
  return [];
};

const CategoryPage = ({ category, products, pageInfo, slug }: CategoryPageProps) => {
  const title = useMemo(
    () => String(category?.name || slug || 'Category').replace(/-/g, ' '),
    [category?.name, slug],
  );

  return (
    <TaxonomyListingPage
      title={title}
      description={category?.description || undefined}
      products={products}
      pageInfo={pageInfo}
      slug={slug}
      emptyMessage="No products found in this category"
      totalCount={category?.count}
      fetchAllForSort={false}
    />
  );
};

export default CategoryPage;

export const getServerSideProps: GetServerSideProps = async ({ params, res, query }) => {
  const slug = String(params?.slug || '').trim();
  if (!slug) return { notFound: true };

  try {
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    const page = Math.max(1, Number(query?.page || 1) || 1);
    const perPage = 24;

    const [categoriesPayload, productsPayload] = await Promise.all([
      api.get<any>(ENDPOINTS.CATEGORIES, { params: { slug } }),
      api.get<any>(ENDPOINTS.PRODUCTS, {
        params: {
          category: slug,
          page,
          per_page: perPage,
        },
      }),
    ]);

    const categories = normalizeList<CategoryNode>(categoriesPayload);
    const category =
      categories.find((entry) => String(entry?.slug || '').toLowerCase() === slug.toLowerCase()) ||
      categories[0] ||
      null;

    const products = normalizeList<Product>(productsPayload);
    const totalCount = Number(category?.count || products.length || 0);
    const hasNextPage = totalCount > 0 ? page * perPage < totalCount : products.length >= perPage;

    return {
      props: {
        category,
        products,
        pageInfo: { hasNextPage, endCursor: null },
        slug,
      },
    };
  } catch (error) {
    console.error('[Category SSR] failed:', error);
    return {
      props: {
        category: {
          name: slug.replace(/-/g, ' '),
          slug,
          description: null,
          count: 0,
        },
        products: [],
        pageInfo: { hasNextPage: false, endCursor: null },
        slug,
      },
    };
  }
};
