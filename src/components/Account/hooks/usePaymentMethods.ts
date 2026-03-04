import useSWR from 'swr';
import { api, ApiError } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';

export interface PaymentMethod {
    id: string;
    title: string;
    description: string;
}

export interface SavedCard {
    id: string;
    brand: string;
    last4: string;
    expiry: string;
    isDefault: boolean;
}

const fetcher = async (url: string): Promise<PaymentMethod[]> => {
    try {
        const data = await api.get<PaymentMethod[]>(url);
        return Array.isArray(data) ? data : [];
    } catch (err: any) {
        if (err instanceof ApiError) {
            console.error(
                `[usePaymentMethods] Failed to fetch from ${url} (${err.status}):`,
                err.message,
            );
        } else {
            console.error(`[usePaymentMethods] Failed to fetch from ${url}:`, err);
        }
        throw err;
    }
};

export function usePaymentMethods() {
    const { data: gateways, error, isLoading, mutate } = useSWR(ENDPOINTS.PAYMENT_METHODS, fetcher, {
        revalidateOnFocus: false,
        staleTime: 1000 * 60 * 60, // 1 hour
        onError: (err) => {
            console.error('[usePaymentMethods] SWR error:', {
                status: err?.status,
                message: err?.message,
            });
        }
    });

    // Since saved cards are typically handled by specific providers (e.g. Stripe tokens), 
    // we'll provide a mock or placeholder for saved cards until a specific endpoint is available.
    const savedCards: SavedCard[] = []; // Usually fetched from /api/customer/payment-methods

    const removeSavedCard = async (cardId: string) => {
        // Mock deletion
        console.log(`[usePaymentMethods] Removing card ${cardId}`);
        return { success: true };
    };

    const setDefaultCard = async (cardId: string) => {
        // Mock update
        console.log(`[usePaymentMethods] Setting card ${cardId} as default`);
        return { success: true };
    };

    return {
        gateways: gateways || [],
        savedCards,
        isLoading,
        isError: error,
        removeSavedCard,
        setDefaultCard,
        mutate,
    };
}
