import Head from 'next/head';
import Layout from '@/components/Layout/Layout.component';
import ProductList from '@/components/Product/ProductList.component';
import client from '@/utils/apollo/ApolloClient';
import { FETCH_ALL_PRODUCTS_QUERY } from '@/utils/gql/GQL_QUERIES';
import type { NextPage, GetStaticProps, InferGetStaticPropsType } from 'next';

const Products: NextPage = ({
  products,
  pageInfo,
  loading,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  if (loading)
    return (
      <Layout title="Products">
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-xl">Loading...</div>
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
          title="All Products"
          pageInfo={pageInfo}
          query={FETCH_ALL_PRODUCTS_QUERY}
        />
      </div>
    </Layout>
  );
};

export const runtime = 'edge';
export default Products;

export const getStaticProps: GetStaticProps = async () => {
  const { data, loading, networkStatus } = await client.query({
    query: FETCH_ALL_PRODUCTS_QUERY,
  });

  return {
    props: {
      products: data.products.nodes,
      pageInfo: data.products.pageInfo,
      loading,
      networkStatus,
    },
    revalidate: 60,
  };
};
