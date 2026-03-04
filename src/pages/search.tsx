import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import Layout from '@/components/Layout/Layout.component';
import ProductCard from '@/components/Product/ProductCard.component';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner.component';
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';
import { firstValidImageUrl } from '@/utils/image';

interface SearchPageProps {
  items: any[];
  searchTerm: string;
  page: number;
  perPage: number;
  total: number;
  error?: string | null;
}

const coerceInt = (value: unknown, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

const normalizeSearchItems = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.data?.items)) return payload.data.items;
    if (Array.isArray(payload.results)) return payload.results;
    if (Array.isArray(payload.data?.results)) return payload.data.results;
    if (Array.isArray(payload.products)) return payload.products;
    if (Array.isArray(payload.data?.products)) return payload.data.products;
  }
  return [];
};

const extractSlugFromUrl = (value: unknown) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const withoutQuery = raw.split('?')[0];
  const clean = withoutQuery.replace(/^https?:\/\/[^/]+/i, '').split('/').filter(Boolean);
  const productIndex = clean.findIndex((entry) => entry.toLowerCase() === 'product');
  if (productIndex >= 0 && clean[productIndex + 1]) return clean[productIndex + 1];
  return clean[clean.length - 1] || '';
};

const mapSearchItemToCard = (item: any) => {
  const source = item?.product && typeof item.product === 'object' ? item.product : item;
  const url = String(
    source?.url || source?.href || source?.link || source?.permalink || source?.productUrl || '',
  ).trim();
  const slug = String(source?.slug || '').trim() || extractSlugFromUrl(url);
  const imageSource = firstValidImageUrl(
    source?.image?.src,
    source?.image?.sourceUrl,
    source?.image?.url,
    source?.images?.[0]?.src,
    source?.images?.[0]?.sourceUrl,
    source?.images?.[0]?.url,
  );

  return {
    id: source?.id ?? source?.variationId ?? source?.productId,
    name: source?.title || source?.name || 'Product',
    slug,
    url: url || (slug ? `/product/${slug}/` : ''),
    type: source?.type || 'product',
    variantLabel: source?.variantLabel || source?.variant_label || '',
    price: source?.price,
    regularPrice: source?.regularPrice ?? source?.regular_price ?? '',
    salePrice: source?.salePrice ?? source?.sale_price ?? '',
    onSale: Boolean(source?.onSale ?? source?.on_sale),
    image: imageSource ? { sourceUrl: imageSource } : null,
    averageRating: Number(source?.averageRating ?? source?.average_rating ?? 0),
    reviewCount: Number(source?.reviewCount ?? source?.rating_count ?? 0),
  };
};

const SearchPage = ({ items, searchTerm, page, perPage, total, error }: SearchPageProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / perPage)), [total, perPage]);

  useEffect(() => {
    const handleStart = (url: string) => {
      if (url !== router.asPath) setLoading(true);
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

  const goToPage = (nextPage: number) => {
    const safePage = Math.max(1, Math.min(totalPages, nextPage));
    void router.push({ pathname: '/search', query: { ...router.query, page: String(safePage), perPage: String(perPage) } });
  };

  return (
    <Layout title={`Search: ${searchTerm}`} fullWidth={true}>
      <Head>
        <title>{`Search Results for "${searchTerm}" | Shopwice`}</title>
      </Head>
      <div className="pt-1 pb-6">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold mb-2">
            Search Results for <span className="text-orange-600">{`"${searchTerm}"`}</span>
          </h1>
          {!error && (
            <p className="text-sm text-gray-500">
              {total.toLocaleString()} results | Page {page} of {totalPages}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <LoadingSpinner color="orange" size="lg" />
          </div>
        ) : (
          <div className="container mx-auto px-4">
            {error && <div className="text-center py-10"><p className="text-red-500">Search temporarily unavailable</p></div>}
            {!error && items.length === 0 && searchTerm && (
              <div className="text-center py-10">
                <p className="text-gray-600 text-lg">{`No products found matching "${searchTerm}"`}</p>
              </div>
            )}
            {!error && items.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-2 gap-y-4 md:gap-x-3 md:gap-y-6">
                  {items.map((item: any, index: number) => {
                    const card = mapSearchItemToCard(item);
                    if (!card.url && !card.slug) return null;
                    return (
                      <ProductCard
                        key={String(card.id ?? `${card.slug}-${index}`)}
                        id={card.id}
                        name={card.name}
                        slug={card.slug}
                        url={card.url}
                        type={card.type}
                        variantLabel={card.variantLabel}
                        price={card.price}
                        regularPrice={card.regularPrice}
                        salePrice={card.salePrice}
                        onSale={card.onSale}
                        image={card.image}
                        averageRating={card.averageRating}
                        reviewCount={card.reviewCount}
                      />
                    );
                  })}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button onClick={() => goToPage(page - 1)} disabled={page <= 1} className="px-3 py-2 rounded border text-sm">Prev</button>
                    <span className="text-sm text-gray-600 px-2">{page} / {totalPages}</span>
                    <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages} className="px-3 py-2 rounded border text-sm">Next</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const searchTerm = String(context.query.q || '').trim();
  const page = coerceInt(context.query.page, 1);
  const perPage = Math.min(50, coerceInt(context.query.perPage, 20));

  if (!searchTerm) {
    return { props: { items: [], searchTerm: '', page: 1, perPage, total: 0, error: null } };
  }

  try {
    const payload: any = await api.get(ENDPOINTS.SEARCH, { params: { q: searchTerm, page, perPage } });
    const items = normalizeSearchItems(payload);
    const total = coerceInt(
      payload?.total ?? payload?.data?.total ?? payload?.pagination?.total ?? payload?.data?.pagination?.total ?? items.length,
      items.length,
    );
    return { props: { items, searchTerm, page, perPage, total, error: null } };
  } catch (error: any) {
    return { props: { items: [], searchTerm, page, perPage, total: 0, error: String(error?.message || 'Search temporarily unavailable') } };
  }
};

export default SearchPage;
