import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TaxonomyListingPage from '@/components/Product/TaxonomyListingPage.component';
import SeoHead from '@/components/SeoHead';
import { normalizeCollectionDataPayload } from '@/features/collection/apiClient';
import { api } from '@/utils/api';
import { applyCachePolicy } from '@/utils/cacheControl';
import { ENDPOINTS } from '@/utils/endpoints';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Link from 'next/link';
import {
    buildArchiveSeoData,
    getAbsoluteUrlFromRequest,
    parsePageParam,
} from '@/utils/seoPage';
import { getRequestPathname, loggedNotFound } from '@/utils/routeEventLogger';
import { buildTaxonomyBreadcrumbs } from '@/utils/taxonomyBreadcrumbs';
import { decodeHtmlEntities } from '@/utils/text';

/**
 * Display brand page with filtering, sorting, and pagination.
 */
const normalizeList = <T,>(payload: any): T[] => {
    if (Array.isArray(payload)) return payload as T[];
    if (payload && typeof payload === 'object') {
        if (Array.isArray(payload.data)) return payload.data as T[];
        if (Array.isArray(payload.products)) return payload.products as T[];
        if (Array.isArray(payload.results)) return payload.results as T[];
    }
    return [];
};

const BrandPage = ({
    brandName,
    brandId,
    products,
    slug,
    subBrands,
    description,
    breadcrumbs,
    totalCount,
    initialHasNextPage,
    initialFacets,
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

    const subBrandSlot = subBrands && subBrands.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-4">
            {subBrands.map((subBrand: any) => (
                <Link
                    key={subBrand.id}
                    href={`/brand/${subBrand.slug}`}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-[#2c3338] text-sm font-medium rounded-full transition-colors border border-gray-200 capitalize"
                >
                    {decodeHtmlEntities(String(subBrand.name || '')).toLowerCase()}
                </Link>
            ))}
        </div>
    ) : null;

    return (
        <>
            <SeoHead seoData={seoData} />
            <TaxonomyListingPage
                title={decodeHtmlEntities(brandName || 'Brand')}
                products={products}
                slug={slug}
                queryParams={{ brand: brandId || slug }}
                customRouteScope={{ taxonomy: 'brand', value: String(brandId || slug) }}
                description={decodeHtmlEntities(description || '')}
                emptyMessage="No products found for this brand"
                topSlot={subBrandSlot}
                totalCount={totalCount}
                initialHasNextPage={initialHasNextPage}
                initialFacets={initialFacets}
                loading={loading}
                breadcrumbs={breadcrumbs}
            />
        </>
    );
};

export default BrandPage;

export const getServerSideProps: GetServerSideProps = async ({ params, query, res, req }) => {
    const slug = params?.slug as string;
    const attr = (query?.attr as string | undefined) || '';
    const term = (query?.term as string | undefined) || '';
    const page = parsePageParam(query?.page);
    const requestPath = getRequestPathname(req, `/brand/${slug || ''}`);

    if (!slug) {
        return loggedNotFound({
            req,
            pathname: requestPath,
            matchedRoute: '/brand/[slug]',
            reason: 'Missing brand slug',
        });
    }

    try {
        applyCachePolicy(res, 'archivePage');

        const productParams: any = {
            // Use slug directly; API accepts both slug and numeric ID.
            brand: slug,
            per_page: 24,
            page,
        };
        if (attr && term) {
            productParams[`attribute_${attr}`] = term;
        }

        // Phase 1: fetch all brands + products + facets in parallel.
        const [allBrandsRaw, productsRaw, collectionDataRaw] = await Promise.all([
            api.get(ENDPOINTS.BRANDS),
            api.get(ENDPOINTS.PRODUCTS, { params: productParams, skipReviewEnrich: true }),
            api.get(ENDPOINTS.COLLECTION_DATA, {
                params: { brand: slug },
            }).catch(() => null),
        ]);

        const allBrands: any[] = normalizeList<any>(allBrandsRaw);
        const normalizedSlug = slug.toLowerCase();
        const brand = allBrands.find((b: any) => b.slug?.toLowerCase() === normalizedSlug);

        if (!brand) {
            return loggedNotFound({
                req,
                pathname: requestPath,
                matchedRoute: '/brand/[slug]',
                reason: 'Brand not found in taxonomy payload',
            });
        }

        const brandId = Number(brand.databaseId || brand.id || 0);
        const subBrands = allBrands.filter((b: any) => Number(b.parent) === brandId);
        const products: any[] = normalizeList<any>(productsRaw);
        const initialFacets = collectionDataRaw
            ? normalizeCollectionDataPayload(collectionDataRaw)
            : [];
        const totalCount = Number(brand?.count || 0);
        const hasNextPage = totalCount > 0
            ? page * 24 < totalCount
            : products.length >= 24;

        const brandQuery = new URLSearchParams();
        if (page > 1) brandQuery.set('page', String(page));
        if (attr && term) {
            brandQuery.set('attr', attr);
            brandQuery.set('term', term);
        }
        const brandPath = `/brand/${slug}${brandQuery.toString() ? `?${brandQuery.toString()}` : ''}`;
        const pageUrl = getAbsoluteUrlFromRequest(req, brandPath);

        // Phase 2: breadcrumbs + SEO in parallel.
        const [breadcrumbs, seoData] = await Promise.all([
            buildTaxonomyBreadcrumbs({
                current: brand,
                initialTerms: allBrands,
                endpoint: ENDPOINTS.BRANDS,
                basePath: '/brand',
            }),
            buildArchiveSeoData({
                pageUrl,
                title: decodeHtmlEntities(brand.name || 'Brand'),
                description: decodeHtmlEntities(brand.description || ''),
                currentPage: page,
                hasNextPage,
                productCount: products.length,
            }),
        ]);

        return {
            props: {
                brandName: decodeHtmlEntities(brand.name),
                brandId,
                products: products || [],
                initialFacets,
                totalCount,
                initialHasNextPage: hasNextPage,
                slug,
                subBrands,
                attr,
                term,
                description: decodeHtmlEntities(brand.description || ''),
                breadcrumbs,
                seoData,
            },
        };
    } catch (error) {
        console.error('Error fetching brand data:', error);
        return loggedNotFound({
            req,
            pathname: requestPath,
            matchedRoute: '/brand/[slug]',
            reason: 'Unhandled brand SSR error',
        });
    }
};
