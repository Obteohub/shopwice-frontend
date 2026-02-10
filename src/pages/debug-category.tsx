
import React from 'react';
import client from '@/utils/apollo/ApolloClient';
import { GET_CATEGORY_NODE_BY_SLUG, GET_CATEGORY_PRODUCTS_BY_ID, GET_SINGLE_PRODUCT } from '@/utils/gql/GQL_QUERIES';

const DebugCategory = ({ logs }: { logs: string[] }) => {
  return (
    <div className="p-5 font-mono">
      <h1>Category Debug (SSR)</h1>
      <pre className="bg-gray-100 p-2.5 whitespace-pre-wrap">
        {logs.join('\n')}
      </pre>
    </div>
  );
};

export const getServerSideProps = async () => {
  const logs: string[] = [];
  const addLog = (msg: string) => logs.push(msg);
  const categorySlug = 'hoodies'; 
  const productSlug = 'test-product'; // We need a real product slug, maybe 'hoodie-with-logo' or similar

  try {
    addLog(`--- TEST 1: CATEGORY ---`);
    addLog(`Fetching category node...`);
    const { data: categoryData } = await client.query({
        query: GET_CATEGORY_NODE_BY_SLUG,
        variables: { slug: [categorySlug] },
        fetchPolicy: 'no-cache',
    });
    addLog(`Category Result: ${JSON.stringify(categoryData)}`);

  } catch (error: any) {
    addLog(`CATEGORY ERROR: ${error.message}`);
  }

  try {
    addLog(`\n--- TEST 2: PRODUCT ---`);
    // Try to fetch a product to see if general connectivity works
    // We don't know a valid slug, but we can try a search or just use the same slug
    addLog(`Fetching product (using 'hoodie' as slug)...`);
    const { data: productData } = await client.query({
        query: GET_SINGLE_PRODUCT,
        variables: { slug: 'hoodie' }, // Common slug
        fetchPolicy: 'no-cache',
    });
    addLog(`Product Result: Success (found: ${!!productData?.product})`);
  } catch (error: any) {
    addLog(`PRODUCT ERROR: ${error.message}`);
  }

  return {
    props: {
      logs
    }
  };
};

export default DebugCategory;
