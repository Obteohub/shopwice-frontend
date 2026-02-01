import { withRouter } from 'next/router';

// Components
import Layout from '@/components/Layout/Layout.component';
import ProductList from '@/components/Product/ProductList.component';

import client from '@/utils/apollo/ApolloClient';

import { GET_LOCATION_DATA_BY_SLUG } from '@/utils/gql/LOCATION_QUERIES';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';

/**
 * Display location page with filtering, sorting, and infinite scroll
 */
const LocationPage = ({
    locationName,
    products,
    pageInfo,
    slug,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
    return (
        <Layout title={`${locationName ? locationName : 'Location'}`}>
            <div className="container mx-auto px-4 py-8">
                {products && products.length > 0 ? (
                    <ProductList
                        products={products}
                        title={locationName || 'Products'}
                        pageInfo={pageInfo}
                        slug={slug}
                        query={GET_LOCATION_DATA_BY_SLUG}
                        queryVariables={{ slug }}
                    />
                ) : (
                    <div className="flex justify-center items-center min-h-[400px]">
                        <p className="text-xl text-gray-500">No products found for this location</p>
                    </div>
                )}
            </div>
        </Layout>
    );
};


export default withRouter(LocationPage);

export const getServerSideProps: GetServerSideProps = async ({
    query: { slug },
}) => {
    const res = await client.query({
        query: GET_LOCATION_DATA_BY_SLUG,
        variables: { slug: slug, after: null },
    });

    const locationData = res.data.productLocation;
    const productsData = res.data.products;

    const products = productsData ? productsData.nodes : [];
    const pageInfo = productsData ? productsData.pageInfo : { hasNextPage: false, endCursor: null };
    const locationName = locationData ? locationData.name : slug;

    return {
        props: {
            locationName: locationName as string,
            products,
            pageInfo,
            slug: slug as string,
        },
    };
};
