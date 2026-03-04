import useSWR from 'swr';
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';

export interface NotificationSettings {
    orders: {
        email: boolean;
        sms: boolean;
        push: boolean;
    };
    promotions: {
        email: boolean;
        sms: boolean;
        push: boolean;
    };
    account: {
        email: boolean;
        sms: boolean;
        push: boolean;
    };
}

const defaultSettings: NotificationSettings = {
    orders: { email: true, sms: true, push: true },
    promotions: { email: false, sms: false, push: false },
    account: { email: true, sms: false, push: true },
};

const fetcher = (url: string) => api.get<any>(url);

export function useNotifications() {
    const { data, error, isLoading, mutate } = useSWR(ENDPOINTS.AUTH.PROFILE, fetcher, {
        revalidateOnFocus: false,
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    // Extract notification settings from profile or use defaults
    const settings: NotificationSettings = data?.meta_data?.find((m: any) => m.key === 'notification_settings')?.value || defaultSettings;

    const updateSettings = async (newSettings: NotificationSettings) => {
        try {
            // Optimistic update
            mutate({ ...data, meta_data: [...(data?.meta_data?.filter((m: any) => m.key !== 'notification_settings') || []), { key: 'notification_settings', value: newSettings }] }, false);

            await api.post(ENDPOINTS.AUTH.PROFILE, {
                meta_data: [{ key: 'notification_settings', value: newSettings }]
            });
            mutate();
            return { success: true };
        } catch (err) {
            console.error('Failed to update notification settings', err);
            mutate();
            return { success: false, error: err };
        }
    };

    return {
        settings,
        isLoading,
        isError: error,
        updateSettings,
        mutate,
    };
}
