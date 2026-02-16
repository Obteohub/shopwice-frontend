import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GlobalState {
    featuredCategories: any[];
    homeData: {
        topRatedProducts: any[];
        bestSellingProducts: any[];
        airConditionerProducts: any[];
        mobilePhonesOnSale: any[];
        laptopsProducts: any[];
        speakersProducts: any[];
        televisionsProducts: any[];
        promoProduct: any | null;
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
            homeData: {
                topRatedProducts: [],
                bestSellingProducts: [],
                airConditionerProducts: [],
                mobilePhonesOnSale: [],
                laptopsProducts: [],
                speakersProducts: [],
                televisionsProducts: [],
                promoProduct: null,
            },
            hasHydrated: false,
            homeDataLoaded: false,
            setHomeData: (data) => set({
                homeData: {
                    topRatedProducts: data.topRatedProducts || [],
                    bestSellingProducts: data.bestSellingProducts || [],
                    airConditionerProducts: data.airConditionerProducts || [],
                    mobilePhonesOnSale: data.mobilePhonesOnSale || [],
                    laptopsProducts: data.laptopsProducts || [],
                    speakersProducts: data.speakersProducts || [],
                    televisionsProducts: data.televisionsProducts || [],
                    promoProduct: data.promoProduct || null,
                },
                homeDataLoaded: true
            }),
            setCategories: (categories) => set({ featuredCategories: categories }),
            setHasHydrated: (value) => set({ hasHydrated: value }),
        }),
        {
            name: 'shopwice-global-store',
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
