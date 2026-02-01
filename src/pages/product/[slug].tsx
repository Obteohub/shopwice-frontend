// Imports - Updated Layout
import { withRouter } from 'next/router';
import { useRouter } from 'next/router';

// Components
import SingleProduct from '@/components/Product/SingleProductFinal.component';
import Layout from '@/components/Layout/Layout.component';

// Utilities
import client from '@/utils/apollo/ApolloClient';

// Types
import type {
  NextPage,
  GetServerSideProps,
  InferGetServerSidePropsType,
} from 'next';

// GraphQL
import { GET_SINGLE_PRODUCT, FETCH_ALL_PRODUCTS_QUERY } from '@/utils/gql/GQL_QUERIES';
import { NextSeo, ProductJsonLd } from 'next-seo';

/**
 * Display a single product with dynamic pretty urls
 * @function product
 * @param {InferGetServerSidePropsType<typeof getServerSideProps>} products
 * @returns {JSX.Element} - Rendered component
 */
const product: NextPage = ({
  product,
  loading,
  networkStatus,
  isMobilePhone,
  isRefurbished
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const router = useRouter();
  const hasError = networkStatus === 8;
  // --- SEO Preparation ---
  // Safely extract data
  const name = product?.name || 'Product';
  const slug = product?.slug || '';
  const description = product?.shortDescription?.replace(/<[^>]+>/g, '') || product?.description?.replace(/<[^>]+>/g, '').substring(0, 160) || '';
  const mainImage = product?.image?.sourceUrl || '';
  const gallery = product?.galleryImages?.nodes?.map((img: { sourceUrl: string }) => img.sourceUrl) || [];
  const images = [mainImage, ...gallery].filter(Boolean).map(url => ({ url }));

  // RankMath SEO Data (Fallback to Product Data)
  const seo = product?.seo;
  const seoTitle = seo?.title || name;
  const seoDescription = seo?.description || description;

  // Price & Currency (Assuming simple product for base price, or low price for variable)
  // Converting 'GH₵100' -> 100
  const rawPrice = product?.price || product?.salePrice || product?.regularPrice || '0';
  const priceAmount = parseFloat(rawPrice.replace(/[^0-9.]/g, '')) || 0;
  const currency = 'GHS'; // Ghana Cedis

  // Stock
  const isInstock = product?.stockStatus !== 'OUT_OF_STOCK';
  const availability = isInstock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';

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
              images: images,
            }}
          />
          <ProductJsonLd
            productName={name}
            images={images.map(i => i.url)}
            description={description}
            brand="Shopwice" // Or product.productBrand if available
            // sku={product.sku} // Add to query if not present
            offers={[
              {
                price: priceAmount.toString(),
                priceCurrency: currency,
                itemCondition: 'https://schema.org/NewCondition', // Assuming new
                availability: availability,
                url: `https://shopwice.com/product/${slug}`,
                seller: {
                  name: 'Shopwice',
                },
              },
            ]}
            aggregateRating={
              reviewCount > 0
                ? {
                  ratingValue: ratingValue.toString(),
                  reviewCount: reviewCount.toString(),
                }
                : undefined
            }
          />
        </>
      )}

      <Layout title={`${product?.name ? product.name : ''}`} fullWidth>
        {product ? (
          <SingleProduct
            product={product}
            loading={loading}
            isMobilePhone={isMobilePhone}
            isRefurbished={isRefurbished}
          />
        ) : (
          <div className="mt-8 text-2xl text-center">Loading product...</div>
        )}
        {hasError && (
          <div className="mt-8 text-2xl text-center">
            Error loading product...
          </div>
        )}
      </Layout>
    </>
  );
};


export default withRouter(product);

export const getServerSideProps: GetServerSideProps = async ({ params, res }) => {
  try {
    // Cache control for Server Side Rendering (s-maxage=60, stale-while-revalidate=59)
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=59'
    );

    console.log('Fetching product for slug:', params?.slug);
    const { data, loading, networkStatus } = await client.query({
      query: GET_SINGLE_PRODUCT,
      variables: { slug: params?.slug },
      fetchPolicy: 'no-cache'
    });

    const product = data.product;

    if (!product) {
      return { notFound: true };
    }

    // Server-side calculation for stability
    const isMobilePhone = product.productCategories?.nodes?.some(
      (cat: any) =>
        (cat.name && cat.name.toLowerCase() === 'mobile phones') ||
        (cat.slug && cat.slug === 'mobile-phones')
    ) || false;

    // Permissive check for refurbished status
    const isRefurbished = product.attributes?.nodes?.some((attr: any) =>
      attr.options?.some((opt: any) =>
        String(opt).toLowerCase().includes('refurbish')
      )
    ) || false;

    console.log(`[SSR] Product: ${product.name}`);
    console.log(`[SSR] Attributes:`, JSON.stringify(product.attributes?.nodes || [], null, 2));
    console.log(`[SSR] isMobilePhone: ${isMobilePhone}, isRefurbished: ${isRefurbished}`);

    return {
      props: {
        product,
        loading,
        networkStatus,
        isMobilePhone,
        isRefurbished
      },
    };
  } catch (error) {
    console.error(error);
    return { notFound: true };
  }
};
