import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import CategoryFeatureBlock from '@/components/Index/CategoryFeatureBlock.component';
import ContinueShopping from '@/components/Index/ContinueShopping.component';

import Hero from '@/components/Index/Hero.component';
import FeaturedCategories from '@/components/Index/FeaturedCategories.component';
import CategoryDiscoveryGrid from '@/components/Index/CategoryDiscoveryGrid.component';
import SEOContent from '@/components/Index/SEOContent.component';
import Layout from '@/components/Layout/Layout.component';
import SeoHead from '@/components/SeoHead';

// Utilities
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';
import { parseSeoHead } from '@/utils/parseSeoHead';
import { buildFrontendUrl, getDefaultOgImage, getRankMathSEO, getSiteName } from '@/utils/seo';
import { useGlobalStore } from '@/stores/globalStore';

// Types
import type { NextPage, GetStaticProps, InferGetStaticPropsType } from 'next';
import type { Product } from '@/types/product';

type CategoryNode = {
  id?: number | string;
  databaseId?: number | string;
  slug?: string;
};

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

const toNumericId = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeSlug = (value: unknown) => String(value || '').trim().toLowerCase();

const productMatchesExactCategory = (
  product: any,
  allowedIds: number[],
  allowedSlugs: string[],
) => {
  const categories = Array.isArray(product?.categories)
    ? product.categories
    : (Array.isArray(product?.productCategories) ? product.productCategories : []);
  if (!Array.isArray(categories) || categories.length === 0) return false;

  return categories.some((cat: any) => {
    const catId = toNumericId(cat?.id ?? cat?.databaseId);
    const catSlug = normalizeSlug(cat?.slug);
    if (catId !== null && allowedIds.includes(catId)) return true;
    if (catSlug && allowedSlugs.includes(catSlug)) return true;
    return false;
  });
};

const resolveCategory = (
  categories: CategoryNode[],
  slugCandidates: string[],
) => {
  const normalized = slugCandidates.map((slug) => normalizeSlug(slug)).filter(Boolean);
  for (const slug of normalized) {
    const found = categories.find((entry) => normalizeSlug(entry?.slug) === slug);
    if (found) {
      const id = toNumericId(found?.id ?? found?.databaseId);
      return { id, slug };
    }
  }
  return { id: null, slug: normalized[0] || '' };
};

const fetchExactCategoryProducts = async ({
  categories,
  slugCandidates,
  perPage,
}: {
  categories: CategoryNode[];
  slugCandidates: string[];
  perPage: number;
}): Promise<Product[]> => {
  const target = resolveCategory(categories, slugCandidates);
  const categoryParam = target.id ?? target.slug;
  if (!categoryParam) return [];

  const payload = await api.get<any>(ENDPOINTS.PRODUCTS, {
    params: {
      category: categoryParam,
      per_page: perPage,
      page: 1,
    },
  });

  const products = normalizeList<Product>(payload);
  if (!products.length) return [];

  const allowedIds = target.id !== null ? [target.id] : [];
  const allowedSlugs = Array.from(new Set([target.slug, ...slugCandidates.map((slug) => normalizeSlug(slug))].filter(Boolean)));
  const exact = products.filter((product) => productMatchesExactCategory(product, allowedIds, allowedSlugs));

  return (exact.length > 0 ? exact : products).slice(0, perPage);
};

const HOME_SECTION_LIMIT = 6;
const HOME_CAROUSEL_LIMIT = 12;
const TRENDING_ICON = String.fromCodePoint(0x1F4C8);
const BEST_SELLER_ICON = String.fromCodePoint(0x1F525);
const BUDGET_ICON = String.fromCodePoint(0x1F49A);
const HOMEPAGE_PATH = '/';

