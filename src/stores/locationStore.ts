import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createSafeLocalStorage } from './persistStorage';

interface LocationState {
    selectedLocation: {
        name: string;
        slug: string;
    } | null;
    setSelectedLocation: (location: { name: string; slug: string } | null) => void;
}

export const useLocationStore = create<LocationState>()(
    persist(
        (set) => ({
            selectedLocation: null,
            setSelectedLocation: (location) => set({ selectedLocation: location }),
        }),
        {
            name: 'location-storage',
            storage: createSafeLocalStorage<LocationState>(),
        }
    )
);
