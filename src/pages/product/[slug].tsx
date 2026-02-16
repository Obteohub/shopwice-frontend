// pages/product/[slug].tsx

// Components
import SingleProduct from '@/components/Product/SingleProductFinal.component';
import Layout from '@/components/Layout/Layout.component';

// Utilities
import client from '@/utils/apollo/ApolloClient';

// Types
import type { NextPage, GetServerSideProps, InferGetServerSidePropsType } from 'next';

// GraphQL
import { GET_SINGLE_PRODUCT } from '@/utils/gql/GQL_QUERIES';
import { NextSeo, ProductJsonLd } from 'next-seo';

/**
 * Display a single product with dynamic pretty urls (Pages Router + SSR)
 */

type PageProps = InferGetServerSidePropsType<typeof getServerSideProps>;

const ProductPage: NextPage<PageProps> = ({
  product,
  loading,
  networkStatus,
  isRefurbished,
}) => {
  const hasError = networkStatus === 8;

  // --- SEO Preparation ---
  const name = product?.name || 'Product';
  const slug = product?.slug || '';

  const clean = (html?: string) => (html ? html.replace(/<[^>]+>/g, '').trim() : '');

  const description =
    clean(product?.shortDescription) ||
    clean(product?.description).slice(0, 160) ||
    '';

  const mainImage = product?.image?.sourceUrl || '';
  const gallery =
    product?.galleryImages?.nodes?.map((img: { sourceUrl: string }) => img.sourceUrl) || [];

  const imageUrls = [mainImage, ...gallery].filter(Boolean) as string[];
  const ogImages = imageUrls.map((url) => ({ url }));

  // RankMath SEO Data (Fallback to Product Data)
  const seo = product?.seo;
  const seoTitle = seo?.title || name;
  const seoDescription = seo?.description || description;

  // Price & Currency
  // Handles: "GH₵1,200.00", "₵1200", "1200"
  const priceStr = String(product?.price || product?.salePrice || product?.regularPrice || '0');
  const priceAmount =
    Number(priceStr.replace(/[^0-9.,]/g, '').replace(/,/g, '')) || 0;

  const currency = 'GHS'; // Ghana Cedis

  // Stock
  const isInstock = product?.stockStatus !== 'OUT_OF_STOCK';
  const availability = isInstock
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';

  // Ratings
  const ratingValue = product?.averageRating || 0;
  const reviewCount = product?.reviewCount || 0;

  return (
    <>
      {product && (
        <>
          <NextSeo
            title={seoTitle}
            description={seoDescription}
            canonical={`https://shopwice.com/product/${slug}`}
            openGraph={{
              type: 'product',
              url: `https://shopwice.com/product/${slug}`,
              title: seoTitle,
              description: seoDescription,
              images: ogImages,
            }}
          />

          <ProductJsonLd
            productName={name}
            images={imageUrls}
            description={description}
            brand="Shopwice"
            offers={[
              {
                price: priceAmount.toString(),
                priceCurrency: currency,
                itemCondition: 'https://schema.org/NewCondition',
                availability,
                url: `https://shopwice.com/product/${slug}`,
                seller: { name: 'Shopwice' },
              },
            ]}
            aggregateRating={
              reviewCount > 0
                ? {
                  ratingValue: String(ratingValue),
                  reviewCount: String(reviewCount),
                }
                : undefined
            }
          />
        </>
      )}

      <Layout title={product?.name ? product.name : ''} fullWidth>
        {product ? (
          <SingleProduct
            product={product}
            loading={loading}
            isRefurbished={isRefurbished}
          />
        ) : (
          <div className="mt-8 text-2xl text-center">Loading product...</div>
        )}

        {hasError && (
          <div className="mt-8 text-2xl text-center">Error loading product...</div>
        )}
      </Layout>
    </>
  );
};

export default ProductPage;

export const getServerSideProps: GetServerSideProps = async ({ params, res }) => {
  try {
    // ✅ Pages Router SSR runs on Node.js runtime.
    // ✅ Edge runtime config must NOT be used with getServerSideProps.

    // CDN caching for SSR HTML (works on Vercel/most CDNs when deployed properly)
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=59');

    const slug = String(params?.slug || '').trim();
    if (!slug) return { notFound: true };

    const result = await client.query({
      query: GET_SINGLE_PRODUCT,
      variables: { slug },
      fetchPolicy: 'no-cache',
    });

    const nodes = result.data?.products?.nodes || [];

    // Find exact slug match (case-insensitive)
    const product =
      nodes.find((node: any) => node?.slug?.toLowerCase() === slug.toLowerCase()) || null;

    if (!product) {
      return { notFound: true };
    }

    // Enhanced Refurbished Check: Attributes OR Category
    const isRefurbished =
      product.attributes?.nodes?.some((attr: any) =>
        attr.options?.some((opt: any) => String(opt).toLowerCase().includes('refurbish'))
      ) ||
      product.productCategories?.nodes?.some((cat: any) => {
        const n = String(cat?.name || '').toLowerCase();
        const s = String(cat?.slug || '').toLowerCase();
        return n.includes('refurbish') || s.includes('refurbish');
      }) ||
      false;

    return {
      props: {
        product,
        loading: Boolean(result.loading),
        networkStatus: typeof result.networkStatus === 'number' ? result.networkStatus : 7,
        isRefurbished,
      },
    };
  } catch (error) {
    console.error('[SSR] Product page error:', error);
    return { notFound: true };
  }
};