const buildHomepageFallbackSeoData = () => {
  const siteName = getSiteName();
  const canonical = buildFrontendUrl(HOMEPAGE_PATH);
  const title = `Shop Online In Ghana | ${siteName}`;
  const metaDescription =
    'Shop phones, laptops, appliances, fashion, and more on Shopwice Ghana. Compare prices and buy online with delivery across Ghana.';
  const ogImage = getDefaultOgImage() || null;

  return {
    title,
    metaDescription,
    canonical,
    robots: 'index, follow',
    ogTitle: title,
    ogDescription: metaDescription,
    ogImage,
    ogUrl: canonical,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: metaDescription,
    twitterImage: ogImage,
    jsonLd: canonical
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: siteName,
            url: canonical,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: siteName,
            url: canonical,
            potentialAction: {
              '@type': 'SearchAction',
              target: `${canonical.replace(/\/$/, '')}/search?q={search_term_string}`,
              'query-input': 'required name=search_term_string',
            },
          },
        ]
      : [],
  };
};

const buildHomepageSeoData = async () => {
  const fallbackSeoData = buildHomepageFallbackSeoData();

  try {
    const rankMathHead = await getRankMathSEO(fallbackSeoData.canonical || HOMEPAGE_PATH);
    const parsedSeo = await parseSeoHead(rankMathHead);

    const title = parsedSeo?.title || fallbackSeoData.title;
    const metaDescription =
      parsedSeo?.metaDescription ||
      parsedSeo?.ogDescription ||
      parsedSeo?.twitterDescription ||
      fallbackSeoData.metaDescription;
    const ogImage = parsedSeo?.ogImage || fallbackSeoData.ogImage;

    return {
      ...fallbackSeoData,
      ...parsedSeo,
      title,
      metaDescription,
      canonical: fallbackSeoData.canonical,
      robots: parsedSeo?.robots || fallbackSeoData.robots,
      ogTitle: parsedSeo?.ogTitle || title,
      ogDescription: parsedSeo?.ogDescription || metaDescription,
      ogImage,
      ogUrl: fallbackSeoData.canonical,
      ogType: parsedSeo?.ogType || fallbackSeoData.ogType,
      twitterCard: parsedSeo?.twitterCard || fallbackSeoData.twitterCard,
      twitterTitle: parsedSeo?.twitterTitle || parsedSeo?.ogTitle || title,
      twitterDescription:
        parsedSeo?.twitterDescription ||
        parsedSeo?.ogDescription ||
        metaDescription,
      twitterImage: parsedSeo?.twitterImage || ogImage,
      jsonLd:
        Array.isArray(parsedSeo?.jsonLd) && parsedSeo.jsonLd.length > 0
          ? parsedSeo.jsonLd
          : fallbackSeoData.jsonLd,
    };
  } catch {
    return fallbackSeoData;
  }
};

const getSoldMetric = (product: any): number =>
  Number(
    product?.unitsSold ??
    product?.units_sold ??
    product?.quantity_sold ??
    product?.sold_count ??
    product?.soldCount ??
    product?.totalSales ??
    0
  );

