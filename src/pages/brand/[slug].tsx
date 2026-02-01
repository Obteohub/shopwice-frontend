import { withRouter } from 'next/router';

// Components
import Layout from '@/components/Layout/Layout.component';
import ProductList from '@/components/Product/ProductList.component';

import client from '@/utils/apollo/ApolloClient';

import { GET_BRAND_DATA_BY_SLUG } from '@/utils/gql/TAXONOMY_QUERIES';
import { GetStaticProps, GetStaticPaths, InferGetStaticPropsType } from 'next';

import Link from 'next/link';

import BackButton from '@/components/UI/BackButton.component';

/**
 * Display brand page with filtering, sorting, and infinite scroll
 */
const BrandPage = ({
    brandName,
    products,
    pageInfo,
    slug,
    subBrands,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
    return (
        <Layout title={`${brandName ? brandName : 'Brand'}`} fullWidth={true}>
            <div className="px-2 md:px-4 pt-1 pb-1">
                <BackButton />
                <h1 className="text-[22px] font-bold text-[#2c3338] mb-1 capitalize tracking-tight">
                    {brandName?.toLowerCase()}
                </h1>

                {/* Sub-brand Chips */}
                {subBrands && subBrands.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {subBrands.map((subBrand: any) => (
                            <Link
                                key={subBrand.id}
                                href={`/brand/${subBrand.slug}`}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-[#2c3338] text-sm font-medium rounded-full transition-colors border border-gray-200 capitalize"
                            >
                                {subBrand.name.toLowerCase()}
                            </Link>
                        ))}
                    </div>
                )}

                {products && products.length > 0 ? (
                    <ProductList
                        products={products}
                        title={brandName || 'Products'}
                        pageInfo={pageInfo}
                        slug={slug}
                        query={GET_BRAND_DATA_BY_SLUG}
                        queryVariables={{ id: slug, slug: [slug] }}
                    />
                ) : (
                    <div className="flex justify-center items-center min-h-[400px]">
                        <p className="text-xl text-gray-500">No products found for this brand</p>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export const runtime = 'edge';
export default withRouter(BrandPage);

export const getStaticPaths: GetStaticPaths = async () => {
    return {
        paths: [],
        fallback: 'blocking',
    };
};

export const getStaticProps: GetStaticProps = async ({
    params,
}) => {
    const slug = params?.slug as string;

    try {
        const res = await client.query({
            query: GET_BRAND_DATA_BY_SLUG,
            variables: { id: slug, slug: [slug], after: null },
            fetchPolicy: 'no-cache'
        });

        const brandData = res.data.productBrand;
        const productsData = res.data.products;

        const products = productsData ? productsData.nodes : [];
        const pageInfo = productsData ? productsData.pageInfo : { hasNextPage: false, endCursor: null };
        const brandName = brandData ? brandData.name : slug;
        const subBrands = brandData?.children?.nodes || [];

        // Check if brand exists or has content, if strictly needed. 
        // But for now, if data returns, we render.

        return {
            props: {
                brandName: brandName as string,
                products,
                pageInfo,
                slug,
                subBrands,
            },
            revalidate: 60,
        };
    } catch (error) {
        console.error("Error fetching brand data:", error);
        return { notFound: true };
    }
};
