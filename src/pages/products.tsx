import Layout from '@/components/Layout/Layout.component';
import ProductList from '@/components/Product/ProductList.component';
import SeoHead from '@/components/SeoHead';
import Link from 'next/link';
import { api } from '@/utils/api';
import { applyCachePolicy } from '@/utils/cacheControl';
import { ENDPOINTS } from '@/utils/endpoints';
import type { NextPage, GetServerSideProps, InferGetServerSidePropsType } from 'next';
import {
  buildArchiveSeoData,
  getAbsoluteUrlFromRequest,
  parsePageParam,
} from '@/utils/seoPage';


const Products: NextPage = ({
  products,
  pageInfo,
  seoData,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  if (!products || products.length === 0)
    return (
      <Layout title="Products">
        <div className="flex justify-center items-center min-h-screen">
          <p className="text-red-500">No products found</p>
        </div>
      </Layout>
    );

  return (
    <Layout title="Products" fullWidth={true}>
      <SeoHead seoData={seoData} />

      <div className="pt-1 pb-1">
        <div className="px-2 md:px-4">
          <nav className="mb-2 text-sm text-gray-500" aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link href="/" className="hover:text-gray-900 transition-colors">
                  Home
                </Link>
              </li>
              <li className="text-gray-400" aria-hidden="true">
                /
              </li>
              <li className="font-medium text-gray-900">Products</li>
            </ol>
          </nav>
        </div>
        <ProductList
          products={products}
          pageInfo={pageInfo}
        />
      </div>
    </Layout>
  );
};


export default Products;

export const getServerSideProps: GetServerSideProps = async ({ res, req, query, resolvedUrl }) => {
  const page = parsePageParam(query?.page);
  try {
    applyCachePolicy(res, 'archivePage');
    const data = await api.get(ENDPOINTS.PRODUCTS, {
      params: { per_page: 24, page },
      skipReviewEnrich: true,
    });

    // REST API returns array directly
    const products = Array.isArray(data) ? data : [];
    const hasNextPage = products.length >= 24;
    const urlPath = resolvedUrl || `/products${page > 1 ? `?page=${page}` : ''}`;
    const pageUrl = getAbsoluteUrlFromRequest(req, urlPath);
    const seoData = await buildArchiveSeoData({
      pageUrl,
      title: 'Shop',
      description: 'Browse all products on Shopwice.',
      currentPage: page,
      hasNextPage,
      productCount: products.length,
    });

    return {
      props: {
        products,
        pageInfo: {
          hasNextPage,
          endCursor: null,
        },
        seoData,
      },
    };
  } catch (error) {
    console.warn('Failed to fetch products during build:', error);
    const urlPath = resolvedUrl || `/products${page > 1 ? `?page=${page}` : ''}`;
    const pageUrl = getAbsoluteUrlFromRequest(req, urlPath);
    const seoData = await buildArchiveSeoData({
      pageUrl,
      title: 'Shop',
      description: 'Browse all products on Shopwice.',
      currentPage: page,
      hasNextPage: false,
      productCount: 0,
    });

    return {
      props: {
        products: [],
        pageInfo: {},
        seoData,
      },
    };
  }
};
