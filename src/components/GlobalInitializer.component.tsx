import { useEffect, useRef } from 'react';
import { useQuery } from '@apollo/client';
import { useGlobalStore } from '@/stores/globalStore';
import {
    FETCH_ALL_CATEGORIES_QUERY,
    FETCH_HOME_PAGE_DATA,
} from '@/utils/gql/GQL_QUERIES';
// import StoreApiCartInitializer from '@/components/Cart/StoreApiCartInitializer.component';

/**
 * GlobalInitializer
 * =================
 * Client-only bootstrapper for Shopwice.
 * - Warms Apollo cache
 * - Syncs shared data into Zustand
 * - Prevents hydration mismatches
 * - Avoids redundant store updates
 */
const GlobalInitializer = () => {
    const isClient = typeof window !== 'undefined';

    // Prevent duplicate store writes
    const categoriesHydrated = useRef(false);
    const homeDataHydrated = useRef(false);

    const setCategories = useGlobalStore((state) => state.setCategories);
    const setHomeData = useGlobalStore((state) => state.setHomeData);

    /**
     * Ensure this only runs on the client
     */
    /**
     * Fetch navigation categories
     */
    const {
        data: categoryData,
        error: categoryError,
    } = useQuery(FETCH_ALL_CATEGORIES_QUERY, {
        fetchPolicy: 'cache-first',
        skip: !isClient,
    });

    /**
     * Fetch homepage sections (cache warming)
     */
    const {
        data: homeData,
        error: homeError,
    } = useQuery(FETCH_HOME_PAGE_DATA, {
        variables: {
            promoProductSlug: 'microsoft-xbox-x-wireless-controller',
        },
        fetchPolicy: 'cache-and-network',
        skip: !isClient,
    });

    /**
     * Sync categories → Zustand (once)
     */
    useEffect(() => {
        if (
            categoriesHydrated.current ||
            !categoryData?.productCategories?.nodes?.length
        ) {
            return;
        }

        setCategories(categoryData.productCategories.nodes);
        categoriesHydrated.current = true;
    }, [categoryData, setCategories]);

    /**
     * Sync homepage data → Zustand (once)
     */
    useEffect(() => {
        if (homeDataHydrated.current || !homeData) return;

        const topRated = homeData.topRatedProducts?.nodes || [];

        if (topRated.length > 0 && !topRated[0]?.slug) {
            console.warn(
                '[GlobalInitializer] Top rated product missing slug',
                topRated[0]
            );
        }

        setHomeData({
            topRatedProducts: topRated,
            bestSellingProducts:
                homeData.bestSellingProducts?.nodes || [],
            airConditionerProducts:
                homeData.airConditionerProducts?.nodes || [],
            mobilePhonesOnSale:
                homeData.mobilePhonesOnSale?.nodes || [],
            laptopsProducts:
                homeData.laptopsProducts?.nodes || [],
            speakersProducts:
                homeData.speakersProducts?.nodes || [],
            televisionsProducts:
                homeData.televisionsProducts?.nodes || [],
            promoProduct: homeData.promoProduct || null,
        });

        homeDataHydrated.current = true;
    }, [homeData, setHomeData]);

    /**
     * Optional: Log network errors (no UI crash)
     */
    useEffect(() => {
        if (categoryError) {
            console.error(
                '[GlobalInitializer] Category fetch error:',
                categoryError
            );
        }

        if (homeError) {
            console.error(
                '[GlobalInitializer] Home data fetch error:',
                homeError
            );
        }
    }, [categoryError, homeError]);

    return (
        <>
            {/* Cart bootstrap (disabled until Store API stabilizes) */}
            {/* <StoreApiCartInitializer /> */}
        </>
    );
};

export default GlobalInitializer;
