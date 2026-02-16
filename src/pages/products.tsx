import Head from 'next/head';
import Layout from '@/components/Layout/Layout.component';
import ProductList from '@/components/Product/ProductList.component';
import client from '@/utils/apollo/ApolloClient';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner.component';
import { FETCH_ALL_PRODUCTS_QUERY } from '@/utils/gql/GQL_QUERIES';
import type { NextPage, GetStaticProps, InferGetStaticPropsType } from 'next';

export const runtime = 'experimental-edge';

const Products: NextPage = ({
  products,
  pageInfo,
  loading,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  if (loading)
    return (
      <Layout title="Products">
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner />
        </div>
      </Layout>
    );

  if (!products)
    return (
      <Layout title="Products">
        <div className="flex justify-center items-center min-h-screen">
          <p className="text-red-500">No products found</p>
        </div>
      </Layout>
    );

  return (
    <Layout title="Products" fullWidth={true}>
      <Head>
        <title>Products | WooCommerce Next.js</title>
      </Head>

      <div className="pt-1 pb-1">
        <ProductList
          products={products}
          pageInfo={pageInfo}
          query={FETCH_ALL_PRODUCTS_QUERY}
        />
      </div>
    </Layout>
  );
};


export default Products;

export const getStaticProps: GetStaticProps = async () => {
  try {
    const { data, loading, networkStatus } = await client.query({
      query: FETCH_ALL_PRODUCTS_QUERY,
    });

    return {
      props: {
        products: data?.products?.nodes || [],
        pageInfo: data?.products?.pageInfo || {},
        loading,
        networkStatus,
      },
      revalidate: 60,
    };
  } catch (error) {
    console.warn('Failed to fetch products during build:', error);
    return {
      props: {
        products: [],
        pageInfo: {},
        loading: false,
        networkStatus: 8, // Error status
      },
      revalidate: 60,
    };
  }
};
