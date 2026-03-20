import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createSafeLocalStorage } from './persistStorage';

interface GlobalState {
    featuredCategories: any[];
    sideMenuOpen: boolean;
    setSideMenuOpen: (value: boolean) => void;
    homeData: {
        topRatedProducts: any[];
        bestSellingProducts: any[];
        mostSoldProducts: any[];
        airConditionerProducts: any[];
        mobilePhonesOnSale: any[];
        laptopsProducts: any[];
        speakersProducts: any[];
        televisionsProducts: any[];
        promoProduct: any | null;
        dealsProducts: any[];
        trendingProducts: any[];
        underFiveHundredProducts: any[];
    };
    hasHydrated: boolean;
    homeDataLoaded: boolean;
    setHomeData: (data: any) => void;
    setCategories: (categories: any[]) => void;
    setHasHydrated: (value: boolean) => void;
}

export const useGlobalStore = create<GlobalState>()(
    persist(
        (set) => ({
            featuredCategories: [],
            sideMenuOpen: false,
            setSideMenuOpen: (value) => set({ sideMenuOpen: value }),
            homeData: {
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
            },
            hasHydrated: false,
            homeDataLoaded: false,
            setHomeData: (data) => set({
                homeData: {
                    topRatedProducts: data.topRatedProducts || [],
                    bestSellingProducts: data.bestSellingProducts || [],
                    mostSoldProducts: data.mostSoldProducts || [],
                    airConditionerProducts: data.airConditionerProducts || [],
                    mobilePhonesOnSale: data.mobilePhonesOnSale || [],
                    laptopsProducts: data.laptopsProducts || [],
                    speakersProducts: data.speakersProducts || [],
                    televisionsProducts: data.televisionsProducts || [],
                    promoProduct: data.promoProduct || null,
                    dealsProducts: data.dealsProducts || [],
                    trendingProducts: data.trendingProducts || [],
                    underFiveHundredProducts: data.underFiveHundredProducts || [],
                },
                homeDataLoaded: true
            }),
            setCategories: (categories) => set({ featuredCategories: categories }),
            setHasHydrated: (value) => set({ hasHydrated: value }),
        }),
        {
            name: 'shopwice-global-store',
            storage: createSafeLocalStorage<GlobalState>(),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
