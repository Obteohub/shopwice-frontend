import { useEffect } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { ApiError } from '@/utils/api';
import { transformCartResponse } from '@/utils/cartTransformers';
import { getCartFast } from '@/utils/cartClient';

type IdleCallbackHandle = number;
type IdleCallbackFn = (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void;

const hasWindow = typeof window !== 'undefined';

const requestIdle = (cb: IdleCallbackFn, timeout = 1500): IdleCallbackHandle | null => {
    if (!hasWindow) return null;
    const w = window as Window & {
        requestIdleCallback?: (callback: IdleCallbackFn, options?: { timeout: number }) => IdleCallbackHandle;
    };
    if (!w.requestIdleCallback) return null;
    return w.requestIdleCallback(cb, { timeout });
};

const cancelIdle = (id: IdleCallbackHandle | null) => {
    if (!hasWindow || id === null) return;
    const w = window as Window & { cancelIdleCallback?: (handle: IdleCallbackHandle) => void };
    w.cancelIdleCallback?.(id);
};

const getErrorStatus = (error: unknown): number => {
    if (error instanceof ApiError && typeof error.status === 'number') {
        return error.status;
    }
    if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        typeof (error as { status?: unknown }).status === 'number'
    ) {
        return Number((error as { status: number }).status);
    }
    return 0;
};

/**
 * GlobalInitializer - Runs global initialization logic on app mount
 * - Syncs cart from WooCommerce session
 * - Categories are now loaded on-demand by components that need them
 */
const GlobalInitializer = () => {
    const { syncWithWooCommerce } = useCartStore();

    useEffect(() => {
        if (hasWindow) {
            const path = window.location.pathname;
            const skipCartSync = path.startsWith('/cart') || path.startsWith('/checkout');
            if (skipCartSync) {
                return;
            }
        }

        let isMounted = true;

        const safeResetCart = () => {
            if (!isMounted) return;
            const existingCount = Number(useCartStore.getState().cart?.totalProductsCount || 0);
            // Do not wipe a non-empty cart on transient sync failures.
            if (existingCount > 0) return;
            syncWithWooCommerce({ products: [], totalProductsCount: 0, totalProductsPrice: 0 });
        };

        const shouldRetry = (error: unknown) => {
            const status = getErrorStatus(error);
            const message = String((error as Error)?.message || '').toLowerCase();
            if (status >= 500) return true;
            if (message.includes('fetch failed') || message.includes('network')) return true;
            return false;
        };

        const syncCart = async () => {
            const maxAttempts = 3;
            for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
                try {
                    const cart = await getCartFast({ maxAgeMs: 12000, view: 'mini' });
                    if (!isMounted) return;
                    if (cart) {
                        syncWithWooCommerce(transformCartResponse(cart as any));
                    }
                    return;
                } catch (error: unknown) {
                    if (!isMounted) return;
                    const is404 = getErrorStatus(error) === 404;
                    if (error instanceof SyntaxError || is404) {
                        // Expected when cart session is new or middleware returns empty.
                        safeResetCart();
                        return;
                    }
                    if (!shouldRetry(error) || attempt === maxAttempts) {
                        console.error('[GlobalInitializer] Error syncing cart:', error);
                        safeResetCart();
                        return;
                    }
                    const delayMs = 500 * Math.pow(2, attempt - 1);
                    await new Promise((resolve) => setTimeout(resolve, delayMs));
                }
            }
        };

        const runSync = () => {
            void syncCart();
        };

        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        let idleId: IdleCallbackHandle | null = null;

        const scheduledIdle = requestIdle(runSync);
        if (scheduledIdle !== null) {
            idleId = scheduledIdle;
        } else {
            timeoutId = setTimeout(runSync, 400);
        }

        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
            cancelIdle(idleId);
        };
    }, [syncWithWooCommerce]);

    return null;
};

export default GlobalInitializer;
