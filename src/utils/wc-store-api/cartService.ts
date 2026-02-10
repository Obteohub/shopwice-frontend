/**
 * WooCommerce Store API Cart Service
 * 
 * Provides methods to interact with the WooCommerce Store API for cart operations.
 * Uses nonce-based authentication instead of traditional sessions.
 * 
 * @see https://github.com/woocommerce/woocommerce/blob/trunk/plugins/woocommerce/src/StoreApi/docs/cart.md
 */

import { getStoreApiHeaders } from './nonceManager';

const STORE_API_BASE = '/api/wc-store';

export interface CartItem {
    key: string;
    id: number;
    quantity: number;
    name: string;
    short_description: string;
    description: string;
    sku: string;
    low_stock_remaining: number | null;
    backorders_allowed: boolean;
    show_backorder_badge: boolean;
    sold_individually: boolean;
    permalink: string;
    images: Array<{
        id: number;
        src: string;
        thumbnail: string;
        srcset: string;
        sizes: string;
        name: string;
        alt: string;
    }>;
    variation: Array<{
        attribute: string;
        value: string;
    }>;
    prices: {
        price: string;
        regular_price: string;
        sale_price: string;
        price_range: {
            min_amount: string;
            max_amount: string;
        };
        currency_code: string;
        currency_symbol: string;
        currency_minor_unit: number;
        currency_decimal_separator: string;
        currency_thousand_separator: string;
        currency_prefix: string;
        currency_suffix: string;
    };
    totals: {
        line_subtotal: string;
        line_subtotal_tax: string;
        line_total: string;
        line_total_tax: string;
    };
}

export interface Cart {
    items: CartItem[];
    items_count: number;
    items_weight: number;
    cross_sells: any[];
    needs_payment: boolean;
    needs_shipping: boolean;
    has_calculated_shipping: boolean;
    fees: any[];
    totals: {
        total_items: string;
        total_items_tax: string;
        total_fees: string;
        total_fees_tax: string;
        total_discount: string;
        total_discount_tax: string;
        total_shipping: string;
        total_shipping_tax: string;
        total_price: string;
        total_tax: string;
        currency_code: string;
        currency_symbol: string;
        currency_minor_unit: number;
        currency_decimal_separator: string;
        currency_thousand_separator: string;
        currency_prefix: string;
        currency_suffix: string;
    };
    shipping_address: any;
    billing_address: any;
    shipping_rates: any[];
    coupons: any[];
    errors: any[];
    payment_methods: string[];
    payment_requirements: string[];
    extensions: any;
}

/**
 * Get the current cart
 */
export async function getCart(): Promise<Cart> {
    try {
        const headers = await getStoreApiHeaders();

        const response = await fetch(`${STORE_API_BASE}/cart`, {
            method: 'GET',
            credentials: 'include',
            headers,
        });

        // Capture Session Header
        if (typeof window !== 'undefined') {
            const sessionHeader = response.headers.get('woocommerce-session') || 
                                  response.headers.get('x-woocommerce-session');
            
            if (sessionHeader) {
                // Normalize: Remove "Session " prefix if present
                const cleanToken = sessionHeader.replace(/^Session\s+/i, '');
                console.log('[Cart Service] Captured Session Header from getCart:', cleanToken);
                localStorage.setItem(
                    'woo-session',
                    JSON.stringify({ token: cleanToken, createdTime: Date.now() }),
                );
            }
        }

        if (!response.ok) {
            console.error(`[Store API] Failed to get cart. Status: ${response.status} ${response.statusText}`);
            console.error(`[Store API] Request URL: ${response.url}`);
            try {
                const text = await response.text();
                console.error(`[Store API] Response body: ${text}`);
            } catch (e) {
                console.error('[Store API] Could not read response body');
            }
            throw new Error(`Failed to get cart: ${response.statusText}`);
        }

        const cart = await response.json();
        console.log('[Store API] Cart retrieved:', cart);

        return cart;
    } catch (error) {
        console.error('[Store API] Error getting cart:', error);
        throw error;
    }
}

/**
 * Add item to cart
 */
export async function addToCart(
    productId: number,
    quantity: number = 1,
    variationId?: number
): Promise<Cart> {
    try {
        const headers = await getStoreApiHeaders();

        // If variationId is provided, use it as the ID (WooCommerce Store API convention)
        const idToAdd = variationId ? variationId : productId;

        const body: any = {
            id: idToAdd,
            quantity,
        };

        const response = await fetch(`${STORE_API_BASE}/cart/add-item`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify(body),
        });

        // Capture Session Header
        if (typeof window !== 'undefined') {
            const sessionHeader = response.headers.get('woocommerce-session') || 
                                  response.headers.get('x-woocommerce-session');
            
            if (sessionHeader) {
                // Normalize: Remove "Session " prefix if present
                const cleanToken = sessionHeader.replace(/^Session\s+/i, '');
                console.log('[Cart Service] Captured Session Header:', cleanToken);
                localStorage.setItem(
                    'woo-session',
                    JSON.stringify({ token: cleanToken, createdTime: Date.now() }),
                );
            }
        }

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('[Store API] Failed to parse JSON:', responseText);
            throw new Error(`Invalid server response: ${responseText.substring(0, 100).replace(/<[^>]*>?/gm, '')}`);
        }

        if (!response.ok) {
            throw new Error(data.message || 'Failed to add item to cart');
        }

        const cart = data;
        console.log('[Store API] Item added to cart:', cart);

        return cart;
    } catch (error) {
        console.error('[Store API] Error adding to cart:', error);
        throw error;
    }
}

/**
 * Update cart item quantity
 */
export async function updateCartItem(
    itemKey: string,
    quantity: number
): Promise<Cart> {
    try {
        const headers = await getStoreApiHeaders();

        const response = await fetch(`${STORE_API_BASE}/cart/update-item`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({
                key: itemKey,
                quantity,
            }),
        });

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('[Store API] Failed to parse JSON:', responseText.substring(0, 200));
            throw new Error(`Invalid server response: ${responseText.substring(0, 100).replace(/<[^>]*>?/gm, '')}`);
        }

        if (!response.ok) {
            throw new Error(data.message || 'Failed to update cart item');
        }

        const cart = data;
        console.log('[Store API] Cart item updated:', cart);

        return cart;
    } catch (error) {
        console.error('[Store API] Error updating cart item:', error);
        throw error;
    }
}

/**
 * Remove item from cart
 */
export async function removeCartItem(itemKey: string): Promise<Cart> {
    try {
        const headers = await getStoreApiHeaders();

        const response = await fetch(`${STORE_API_BASE}/cart/remove-item`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({
                key: itemKey,
                }),
        });

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('[Store API] Failed to parse JSON:', responseText.substring(0, 200));
            throw new Error(`Invalid server response: ${responseText.substring(0, 100).replace(/<[^>]*>?/gm, '')}`);
        }

        if (!response.ok) {
            throw new Error(data.message || 'Failed to remove cart item');
        }

        const cart = data;
        console.log('[Store API] Cart item removed:', cart);

        return cart;
    } catch (error) {
        console.error('[Store API] Error removing cart item:', error);
        throw error;
    }
}

/**
 * Clear the cart
 */
export async function clearCart(): Promise<boolean> {
    try {
        const cart = await getCart();

        if (!cart || cart.items.length === 0) {
            return true;
        }

        // Remove all items
        for (const item of cart.items) {
            await removeCartItem(item.key);
        }

        console.log('[Store API] Cart cleared');
        return true;
    } catch (error) {
        console.error('[Store API] Error clearing cart:', error);
        return false;
    }
}
