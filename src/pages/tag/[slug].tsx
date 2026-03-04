import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import SeoHead from '@/components/SeoHead';
import TaxonomyListingPage from '@/components/Product/TaxonomyListingPage.component';
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';
import {
  buildArchiveSeoData,
  getAbsoluteUrlFromRequest,
  parsePageParam,
} from '@/utils/seoPage';
import { buildTaxonomyBreadcrumbs } from '@/utils/taxonomyBreadcrumbs';
import { decodeHtmlEntities } from '@/utils/text';

type TagItem = {
  id?: number;
  databaseId?: number;
  name?: string;
  slug?: string;
  description?: string | null;
  count?: number;
};

const normalizeList = <T,>(payload: any): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) return payload.data as T[];
    if (Array.isArray(payload.results)) return payload.results as T[];
    if (Array.isArray(payload.items)) return payload.items as T[];
  }
  return [];
};

const TagPage = ({
  tagName,
  tagId,
  slug,
  products,
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
        title={decodeHtmlEntities(tagName || 'Tag')}
        products={products}
        slug={slug}
        queryParams={{ tag: tagId || slug }}
        description={decodeHtmlEntities(description || '')}
        emptyMessage="No products found for this tag"
        totalCount={totalCount}
        initialHasNextPage={initialHasNextPage}
        loading={loading}
        breadcrumbs={breadcrumbs}
      />
    </>
  );
};

export default TagPage;

export const getServerSideProps: GetServerSideProps = async ({
  params,
  query,
  req,
  res,
}) => {
  const slug = String(params?.slug || '').trim();
  const page = parsePageParam(query?.page);
  const attr = String(query?.attr || '').trim();
  const term = String(query?.term || '').trim();

  if (!slug) {
    return { notFound: true };
  }

  try {
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

    const productParams: Record<string, string | number> = {
      // Use slug directly; API accepts both slug and numeric ID.
      tag: slug,
      per_page: 24,
      page,
    };
    if (attr && term) {
      productParams[`attribute_${attr}`] = term;
    }

    // Phase 1: fetch all tags + products in parallel.
    const [tagsPayload, productsPayload] = await Promise.all([
      api.get<any>(ENDPOINTS.TAGS),
      api.get<any>(ENDPOINTS.PRODUCTS, { params: productParams }),
    ]);

    const tags = normalizeList<TagItem>(tagsPayload);
    const tag = tags.find((item) => String(item?.slug || '').toLowerCase() === slug.toLowerCase());

    if (!tag) {
      return { notFound: true };
    }

    const tagId = Number(tag?.databaseId || tag?.id || 0);
    const products = normalizeList<any>(productsPayload);
    const totalCount = Number(tag?.count || 0);
    const hasNextPage = totalCount > 0
      ? page * 24 < totalCount
      : products.length >= 24;

    const tagQuery = new URLSearchParams();
    if (page > 1) tagQuery.set('page', String(page));
    if (attr && term) {
      tagQuery.set('attr', attr);
      tagQuery.set('term', term);
    }
    const tagPath = `/tag/${slug}${tagQuery.toString() ? `?${tagQuery.toString()}` : ''}`;
    const pageUrl = getAbsoluteUrlFromRequest(req, tagPath);

    // Phase 2: breadcrumbs + SEO in parallel.
    const [breadcrumbs, seoData] = await Promise.all([
      buildTaxonomyBreadcrumbs({
        current: tag,
        initialTerms: tags,
        endpoint: ENDPOINTS.TAGS,
        basePath: '/tag',
      }),
      buildArchiveSeoData({
        pageUrl,
        title: decodeHtmlEntities(String(tag?.name || slug.replace(/-/g, ' '))),
        description: decodeHtmlEntities(String(tag?.description || '')),
        currentPage: page,
        hasNextPage,
        productCount: products.length,
      }),
    ]);

    return {
      props: {
        tagName: decodeHtmlEntities(tag.name || slug),
        tagId,
        slug,
        products,
        totalCount,
        initialHasNextPage: hasNextPage,
        description: decodeHtmlEntities(tag.description || ''),
        breadcrumbs,
        seoData,
      },
    };
  } catch (error) {
    console.error('[SSR] Tag page error:', error);
    const fallbackPath = `/tag/${slug}${page > 1 ? `?page=${page}` : ''}`;
    const pageUrl = getAbsoluteUrlFromRequest(req, fallbackPath);
    const seoData = await buildArchiveSeoData({
      pageUrl,
      title: slug.replace(/-/g, ' '),
      description: '',
      currentPage: page,
      hasNextPage: false,
      productCount: 0,
    });

    return {
      props: {
        tagName: slug,
        tagId: 0,
        slug,
        products: [],
        totalCount: 0,
        initialHasNextPage: false,
        description: '',
        breadcrumbs: [],
        seoData,
      },
    };
  }
};
