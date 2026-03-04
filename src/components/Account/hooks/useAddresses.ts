import useSWR from 'swr';
import { api, ApiError } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';

export interface Address {
    first_name: string;
    last_name: string;
    company?: string;
    address_1: string;
    address_2?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email?: string;
    phone?: string;
}

export interface CustomerProfile {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    billing: Address;
    shipping: Address;
}

const fetcher = async (url: string): Promise<CustomerProfile> => {
    try {
        const data = await api.get<CustomerProfile>(url);
        if (!data) {
            throw new ApiError('No address data returned', 400);
        }
        return data;
    } catch (err: any) {
        console.error(`[useAddresses] Failed to fetch from ${url}:`, err);
        throw err;
    }
};

export function useAddresses() {
    const { data, error, isLoading, mutate } = useSWR(ENDPOINTS.AUTH.PROFILE, fetcher, {
        revalidateOnFocus: false,
        staleTime: 1000 * 60 * 15, // 15 minutes
        onError: (err) => {
            console.error('[useAddresses] SWR error:', {
                status: err?.status,
                message: err?.message,
            });
        }
    });

    const updateAddress = async (type: 'billing' | 'shipping', address: Address) => {
        try {
            // Optimistic update
            const currentData = data;
            if (currentData) {
                mutate({ ...currentData, [type]: address }, false);
            }

            const response = await api.post<CustomerProfile>(ENDPOINTS.AUTH.PROFILE, { [type]: address });
            mutate(response);
            return { success: true };
        } catch (err: any) {
            console.error(`[useAddresses] Failed to update ${type} address:`, {
                status: err?.status,
                message: err?.message,
            });
            mutate(); // Rollback
            return { success: false, error: err };
        }
    };

    return {
        billing: data?.billing,
        shipping: data?.shipping,
        isLoading,
        isError: error,
        error: error ? {
            status: (error as ApiError)?.status,
            message: error?.message,
        } : null,
        updateAddress,
        mutate,
    };
}
