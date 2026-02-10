import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TaxonomyListingPage from '@/components/Product/TaxonomyListingPage.component';

import client from '@/utils/apollo/ApolloClient';

import { GET_BRAND_DATA_BY_SLUG, GET_BRAND_DATA_BY_SLUG_WITH_ATTRIBUTE } from '@/utils/gql/TAXONOMY_QUERIES';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';

import Link from 'next/link';

/**
 * Display brand page with filtering, sorting, and infinite scroll
 */
const BrandPage = ({
    brandName,
    products,
    pageInfo,
    slug,
    subBrands,
    attr,
    term,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
    const attrTaxonomyMap: Record<string, string> = {
        pa_condition: 'PA_CONDITION',
    };
    const attrTax = attr ? attrTaxonomyMap[attr.toLowerCase()] : undefined;
    const hasAttrFilter = Boolean(attrTax && term);

    const router = useRouter();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handleStart = (url: string) => {
            if (url !== router.asPath) {
                setLoading(true);
            }
        };
        const handleComplete = () => setLoading(false);

        router.events.on('routeChangeStart', handleStart);
        router.events.on('routeChangeComplete', handleComplete);
        router.events.on('routeChangeError', handleComplete);

        return () => {
            router.events.off('routeChangeStart', handleStart);
            router.events.off('routeChangeComplete', handleComplete);
            router.events.off('routeChangeError', handleComplete);
        };
    }, [router]);

    const subBrandSlot = subBrands && subBrands.length > 0 ? (
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
    ) : null;

    return (
        <TaxonomyListingPage
            title={brandName || 'Brand'}
            products={products}
            pageInfo={pageInfo}
            slug={slug}
            query={hasAttrFilter ? GET_BRAND_DATA_BY_SLUG_WITH_ATTRIBUTE : GET_BRAND_DATA_BY_SLUG}
            queryVariables={hasAttrFilter
                ? { id: slug, slug: [slug], attrTax, attrTerm: [term] }
                : { id: slug, slug: [slug] }}
            emptyMessage="No products found for this brand"
            topSlot={subBrandSlot}
            fetchAllForSort={true}
            loading={loading}
        />
    );
};

export default BrandPage;

export const getServerSideProps: GetServerSideProps = async ({ params, query }) => {
    const slug = params?.slug as string;
    const attr = (query?.attr as string | undefined) || '';
    const term = (query?.term as string | undefined) || '';

    const attrTaxonomyMap: Record<string, string> = {
        pa_condition: 'PA_CONDITION',
    };

    const attrTax = attrTaxonomyMap[attr.toLowerCase()];
    const hasAttrFilter = Boolean(attrTax && term);

    try {
        const res = await client.query({
            query: hasAttrFilter ? GET_BRAND_DATA_BY_SLUG_WITH_ATTRIBUTE : GET_BRAND_DATA_BY_SLUG,
            variables: hasAttrFilter
                ? { id: slug, slug: [slug], attrTax, attrTerm: [term], after: null }
                : { id: slug, slug: [slug], after: null },
            fetchPolicy: 'network-only'
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
                attr,
                term,
            },
        };
    } catch (error) {
        console.error("Error fetching brand data:", error);
        return { notFound: true };
    }
};
