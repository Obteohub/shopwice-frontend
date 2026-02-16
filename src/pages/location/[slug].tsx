import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TaxonomyListingPage from '@/components/Product/TaxonomyListingPage.component';

import client from '@/utils/apollo/ApolloClient';

import { GET_LOCATION_DATA_BY_SLUG, GET_LOCATION_DATA_BY_SLUG_WITH_ATTRIBUTE } from '@/utils/gql/LOCATION_QUERIES';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';

export const config = {
  runtime: 'experimental-edge',
};

/**
 * Display location page with filtering, sorting, and infinite scroll
 */
const LocationPage = ({
    locationName,
    products,
    pageInfo,
    slug,
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

    return (
        <TaxonomyListingPage
            title={locationName || 'Location'}
            products={products}
            pageInfo={pageInfo}
            slug={slug}
            query={hasAttrFilter ? GET_LOCATION_DATA_BY_SLUG_WITH_ATTRIBUTE : GET_LOCATION_DATA_BY_SLUG}
            queryVariables={hasAttrFilter
                ? { slug, attrTax, attrTerm: [term] }
                : { slug }}
            emptyMessage="No products found for this location"
            fetchAllForSort={true}
            loading={loading}
        />
    );
};


export default LocationPage;

export const getServerSideProps: GetServerSideProps = async ({
    query: { slug, attr, term },
}) => {
    const attrTaxonomyMap: Record<string, string> = {
        pa_condition: 'PA_CONDITION',
    };
    const attrTax = typeof attr === 'string' ? attrTaxonomyMap[attr.toLowerCase()] : undefined;
    const hasAttrFilter = Boolean(attrTax && term);

    const res = await client.query({
        query: hasAttrFilter ? GET_LOCATION_DATA_BY_SLUG_WITH_ATTRIBUTE : GET_LOCATION_DATA_BY_SLUG,
        variables: hasAttrFilter
            ? { slug: slug, attrTax, attrTerm: [term], after: null }
            : { slug: slug, after: null },
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
            attr: typeof attr === 'string' ? attr : '',
            term: typeof term === 'string' ? term : '',
        },
    };
};
