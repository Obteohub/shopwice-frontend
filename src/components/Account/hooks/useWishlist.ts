import useSWR from 'swr';
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';
import { useEffect, useState } from 'react';
import { RestProduct } from '@/hooks/useProductFilters';
import { firstDisplayImageUrl } from '@/utils/image';

const fetcher = async (ids: number[]) => {
    if (!ids.length) return [];
    // WooCommerce REST API allows filtering by including specific IDs
    return api.get<RestProduct[]>(ENDPOINTS.PRODUCTS, {
        params: {
            include: ids.join(','),
            per_page: ids.length,
        }
    });
};

export function useWishlist() {
    const [wishlistIds, setWishlistIds] = useState<number[]>([]);

    // Initialize and listen for changes
    useEffect(() => {
        const updateWishlist = () => {
            try {
                const ids = JSON.parse(localStorage.getItem('wishlist') || '[]');
                setWishlistIds(ids);
            } catch (e) {
                console.error('Error reading wishlist from localStorage', e);
            }
        };

        updateWishlist();
        window.addEventListener('wishlist-updated', updateWishlist);
        window.addEventListener('storage', (e) => {
            if (e.key === 'wishlist') updateWishlist();
        });

        return () => {
            window.removeEventListener('wishlist-updated', updateWishlist);
            window.removeEventListener('storage', updateWishlist);
        };
    }, []);

    const { data, error, isLoading, mutate } = useSWR(
        wishlistIds.length > 0 ? [`wishlist-products`, wishlistIds] : null,
        ([, ids]) => fetcher(ids),
        {
            revalidateOnFocus: false,
            staleTime: 1000 * 60 * 10, // 10 minutes
        }
    );

    const normalizedWishlistItems = (data || []).map((product) => {
        const imageSrc = firstDisplayImageUrl(
            (product as any)?.image?.src,
            (product as any)?.image?.sourceUrl,
            (product as any)?.image?.url,
            (product as any)?.images?.[0]?.src,
            (product as any)?.images?.[0]?.sourceUrl,
            (product as any)?.images?.[0]?.url,
        );

        return {
            ...product,
            image: imageSrc ? { ...(product as any)?.image, src: imageSrc } : null,
        };
    });

    const toggleWishlist = (productId: number) => {
        try {
            const current = JSON.parse(localStorage.getItem('wishlist') || '[]');
            let updated;
            if (current.includes(productId)) {
                updated = current.filter((id: number) => id !== productId);
            } else {
                updated = [...current, productId];
            }
            localStorage.setItem('wishlist', JSON.stringify(updated));
            window.dispatchEvent(new Event('wishlist-updated'));
        } catch (e) {
            console.error('Error toggling wishlist', e);
        }
    };

    const removeFromWishlist = (productId: number) => {
        try {
            const current = JSON.parse(localStorage.getItem('wishlist') || '[]');
            const updated = current.filter((id: number) => id !== productId);
            localStorage.setItem('wishlist', JSON.stringify(updated));
            window.dispatchEvent(new Event('wishlist-updated'));
        } catch (e) {
            console.error('Error removing from wishlist', e);
        }
    };

    return {
        wishlistItems: normalizedWishlistItems,
        wishlistIds,
        isLoading,
        isError: error,
        toggleWishlist,
        removeFromWishlist,
        mutate,
    };
}
