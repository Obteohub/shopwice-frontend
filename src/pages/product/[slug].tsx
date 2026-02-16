// Imports - Updated Layout

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
import { GET_SINGLE_PRODUCT } from '@/utils/gql/GQL_QUERIES';
import { NextSeo, ProductJsonLd } from 'next-seo';

/**
 * Display a single product with dynamic pretty urls
 * @function product
 * @param {InferGetServerSidePropsType<typeof getServerSideProps>} products
 * @returns {JSX.Element} - Rendered component
 */
const ProductPage: NextPage = ({
  product,
  loading,
  networkStatus,
  isRefurbished
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
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
  const priceStr = String(product?.price || product?.salePrice || product?.regularPrice || '0');
  const priceAmount = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
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


export default ProductPage;

export const getServerSideProps: GetServerSideProps = async ({ params, res }) => {
  try {
    // Cache control for Server Side Rendering (s-maxage=60, stale-while-revalidate=59)

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=59'
    );

    const slug = params?.slug as string;
    console.log('Fetching product for slug:', slug);

    let product = null;
    let loading = true;
    let networkStatus;

    // Search for product and filter by exact slug match
    try {
      const result = await client.query({
        query: GET_SINGLE_PRODUCT,
        variables: { slug },
        fetchPolicy: 'no-cache'
      });

      // Get nodes from search results
      const nodes = result.data?.products?.nodes || [];

      // Find exact slug match (case-insensitive for better compatibility)
      product = nodes.find((node: any) =>
        node?.slug?.toLowerCase() === slug.toLowerCase()
      ) || null;

      // If no exact match but we have results, log for debugging
      if (!product && nodes.length > 0) {
        console.log(`[SSR] Search returned ${nodes.length} products but none matched slug exactly`);
        console.log(`[SSR] Looking for: "${slug}", found: ${nodes.map((n: any) => n.slug).join(', ')}`);
      }

      loading = result.loading;
      networkStatus = result.networkStatus;

      console.log(`[SSR] Search result for ${slug}:`, product ? 'Found' : 'Not Found');
    } catch (e) {
      console.error(`[SSR] Product lookup failed for ${slug}`, e);
    }

    console.log(`[SSR] Final product result for ${slug}:`, product ? 'Found' : 'Not Found');

    if (!product) {
      console.log(`[SSR] 404 Triggered for product: ${params?.slug}. Product is null.`);
      return { notFound: true };
    }

    // Server-side calculation for stability
    // Enhanced Refurbished Check: Attributes OR Category
    const isRefurbished =
      product.attributes?.nodes?.some((attr: any) =>
        attr.options?.some((opt: any) =>
          String(opt).toLowerCase().includes('refurbish')
        )
      ) ||
      product.productCategories?.nodes?.some((cat: any) =>
        (cat.name && cat.name.toLowerCase().includes('refurbish')) ||
        (cat.slug && cat.slug.toLowerCase().includes('refurbish'))
      ) ||
      false;

    console.log(`[SSR] Product: ${product.name}`);
    console.log(`[SSR] Type: ${product.__typename}`);
    if (product.variations) {
      console.log(`[SSR] Variations found: ${product.variations.nodes?.length || 0}`);
    } else {
      console.log(`[SSR] No variations field on product object`);
    }
    console.log(`[SSR] isRefurbished: ${isRefurbished}`);

    return {
      props: {
        product,
        loading,
        networkStatus,
        isRefurbished
      },
    };
  } catch (error) {
    console.error(error);
    return { notFound: true };
  }
};
