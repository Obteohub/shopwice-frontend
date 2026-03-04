import type { NextPage, GetServerSideProps, InferGetServerSidePropsType } from 'next';
import SingleProduct from '@/components/Product/SingleProductFinal.component';
import Layout from '@/components/Layout/Layout.component';
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';

type PageProps = InferGetServerSidePropsType<typeof getServerSideProps>;

const ProductPage: NextPage<PageProps> = ({ product, loading, networkStatus, isRefurbished }) => {
  const hasError = networkStatus === 8;

  return (
    <Layout title={product?.name ? product.name : ''} fullWidth>
      {product ? (
        <SingleProduct product={product} loading={loading} isRefurbished={isRefurbished} />
      ) : (
        <div className="mt-8 text-2xl text-center">Loading product...</div>
      )}

      {hasError && <div className="mt-8 text-2xl text-center">Error loading product...</div>}
    </Layout>
  );
};

export default ProductPage;

const normalizeProductsPayload = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (payload?.id || payload?.slug) return [payload];
    if (Array.isArray(payload.products)) return payload.products;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.results)) return payload.results;
    if (Array.isArray(payload.items)) return payload.items;
  }
  return [];
};

const normalizeSlugValue = (value: unknown) =>
  decodeURIComponent(String(value ?? '').trim())
    .split('/')
    .filter(Boolean)
    .pop()
    ?.toLowerCase() || '';

const matchBySlug = (products: any[], requestedSlug: string) => {
  const normalizedRequested = normalizeSlugValue(requestedSlug);
  return (
    products.find(
      (node: any) => normalizeSlugValue(node?.slug) === normalizedRequested,
    ) || null
  );
};

export const getServerSideProps: GetServerSideProps = async ({ params, res }) => {
  try {
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=59');
    const slug = normalizeSlugValue(params?.slug);
    if (!slug) return { notFound: true };

    let product: any = null;
    try {
      const payload = await api.get<any>(ENDPOINTS.PRODUCTS, {
        params: {
          slug,
          per_page: 10,
          page: 1,
          include_variations: true,
        },
      });
      product = matchBySlug(normalizeProductsPayload(payload), slug);
    } catch {
      product = null;
    }

    if (!product) {
      try {
        const directPayload = await api.get<any>(
          `${ENDPOINTS.PRODUCTS}/${encodeURIComponent(slug)}`,
          { params: { include_variations: true } },
        );
        product = matchBySlug(normalizeProductsPayload(directPayload), slug);
      } catch {
        product = null;
      }
    }

    if (!product) return { notFound: true };

    const attributes = Array.isArray(product?.attributes) ? product.attributes : [];
    const categories = Array.isArray(product?.categories) ? product.categories : [];
    const isRefurbished =
      attributes.some((attr: any) => {
        const options = Array.isArray(attr?.options) ? attr.options : [];
        return options.some((opt: any) => String(opt).toLowerCase().includes('refurbish'));
      }) ||
      categories.some((cat: any) => {
        const n = String(cat?.name || '').toLowerCase();
        const s = String(cat?.slug || '').toLowerCase();
        return n.includes('refurbish') || s.includes('refurbish');
      });

    return {
      props: {
        product,
        loading: false,
        networkStatus: 7,
        isRefurbished: Boolean(isRefurbished),
      },
    };
  } catch (error) {
    console.error('[SSR] Product page error:', error);
    return { notFound: true };
  }
};
