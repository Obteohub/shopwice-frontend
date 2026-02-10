import dynamic from 'next/dynamic';

import Hero from '@/components/Index/Hero.component';
import FeaturedCategories from '@/components/Index/FeaturedCategories.component';
import SEOContent from '@/components/Index/SEOContent.component';
import Layout from '@/components/Layout/Layout.component';

// Utilities
import client from '@/utils/apollo/ApolloClient';

// Types
import type { NextPage, GetStaticProps, InferGetStaticPropsType } from 'next';

// GraphQL
import { FETCH_HOME_PAGE_SSG } from '@/utils/gql/GQL_QUERIES';
import { useGlobalStore } from '@/stores/globalStore';
import { useEffect } from 'react';

const SectionSkeleton = ({ title }: { title: string }) => (
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
  loading: () => <SectionSkeleton title="Top Rated" />,
});
const AirConditionerProducts = dynamic(() => import('@/components/Index/AirConditionerProducts.component'), {
  loading: () => <SectionSkeleton title="Air Conditioners" />,
});
const MobilePhonesOnSale = dynamic(() => import('@/components/Index/MobilePhonesOnSale.component'), {
  loading: () => <SectionSkeleton title="Mobile Phones" />,
});
const LaptopsProducts = dynamic(() => import('@/components/Index/LaptopsProducts.component'), {
  loading: () => <SectionSkeleton title="Laptops" />,
});
const SpeakersProducts = dynamic(() => import('@/components/Index/SpeakersProducts.component'), {
  loading: () => <SectionSkeleton title="Speakers" />,
});
const TelevisionsProducts = dynamic(() => import('@/components/Index/TelevisionsProducts.component'), {
  loading: () => <SectionSkeleton title="Televisions" />,
});
const BestSellingSlider = dynamic(() => import('@/components/Index/BestSellingSlider.component'), {
  loading: () => <SectionSkeleton title="Best Selling" />,
});
const WhyChooseUs = dynamic(() => import('@/components/Index/WhyChooseUs.component'), {
  loading: () => <SectionSkeleton title="Why Choose Us" />,
});
const PromoBoxes = dynamic(() => import('@/components/Index/PromoBoxes.component'), {
  loading: () => <SectionSkeleton title="Promotions" />,
});
const InfoBanner = dynamic(() => import('@/components/Index/InfoBanner.component'), {
  loading: () => <SectionSkeleton title="Info" />,
});
const Newsletter = dynamic(() => import('@/components/Index/Newsletter.component'), {
  loading: () => <SectionSkeleton title="Newsletter" />,
});
const RecentRefurbishedReviewsREST = dynamic(
  () => import('@/components/Product/RecentRefurbishedReviewsREST.component'),
  {
    loading: () => <SectionSkeleton title="Reviews" />,
  }
);

/**
 * Main index page
 * @function Index
 * @param {InferGetStaticPropsType<typeof getStaticProps>} products
 * @returns {JSX.Element} - Rendered component
 */

const Index: NextPage = ({
  topRatedProducts: initialTopRated,
  bestSellingProducts: initialBestSelling,
  airConditionerProducts: initialAir,
  mobilePhonesOnSale: initialMobile,
  laptopsProducts: initialLaptops,
  speakersProducts: initialSpeakers,
  televisionsProducts: initialTelevisions,
  promoProduct: initialPromo,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const setHomeData = useGlobalStore((state) => state.setHomeData);
  const homeData = useGlobalStore((state) => state.homeData);

  // If props are empty (build error), fallback to cached data from store
  const topRatedProducts = initialTopRated?.length > 0 ? initialTopRated : (homeData.topRatedProducts || []);
  const bestSellingProducts = initialBestSelling?.length > 0 ? initialBestSelling : (homeData.bestSellingProducts || []);
  const airConditionerProducts = initialAir?.length > 0 ? initialAir : (homeData.airConditionerProducts || []);
  const mobilePhonesOnSale = initialMobile?.length > 0 ? initialMobile : (homeData.mobilePhonesOnSale || []);
  const laptopsProducts = initialLaptops?.length > 0 ? initialLaptops : (homeData.laptopsProducts || []);
  const speakersProducts = initialSpeakers?.length > 0 ? initialSpeakers : (homeData.speakersProducts || []);
  const televisionsProducts = initialTelevisions?.length > 0 ? initialTelevisions : (homeData.televisionsProducts || []);
  const promoProduct = initialPromo || homeData.promoProduct;

  useEffect(() => {
    if (initialTopRated?.length > 0) {
      setHomeData({
        topRatedProducts: initialTopRated,
        bestSellingProducts: initialBestSelling,
        airConditionerProducts: initialAir,
        mobilePhonesOnSale: initialMobile,
        laptopsProducts: initialLaptops,
        speakersProducts: initialSpeakers,
        televisionsProducts: initialTelevisions,
        promoProduct: initialPromo
      });
    }
  }, [initialTopRated, initialBestSelling, initialAir, initialMobile, initialLaptops, initialSpeakers, initialTelevisions, initialPromo, setHomeData]);

  return (
    <Layout title="Shop Online In Ghana | Shopwice" fullWidth={true}>
      <div className="bg-[#F8F8F8]">
        <Hero />
        <FeaturedCategories />
        <TopRatedProducts products={topRatedProducts} />
        <AirConditionerProducts products={airConditionerProducts} />
        <MobilePhonesOnSale products={mobilePhonesOnSale} />
        <LaptopsProducts products={laptopsProducts} />
        <SpeakersProducts products={speakersProducts} />
        <TelevisionsProducts products={televisionsProducts} />
        <WhyChooseUs />
        <PromoBoxes promoProduct={promoProduct} />

        <BestSellingSlider products={bestSellingProducts} />

        <div className="container mx-auto px-4 mb-8">
          <RecentRefurbishedReviewsREST />
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
  try {
    const { data } = await client.query({
      query: FETCH_HOME_PAGE_SSG,
      variables: { promoProductSlug: "microsoft-xbox-x-wireless-controller" }
    });

    return {
      props: {
        topRatedProducts: data?.topRatedProducts?.nodes || [],
        bestSellingProducts: [],
        airConditionerProducts: [],
        mobilePhonesOnSale: [],
        laptopsProducts: [],
        speakersProducts: [],
        televisionsProducts: [],
        promoProduct: data?.promoProduct || null,
      },
      revalidate: 60,
    };
  } catch (error) {
    console.error('Error in getStaticProps:', error);
    return {
      props: {
        topRatedProducts: [],
        bestSellingProducts: [],
        airConditionerProducts: [],
        mobilePhonesOnSale: [],
        laptopsProducts: [],
        speakersProducts: [],
        televisionsProducts: [],
        promoProduct: null,
      },
      revalidate: 10,
    };
  }
};
