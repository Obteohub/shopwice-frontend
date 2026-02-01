
import React from 'react';
import { GetServerSideProps } from 'next';
import Layout from '@/components/Layout/Layout.component';
import ProductList from '@/components/Product/ProductList.component';
import client from '@/utils/apollo/ApolloClient';
import { GET_CATEGORY_DATA_BY_SLUG } from '@/utils/gql/GQL_QUERIES';

interface CategoryPageProps {
    category: any;
    products: any[];
    pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
    };
    slug: string;
}

import BackButton from '@/components/UI/BackButton.component';

const CategoryPage = ({ category, products, pageInfo, slug }: CategoryPageProps) => {
    return (
        <Layout title={category?.name || 'Category'} fullWidth={true}>
            <div className="px-2 md:px-4 pt-1 pb-1">
                <BackButton />
                <h1 className="text-[22px] font-bold text-[#2c3338] mb-1 capitalize tracking-tight">
                    {category?.name?.toLowerCase()}
                </h1>
                {category?.description && (
                    <div
                        className="mb-10 text-gray-500 max-w-3xl"
                        dangerouslySetInnerHTML={{ __html: category.description }}
                    />
                )}
                <ProductList
                    products={products}
                    title={category?.name}
                    pageInfo={pageInfo}
                    slug={slug}
                    query={GET_CATEGORY_DATA_BY_SLUG}
                    queryVariables={{ slug, id: slug }}
                    totalCount={category?.count}
                />
            </div>
        </Layout>
    );
};


export default CategoryPage;

export const getServerSideProps: GetServerSideProps = async ({ params, res }) => {
    const slug = params?.slug as string;

    try {
        // Cache control
        res.setHeader(
            'Cache-Control',
            'public, s-maxage=60, stale-while-revalidate=59'
        );

        const { data } = await client.query({
            query: GET_CATEGORY_DATA_BY_SLUG,
            variables: { slug, id: slug },
        });

        if (!data?.productCategory) {
            return { notFound: true };
        }

        return {
            props: {
                category: data.productCategory,
                products: data.products.nodes,
                pageInfo: data.products.pageInfo,
                slug,
            },
        };
    } catch (error) {
        console.error('Error fetching category data:', error);
        return {
            notFound: true,
        };
    }
};
