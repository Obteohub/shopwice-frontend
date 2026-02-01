import Link from 'next/link';
import dynamic from 'next/dynamic';

import Hero from '@/components/Index/Hero.component';
import FeaturedCategories from '@/components/Index/FeaturedCategories.component';

// Dynamic Imports for below-the-fold content
import WhyChooseUs from '@/components/Index/WhyChooseUs.component';
import PromoBoxes from '@/components/Index/PromoBoxes.component';
import InfoBanner from '@/components/Index/InfoBanner.component';
import SEOContent from '@/components/Index/SEOContent.component';
import Newsletter from '@/components/Index/Newsletter.component';
import TopRatedProducts from '@/components/Index/TopRatedProducts.component';
import AirConditionerProducts from '@/components/Index/AirConditionerProducts.component';
import MobilePhonesOnSale from '@/components/Index/MobilePhonesOnSale.component';
import LaptopsProducts from '@/components/Index/LaptopsProducts.component';
import SpeakersProducts from '@/components/Index/SpeakersProducts.component';
import TelevisionsProducts from '@/components/Index/TelevisionsProducts.component';
import BestSellingSlider from '@/components/Index/BestSellingSlider.component';
import Layout from '@/components/Layout/Layout.component';

// Utilities
import client from '@/utils/apollo/ApolloClient';

// Types
import type { NextPage, GetStaticProps, InferGetStaticPropsType } from 'next';

// GraphQL
import { FETCH_HOME_PAGE_DATA } from '@/utils/gql/GQL_QUERIES';
import { useGlobalStore } from '@/stores/globalStore';
import { useEffect } from 'react';

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

  console.log('[Index] initialTopRated:', initialTopRated?.length, initialTopRated?.[0]);

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

        <InfoBanner />

        <SEOContent />

        <Newsletter />
      </div>
    </Layout>
  );
};

export const runtime = 'edge';
export default Index;

export const getStaticProps: GetStaticProps = async () => {
  try {
    const { data } = await client.query({
      query: FETCH_HOME_PAGE_DATA,
      variables: { promoProductSlug: "microsoft-xbox-x-wireless-controller" }
    });

    return {
      props: {
        topRatedProducts: data?.topRatedProducts?.nodes || [],
        bestSellingProducts: data?.bestSellingProducts?.nodes || [],
        airConditionerProducts: data?.airConditionerProducts?.nodes || [],
        mobilePhonesOnSale: data?.mobilePhonesOnSale?.nodes || [],
        laptopsProducts: data?.laptopsProducts?.nodes || [],
        speakersProducts: data?.speakersProducts?.nodes || [],
        televisionsProducts: data?.televisionsProducts?.nodes || [],
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
