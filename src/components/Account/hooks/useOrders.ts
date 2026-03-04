import { useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';
import { normalizeImageUrl } from '@/utils/image';

export interface OrderItem {
    id: number;
    name: string;
    quantity: number;
    price: string;
    image?: {
        src: string;
    };
}

export interface Order {
    id: number;
    order_number: string;
    status: string;
    date_created: string;
    total: string;
    line_items: OrderItem[];
    tracking_link?: string;
}

const fetcher = (url: string) => api.get<Order[]>(url);
const ORDERS_CACHE_KEY = 'shopwice-account-orders-v1';

const readCachedOrders = () => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(ORDERS_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed?.orders) ? parsed.orders as Order[] : null;
    } catch {
        return null;
    }
};

const writeCachedOrders = (orders: Order[]) => {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(
            ORDERS_CACHE_KEY,
            JSON.stringify({ ts: Date.now(), orders }),
        );
    } catch {
        // Ignore sessionStorage failures.
    }
};

export function useOrders() {
    const fallbackOrders = useMemo(() => readCachedOrders() ?? [], []);
    const { data, error, isLoading, mutate } = useSWR(ENDPOINTS.AUTH.ORDERS, fetcher, {
        revalidateOnFocus: false,
        fallbackData: fallbackOrders,
        dedupingInterval: 1000 * 30,
    });

    useEffect(() => {
        if (Array.isArray(data)) {
            writeCachedOrders(data);
        }
    }, [data]);

    const normalizedOrders = useMemo(() => {
        if (!Array.isArray(data)) return [];
        return data.map((order) => ({
            ...order,
            line_items: Array.isArray(order?.line_items)
                ? order.line_items.map((item) => {
                    const imageSrc = normalizeImageUrl(item?.image?.src);
                    return {
                        ...item,
                        image: imageSrc ? { src: imageSrc } : undefined,
                    };
                })
                : [],
        }));
    }, [data]);

    return {
        orders: normalizedOrders,
        isLoading,
        isError: error,
        mutate,
    };
}