const dedupeProducts = (list: Product[]): Product[] => {
  const seen = new Set<string>();
  return list.filter((product) => {
    const id = toNumericId((product as any)?.databaseId ?? (product as any)?.id);
    const slug = normalizeSlug((product as any)?.slug);
    const key = `${id ?? ''}:${slug}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const fetchAllMostSoldProducts = async (): Promise<Product[]> => {
  const perPage = 100;
  const firstPayload = await api.get<any>(ENDPOINTS.PRODUCTS_SOLD, {
    params: { per_page: perPage, page: 1 },
  });
  const firstPage = normalizeList<Product>(firstPayload);
  const total = Number(firstPayload?.total ?? firstPage.length);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages === 1) return dedupeProducts(firstPage);

  const pageFetches = Array.from({ length: totalPages - 1 }, (_, index) =>
    api
      .get<any>(ENDPOINTS.PRODUCTS_SOLD, {
        params: { per_page: perPage, page: index + 2 },
      })
      .catch(() => null)
  );
  const restPayloads = await Promise.all(pageFetches);
  const restPages = restPayloads.flatMap((payload) => normalizeList<Product>(payload));
  return dedupeProducts([...firstPage, ...restPages]);
};

const SectionSkeleton = () => (
  <div className="px-4 md:px-6 py-6">
    <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-4" aria-hidden="true" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-40 bg-gray-100 rounded animate-pulse" aria-hidden="true" />
      ))}
    </div>
  </div>
);

const TopRatedProducts = dynamic(() => import('@/components/Index/TopRatedProducts.component'), {
  loading: () => <SectionSkeleton />,
});
const MostSoldThisWeek = dynamic(() => import('@/components/Index/MostSoldThisWeek.component'), {
  loading: () => <SectionSkeleton />,
});
const BestSellingSlider = dynamic(() => import('@/components/Index/BestSellingSlider.component'), {
  loading: () => <SectionSkeleton />,
});
const WhyChooseUs = dynamic(() => import('@/components/Index/WhyChooseUs.component'), {
  loading: () => <SectionSkeleton />,
});
const PromoBoxes = dynamic(() => import('@/components/Index/PromoBoxes.component'), {
  loading: () => <SectionSkeleton />,
});
const TrustSignalsBar = dynamic(() => import('@/components/Index/TrustSignalsBar.component'), {
  loading: () => <SectionSkeleton />,
});
const TodaysDeals = dynamic(() => import('@/components/Index/TodaysDeals.component'), {
  loading: () => <SectionSkeleton />,
});
const DealSectionSlider = dynamic(() => import('@/components/Index/DealSectionSlider.component'), {
  loading: () => <SectionSkeleton />,
});
const InfoBanner = dynamic(() => import('@/components/Index/InfoBanner.component'), {
  loading: () => <SectionSkeleton />,
});
const Newsletter = dynamic(() => import('@/components/Index/Newsletter.component'), {
  loading: () => <SectionSkeleton />,
});
const RecentRefurbishedReviews = dynamic(
  () => import('@/components/Product/RecentRefurbishedReviews.component'),
  {
    loading: () => <SectionSkeleton />,
  }
);

/**
 * Main index page
 * @function Index
 * @returns {JSX.Element} - Rendered component
 */

const Index: NextPage = ({
  topRatedProducts: initialTopRated,
  bestSellingProducts: initialBestSelling,
  mostSoldProducts: initialMostSold,
  airConditionerProducts: initialAir,
  mobilePhonesOnSale: initialMobile,
  laptopsProducts: initialLaptops,
  speakersProducts: initialSpeakers,
  televisionsProducts: initialTelevisions,
  promoProduct: initialPromo,
  dealsProducts: initialDeals,
  trendingProducts: initialTrending,
  underFiveHundredProducts: initialUnderFiveHundred,
  seoData,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const setHomeData = useGlobalStore((state) => state.setHomeData);
  const homeData = useGlobalStore((state) => state.homeData);
  const hasHydrated = useGlobalStore((state) => state.hasHydrated);

  // If props are empty (build error), fallback to cached data from store
  const topRatedProducts = initialTopRated?.length > 0 ? initialTopRated : (hasHydrated ? (homeData.topRatedProducts || []) : []);
  const bestSellingProducts = initialBestSelling?.length > 0 ? initialBestSelling : (hasHydrated ? (homeData.bestSellingProducts || []) : []);
  const mostSoldProducts = initialMostSold?.length > 0 ? initialMostSold : (hasHydrated ? (homeData.mostSoldProducts || []) : []);
  const airConditionerProducts = initialAir?.length > 0 ? initialAir : (hasHydrated ? (homeData.airConditionerProducts || []) : []);
  const mobilePhonesOnSale = initialMobile?.length > 0 ? initialMobile : (hasHydrated ? (homeData.mobilePhonesOnSale || []) : []);
  const laptopsProducts = initialLaptops?.length > 0 ? initialLaptops : (hasHydrated ? (homeData.laptopsProducts || []) : []);
  const speakersProducts = initialSpeakers?.length > 0 ? initialSpeakers : (hasHydrated ? (homeData.speakersProducts || []) : []);
  const televisionsProducts = initialTelevisions?.length > 0 ? initialTelevisions : (hasHydrated ? (homeData.televisionsProducts || []) : []);
  const promoProduct = initialPromo || (hasHydrated ? homeData.promoProduct : null);
  const dealsProducts = initialDeals?.length > 0 ? initialDeals : (hasHydrated ? (homeData.dealsProducts || []) : []);
  const trendingProducts = initialTrending?.length > 0 ? initialTrending : (hasHydrated ? (homeData.trendingProducts || []) : []);
  const underFiveHundredProducts = initialUnderFiveHundred?.length > 0 ? initialUnderFiveHundred : (hasHydrated ? (homeData.underFiveHundredProducts || []) : []);

  useEffect(() => {
    if (initialTopRated?.length > 0) {
      setHomeData({
        topRatedProducts: initialTopRated,
        bestSellingProducts: initialBestSelling,
        mostSoldProducts: initialMostSold,
        airConditionerProducts: initialAir,
        mobilePhonesOnSale: initialMobile,
        laptopsProducts: initialLaptops,
        speakersProducts: initialSpeakers,
        televisionsProducts: initialTelevisions,
        promoProduct: initialPromo,
        dealsProducts: initialDeals,
        trendingProducts: initialTrending,
        underFiveHundredProducts: initialUnderFiveHundred,
      });
    }
  }, [initialTopRated, initialBestSelling, initialMostSold, initialAir, initialMobile, initialLaptops, initialSpeakers, initialTelevisions, initialPromo, initialDeals, initialTrending, initialUnderFiveHundred, setHomeData]);

  return (
    <Layout title="Shop Online In Ghana | Shopwice" fullWidth={true}>
      <SeoHead seoData={seoData} />
      <div className="bg-[#F8F8F8]">
        <Hero />
        <TrustSignalsBar />
        <ContinueShopping />
        <CategoryDiscoveryGrid />
        <TodaysDeals products={dealsProducts} />
        <DealSectionSlider
          title="Trending This Week"
          emoji={TRENDING_ICON}
          variant="trending"
          products={trendingProducts}
          viewAllHref="/products?orderby=popularity"
        />
        <DealSectionSlider
          title="Best Sellers"
          emoji={BEST_SELLER_ICON}
          variant="bestseller"
          products={bestSellingProducts}
          viewAllHref="/products?orderby=popularity"
        />
        <DealSectionSlider
          title="Under GHS 500"
          emoji={BUDGET_ICON}
          variant="budget"
          products={underFiveHundredProducts}
          viewAllHref="/products?max_price=500"
        />
        <MostSoldThisWeek products={mostSoldProducts} />
        <FeaturedCategories />
        <TopRatedProducts products={topRatedProducts} />
        <CategoryFeatureBlock
          title="Smartphones"
          subtitle="Shop Mobile Phones"
          products={mobilePhonesOnSale}
          viewAllHref="/product-category/mobile-phones"
        />
        <CategoryFeatureBlock
          title="Laptops"
          subtitle="Computers & Laptops"
          products={laptopsProducts}
          viewAllHref="/product-category/laptops"
        />
        <CategoryFeatureBlock
          title="Televisions"
          subtitle="Smart TVs & Displays"
          products={televisionsProducts}
          viewAllHref="/product-category/televisions"
        />
        <CategoryFeatureBlock
          title="Air Conditioners"
          subtitle="Cooling & Climate Control"
          products={airConditionerProducts}
          viewAllHref="/product-category/air-conditioners"
        />
        <CategoryFeatureBlock
          title="Speakers"
          subtitle="Audio & Sound Systems"
          products={speakersProducts}
          viewAllHref="/product-category/speakers"
        />
        <WhyChooseUs />
        <PromoBoxes promoProduct={promoProduct} />

        <BestSellingSlider products={bestSellingProducts} />

        <div className="container mx-auto px-4 mb-8">
          <RecentRefurbishedReviews />
        </div>

        <InfoBanner />

        <SEOContent />

        <Newsletter />
      </div>
    </Layout>
  );
};

export default Index;

export const getStaticProps: GetStaticProps = async () => {
  const seoData = await buildHomepageSeoData();

  try {
    const [allProductsPayload, categoriesPayload, dealsPayload, popularProductsPayload] = await Promise.all([
      api.get<any>(ENDPOINTS.PRODUCTS, {
        params: { per_page: 50 },
      }),
      api.get<any>(ENDPOINTS.CATEGORIES, {
        params: { per_page: 250, page: 1 },
      }),
      api.get<any>(ENDPOINTS.PRODUCTS, {
        params: { per_page: 24, on_sale: true, orderby: 'popularity', order: 'desc' },
      }),
      api.get<any>(ENDPOINTS.PRODUCTS, {
        params: { per_page: 50, orderby: 'popularity', order: 'desc' },
      }),
    ]);

    const allProducts = normalizeList<Product>(allProductsPayload);
    const categories = normalizeList<CategoryNode>(categoriesPayload);
    const dealsRaw = normalizeList<Product>(dealsPayload);
    const popularProducts = normalizeList<Product>(popularProductsPayload);

    const [
      airConditionerProducts,
      mobilePhonesOnSale,
      laptopsProducts,
      speakersProducts,
      televisionsProducts,
    ] = await Promise.all([
      fetchExactCategoryProducts({
        categories,
        slugCandidates: ['air-conditioners', 'air-conditioner'],
        perPage: HOME_SECTION_LIMIT,
      }),
      fetchExactCategoryProducts({
        categories,
        slugCandidates: ['mobile-phones', 'mobile-phone'],
        perPage: HOME_SECTION_LIMIT,
      }),
      fetchExactCategoryProducts({
        categories,
        slugCandidates: ['laptops', 'laptop'],
        perPage: HOME_SECTION_LIMIT,
      }),
      fetchExactCategoryProducts({
        categories,
        slugCandidates: ['speakers', 'speaker'],
        perPage: HOME_SECTION_LIMIT,
      }),
      fetchExactCategoryProducts({
        categories,
        slugCandidates: ['televisions', 'television', 'tvs', 'tv'],
        perPage: HOME_SECTION_LIMIT,
      }),
    ]);

    const topRatedProducts = allProducts
      .slice()
      .sort((a: any, b: any) => Number(b?.averageRating || 0) - Number(a?.averageRating || 0))
      .slice(0, HOME_SECTION_LIMIT);

    const bestSellingProducts = (popularProducts.length > 0 ? popularProducts : allProducts)
      .slice()
      .sort((a: any, b: any) => getSoldMetric(b) - getSoldMetric(a))
      .slice(0, HOME_SECTION_LIMIT);

    const dealsProducts = (dealsRaw.length > 0 ? dealsRaw : allProducts)
      .filter((p: any) => p.onSale && (p.salePrice || p.price) && p.stockStatus !== 'outofstock')
      .sort((a: any, b: any) => getSoldMetric(b) - getSoldMetric(a))
      .slice(0, HOME_CAROUSEL_LIMIT);

    const trendingProducts = allProducts
      .slice()
      .sort((a: any, b: any) => Number(b?.reviewCount || 0) - Number(a?.reviewCount || 0))
      .slice(0, HOME_CAROUSEL_LIMIT);

    const underFiveHundredProducts = allProducts
      .filter((p: any) => {
        const price = Number(String(p.price ?? p.salePrice ?? p.regularPrice ?? '0').replace(/[^\d.]/g, ''));
        return price > 0 && price <= 500;
      })
      .slice(0, HOME_CAROUSEL_LIMIT);

    // Products sold in the last 30 days — from dedicated endpoint
    let mostSoldProducts: Product[] = [];
    try {
      mostSoldProducts = await fetchAllMostSoldProducts();
    } catch {
      // ignore
    }
    if (mostSoldProducts.length === 0) {
      mostSoldProducts = (popularProducts.length > 0 ? popularProducts : allProducts)
        .slice()
        .sort((a: any, b: any) => getSoldMetric(b) - getSoldMetric(a))
        .filter((product: any) => getSoldMetric(product) > 0);
    }

    return {
      props: {
        topRatedProducts: topRatedProducts || [],
        bestSellingProducts: bestSellingProducts || [],
        mostSoldProducts: mostSoldProducts || [],
        airConditionerProducts: airConditionerProducts || [],
        mobilePhonesOnSale: mobilePhonesOnSale || [],
        laptopsProducts: laptopsProducts || [],
        speakersProducts: speakersProducts || [],
        televisionsProducts: televisionsProducts || [],
        promoProduct: allProducts[0] || null,
        dealsProducts: dealsProducts || [],
        trendingProducts: trendingProducts || [],
        underFiveHundredProducts: underFiveHundredProducts || [],
        seoData,
      },
      revalidate: 60,
    };
  } catch (error) {
    console.error('Error in getStaticProps:', error);

    // Fallback path if category-specific calls fail.
    try {
      const allProductsPayload: any = await api.get(ENDPOINTS.PRODUCTS, {
      params: { per_page: 50 },
    });
      const allProducts = normalizeList<Product>(allProductsPayload);

      return {
        props: {
          topRatedProducts: allProducts.slice(0, HOME_SECTION_LIMIT) || [],
          bestSellingProducts: allProducts
            .slice()
            .sort((a: any, b: any) => getSoldMetric(b) - getSoldMetric(a))
            .slice(0, HOME_SECTION_LIMIT) || [],
          mostSoldProducts: allProducts
            .slice()
            .sort((a: any, b: any) => getSoldMetric(b) - getSoldMetric(a))
            .filter((product: any) => getSoldMetric(product) > 0),
          airConditionerProducts: allProducts.slice(HOME_SECTION_LIMIT * 2, HOME_SECTION_LIMIT * 3) || [],
          mobilePhonesOnSale: allProducts.slice(HOME_SECTION_LIMIT * 3, HOME_SECTION_LIMIT * 4) || [],
          laptopsProducts: allProducts.slice(HOME_SECTION_LIMIT * 4, HOME_SECTION_LIMIT * 5) || [],
          speakersProducts: allProducts.slice(HOME_SECTION_LIMIT * 5, HOME_SECTION_LIMIT * 6) || [],
          televisionsProducts: allProducts.slice(HOME_SECTION_LIMIT * 6, HOME_SECTION_LIMIT * 7) || [],
          promoProduct: allProducts[0] || null,
          dealsProducts: allProducts.filter((p: any) => p.onSale).slice(0, HOME_CAROUSEL_LIMIT) || [],
          trendingProducts: allProducts.slice(0, HOME_CAROUSEL_LIMIT) || [],
          underFiveHundredProducts: allProducts.filter((p: any) => Number(String(p.price ?? '0').replace(/[^\d.]/g, '')) <= 500).slice(0, HOME_CAROUSEL_LIMIT) || [],
          seoData,
        },
        revalidate: 30,
      };
    } catch (fallbackError) {
      console.error('Error in fallback getStaticProps:', fallbackError);
    }

    return {
      props: {
        topRatedProducts: [],
        bestSellingProducts: [],
        mostSoldProducts: [],
        airConditionerProducts: [],
        mobilePhonesOnSale: [],
        laptopsProducts: [],
        speakersProducts: [],
        televisionsProducts: [],
        promoProduct: null,
        dealsProducts: [],
        trendingProducts: [],
        underFiveHundredProducts: [],
        seoData,
      },
      revalidate: 10,
    };
  }
};
