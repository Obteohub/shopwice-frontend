import useSWR from 'swr';
import { api, ApiError } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';

export interface UserProfile {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    display_name: string;
    username: string;
}

const fetcher = async (url: string): Promise<UserProfile> => {
    try {
        const raw = await api.get<any>(url);
        const data: UserProfile = {
            id: Number(raw?.id || 0),
            email: String(raw?.email || ''),
            username: String(raw?.username || ''),
            first_name: String(raw?.first_name ?? raw?.firstName ?? ''),
            last_name: String(raw?.last_name ?? raw?.lastName ?? ''),
            display_name: String(raw?.display_name ?? raw?.displayName ?? raw?.username ?? 'User'),
        };
        if (!data) {
            throw new ApiError('No profile data returned', 400);
        }
        return data;
    } catch (err: any) {
        console.error(`[useProfile] Failed to fetch profile from ${url}:`, err);
        throw err;
    }
};

export function useProfile() {
    const { data, error, isLoading, mutate } = useSWR(ENDPOINTS.AUTH.PROFILE, fetcher, {
        revalidateOnFocus: false,
        staleTime: 1000 * 60 * 30, // 30 minutes
        onError: (err) => {
            console.error('[useProfile] SWR error:', {
                status: err?.status,
                message: err?.message,
                data: err?.data
            });
        }
    });

    const updateProfile = async (updates: Partial<UserProfile> & { password?: string }) => {
        try {
            // Optimistic update
            if (data) {
                mutate({ ...data, ...updates }, false);
            }

            const response = await api.post<UserProfile>(ENDPOINTS.AUTH.PROFILE, updates);
            mutate(response);
            return { success: true };
        } catch (err: any) {
            console.error('[useProfile] Failed to update profile:', {
                status: err?.status,
                message: err?.message,
                data: err?.data
            });
            mutate(); // Revert optimistic update
            return { success: false, error: err };
        }
    };

    const deleteAccount = async () => {
        try {
            // Use DELETE if available, POST otherwise
            await api.post(`${ENDPOINTS.AUTH.PROFILE}/delete`, {});
            return { success: true };
        } catch (err: any) {
            console.error('[useProfile] Failed to delete account:', {
                status: err?.status,
                message: err?.message,
                data: err?.data
            });
            return { success: false, error: err };
        }
    };

    return {
        profile: data,
        isLoading,
        isError: error,
        error: error ? {
            status: (error as ApiError)?.status,
            message: error?.message,
            details: (error as ApiError)?.data
        } : null,
        updateProfile,
        deleteAccount,
        mutate,
    };
}
