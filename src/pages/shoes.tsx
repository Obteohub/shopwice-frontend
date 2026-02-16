
import React from 'react';
import { GetStaticProps } from 'next';
import Layout from '@/components/Layout/Layout.component';
import ProductList from '@/components/Product/ProductList.component';
import client from '@/utils/apollo/ApolloClient';
import { GET_CATEGORY_DATA_BY_SLUG } from '@/utils/gql/GQL_QUERIES';
import BackButton from '@/components/UI/BackButton.component';

interface ShoesPageProps {
    category: any;
    products: any[];
    pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
    };
    slug: string;
}

const ShoesPage = ({ category, products, pageInfo, slug }: ShoesPageProps) => {
    return (
        <Layout title={category?.name || 'Shoes'} fullWidth={true}>
            <div className="px-2 md:px-4 pt-1 pb-1">
                <BackButton />
                <h1 className="text-[22px] font-bold text-[#2c3338] mb-1 capitalize tracking-tight">
                    {category?.name?.toLowerCase() || 'Shoes'}
                </h1>
                {category?.description && (
                    <div
                        className="mb-10 text-gray-500 max-w-3xl"
                        dangerouslySetInnerHTML={{ __html: category.description }}
                    />
                )}
                <ProductList
                    products={products}
                    pageInfo={pageInfo}
                    slug={slug}
                    query={GET_CATEGORY_DATA_BY_SLUG}
                    queryVariables={{ slug: [slug], categoryId: category.databaseId }}
                    totalCount={category?.count}
                />
            </div>
        </Layout>
    );
};


export default ShoesPage;

export const getStaticProps: GetStaticProps = async () => {
    const slug = 'shoes'; // Hardcoded slug

    try {
        // Step 1: Resolve slug to ID
        const { data: catData } = await client.query({
            query: GET_CATEGORY_DATA_BY_SLUG,
            variables: { slug: [slug], categoryId: null, first: 0 },
        });

        const category = catData?.productCategories?.nodes?.[0];

        if (!category) {
            return {
                props: {
                    category: { name: 'Shoes' },
                    products: [],
                    pageInfo: { hasNextPage: false, endCursor: null },
                    slug: 'shoes'
                },
                revalidate: 60,
            };
        }

        const categoryId = category.databaseId;

        // Step 2: Fetch products by categoryId
        const { data } = await client.query({
            query: GET_CATEGORY_DATA_BY_SLUG,
            variables: { slug: [slug], categoryId, first: 24 },
        });

        return {
            props: {
                category,
                products: data?.products?.nodes || [],
                pageInfo: data?.products?.pageInfo || { hasNextPage: false, endCursor: null },
                slug,
            },
            revalidate: 60,
        };
    } catch (error) {
        console.error('Error fetching shoes data:', error);
        return {
            props: {
                category: { name: 'Shoes' },
                products: [],
                pageInfo: { hasNextPage: false, endCursor: null },
                slug: 'shoes'
            }
        };
    }
};
