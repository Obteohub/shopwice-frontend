import { useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { api, ApiError } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';
import { RestReview } from '@/components/Product/ProductReviews.component';

export interface CustomerReview extends RestReview {
    id: string | number;
    productId?: number | string;
    productTitle?: string;
    productSlug?: string;
    date: string;
    content: string;
    rating: number;
}

const fetcher = async (url: string): Promise<CustomerReview[]> => {
    try {
        const data = await api.get<CustomerReview[]>(url);
        if (!Array.isArray(data)) {
            console.warn(`[useReviews] Expected array, got ${typeof data}. Converting to empty array.`);
            return [];
        }
        return data;
    } catch (err: any) {
        console.error(`[useReviews] Failed to fetch reviews from ${url}:`, {
            status: err?.status,
            message: err?.message,
            data: err?.data
        });
        throw err;
    }
};

const REVIEWS_CACHE_KEY = 'shopwice-account-reviews-v1';

const readCachedReviews = () => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(REVIEWS_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed?.reviews) ? parsed.reviews as CustomerReview[] : null;
    } catch {
        return null;
    }
};

const writeCachedReviews = (reviews: CustomerReview[]) => {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(
            REVIEWS_CACHE_KEY,
            JSON.stringify({ ts: Date.now(), reviews }),
        );
    } catch {
        // Ignore sessionStorage failures.
    }
};

export function useReviews() {
    // Use customer reviews endpoint if authenticated, fall back to general reviews
    const endpoint = ENDPOINTS.AUTH.REVIEWS || ENDPOINTS.REVIEWS;
    const fallbackReviews = useMemo(() => readCachedReviews() ?? [], []);

    const { data, error, isLoading, mutate } = useSWR(endpoint, fetcher, {
        revalidateOnFocus: false,
        fallbackData: fallbackReviews,
        dedupingInterval: 1000 * 30,
        onError: (err) => {
            console.error('[useReviews] SWR error:', {
                status: err?.status,
                message: err?.message,
            });
        }
    });

    useEffect(() => {
        if (Array.isArray(data)) {
            writeCachedReviews(data);
        }
    }, [data]);

    // Aggregate stats from reviews
    const stats = {
        total: data?.length || 0,
        averageRating: data?.length
            ? (data.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / data.length).toFixed(1)
            : 0,
        byRating: {
            five: data?.filter(r => r.rating === 5).length || 0,
            four: data?.filter(r => r.rating === 4).length || 0,
            three: data?.filter(r => r.rating === 3).length || 0,
            two: data?.filter(r => r.rating === 2).length || 0,
            one: data?.filter(r => r.rating === 1).length || 0,
        }
    };

    return {
        reviews: data || [],
        stats,
        isLoading,
        isError: error,
        error: error ? {
            status: (error as ApiError)?.status,
            message: error?.message,
            details: (error as ApiError)?.data
        } : null,
        mutate,
    };
}
