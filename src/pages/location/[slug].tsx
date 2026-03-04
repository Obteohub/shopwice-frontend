import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TaxonomyListingPage from '@/components/Product/TaxonomyListingPage.component';
import SeoHead from '@/components/SeoHead';
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import {
    buildArchiveSeoData,
    getAbsoluteUrlFromRequest,
    parsePageParam,
} from '@/utils/seoPage';
import { buildTaxonomyBreadcrumbs } from '@/utils/taxonomyBreadcrumbs';
import { decodeHtmlEntities } from '@/utils/text';

const normalizeList = <T,>(payload: any): T[] => {
    if (Array.isArray(payload)) return payload as T[];
    if (payload && typeof payload === 'object') {
        if (Array.isArray(payload.data)) return payload.data as T[];
        if (Array.isArray(payload.products)) return payload.products as T[];
        if (Array.isArray(payload.results)) return payload.results as T[];
        if (Array.isArray(payload.items)) return payload.items as T[];
    }
    return [];
};

/**
 * Display location page with filtering, sorting, and pagination.
 */
const LocationPage = ({
    locationName,
    products,
    slug,
    description,
    totalCount,
    initialHasNextPage,
    breadcrumbs,
    seoData,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const isQueryOnlyTransition = (nextUrl: string) => {
            const currentPath = String(router.asPath || '').split('?')[0];
            const nextPath = String(nextUrl || '').split('?')[0];
            return currentPath === nextPath;
        };
        const handleStart = (url: string, options?: { shallow?: boolean }) => {
            if (options?.shallow) return;
            if (isQueryOnlyTransition(url)) return;
            setLoading(true);
        };
        const handleComplete = (_url?: string, options?: { shallow?: boolean }) => {
            if (options?.shallow) return;
            setLoading(false);
        };
        const handleError = (_error: unknown, _url?: string, options?: { shallow?: boolean }) => {
            if (options?.shallow) return;
            setLoading(false);
        };

        router.events.on('routeChangeStart', handleStart);
        router.events.on('routeChangeComplete', handleComplete);
        router.events.on('routeChangeError', handleError);

        return () => {
            router.events.off('routeChangeStart', handleStart);
            router.events.off('routeChangeComplete', handleComplete);
            router.events.off('routeChangeError', handleError);
        };
    }, [router]);

    return (
        <>
            <SeoHead seoData={seoData} />
            <TaxonomyListingPage
                title={decodeHtmlEntities(locationName || 'Location')}
                products={products}
                slug={slug}
                queryParams={{ location: slug }}
                description={decodeHtmlEntities(description || '')}
                emptyMessage="No products found for this location"
                totalCount={totalCount}
                initialHasNextPage={initialHasNextPage}
                loading={loading}
                breadcrumbs={breadcrumbs}
            />
        </>
    );
};

export default LocationPage;

export const getServerSideProps: GetServerSideProps = async ({
    params,
    query,
    res,
    req,
}) => {
    const slug = params?.slug as string;
    const attr = (query?.attr as string | undefined) || '';
    const term = (query?.term as string | undefined) || '';
    const page = parsePageParam(query?.page);

    if (!slug) return { notFound: true };

    try {
        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

        const productParams: any = {
            location: slug,
            per_page: 24,
            page,
        };
        if (attr && term) {
            productParams[`attribute_${attr}`] = term;
        }

        // Phase 1: fetch all locations + products in parallel.
        const [allLocationsRaw, productsRaw] = await Promise.all([
            api.get(ENDPOINTS.LOCATIONS),
            api.get(ENDPOINTS.PRODUCTS, { params: productParams }),
        ]);

        const allLocations: any[] = normalizeList<any>(allLocationsRaw);
        const normalizedSlug = slug.toLowerCase();
        const location = allLocations.find((l: any) => l.slug?.toLowerCase() === normalizedSlug);

        if (!location) {
            return { notFound: true };
        }

        const products: any[] = normalizeList<any>(productsRaw);
        const totalCount = Number(location?.count || 0);
        const hasNextPage = totalCount > 0
            ? page * 24 < totalCount
            : products.length >= 24;

        const locationQuery = new URLSearchParams();
        if (page > 1) locationQuery.set('page', String(page));
        if (attr && term) {
            locationQuery.set('attr', attr);
            locationQuery.set('term', term);
        }
        const locationPath = `/location/${slug}${locationQuery.toString() ? `?${locationQuery.toString()}` : ''}`;
        const pageUrl = getAbsoluteUrlFromRequest(req, locationPath);

        // Phase 2: breadcrumbs + SEO in parallel.
        const [breadcrumbs, seoData] = await Promise.all([
            buildTaxonomyBreadcrumbs({
                current: location,
                initialTerms: allLocations,
                endpoint: ENDPOINTS.LOCATIONS,
                basePath: '/location',
            }),
            buildArchiveSeoData({
                pageUrl,
                title: decodeHtmlEntities(location.name || 'Location'),
                description: decodeHtmlEntities(location.description || ''),
                currentPage: page,
                hasNextPage,
                productCount: products.length,
            }),
        ]);

        return {
            props: {
                locationName: decodeHtmlEntities(location.name),
                products: products || [],
                totalCount,
                initialHasNextPage: hasNextPage,
                slug,
                breadcrumbs,
                description: decodeHtmlEntities(location.description || ''),
                seoData,
            },
        };
    } catch (error) {
        console.error('Error fetching location data:', error);
        return { notFound: true };
    }
};
