
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
                    title={category?.name || 'Shoes'}
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

export default ShoesPage;

export const getStaticProps: GetStaticProps = async () => {
    const slug = 'shoes'; // Hardcoded slug

    try {
        const { data } = await client.query({
            query: GET_CATEGORY_DATA_BY_SLUG,
            variables: { slug, id: slug },
        });

        // Even if category is null (not distinct category), we might still show products if valid?
        // But usually GET_CATEGORY_DATA_BY_SLUG relies on category existing.
        // If user says "shoes are not categories", maybe we should just SEARCH for "shoes"?
        // But let's try category first. If it fails, fallback to search?
        // Given existing patterns, likely "shoes" *is* a category slug.

        return {
            props: {
                category: data?.productCategory || { name: 'Shoes', count: data?.products?.nodes?.length || 0 },
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
