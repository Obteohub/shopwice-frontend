/**
 * Cart Data Transformers
 * Converts REST API responses to match existing cart store format
 */

export interface RestCartItem {
    key: string;
    id: number;
    quantity: number;
    name: string;
    short_description?: string;
    description?: string;
    sku?: string;
    low_stock_remaining?: number | null;
    backorders_allowed?: boolean;
    show_backorder_badge?: boolean;
    sold_individually?: boolean;
    permalink?: string;
    images?: Array<{
        id?: number;
        src: string;
        thumbnail?: string;
        srcset?: string;
        sizes?: string;
        name?: string;
        alt?: string;
    }>;
    variation?: Array<{
        attribute: string;
        value: string;
    }>;
    item_data?: any[];
    prices: {
        price: string;
        regular_price: string;
        sale_price: string;
        price_range: any | null;
        currency_code: string;
        currency_symbol: string;
        currency_minor_unit: number;
        currency_decimal_separator: string;
        currency_thousand_separator: string;
        currency_prefix: string;
        currency_suffix: string;
        raw_prices: {
            precision: number;
            price: string;
            regular_price: string;
            sale_price: string;
        };
    };
    totals: {
        line_subtotal: string;
        line_subtotal_tax: string;
        line_total: string;
        line_total_tax: string;
        currency_code: string;
        currency_symbol: string;
        currency_minor_unit: number;
        currency_decimal_separator: string;
        currency_thousand_separator: string;
        currency_prefix: string;
        currency_suffix: string;
    };
    catalog_visibility?: string;
    extensions?: any;
}

export interface RestCart {
    coupons: any[];
    shipping_rates: any[];
    shipping_address: any;
    billing_address: any;
    items: RestCartItem[];
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
        tax_lines: any[];
        currency_code: string;
        currency_symbol: string;
        currency_minor_unit: number;
        currency_decimal_separator: string;
        currency_thousand_separator: string;
        currency_prefix: string;
        currency_suffix: string;
    };
    errors: any[];
    payment_methods: string[];
    payment_requirements: string[];
    extensions: any;
}

/**
 * Transform REST API cart response to Zustand store format.
 *
 * Accepts either:
 *  - Raw WC Store API cart object (e.g. from GET /cart)
 *  - Proxy-wrapped { cart: RestCart } object (e.g. from POST /cart/add-item via our proxy)
 */
export function transformCartResponse(restCart: RestCart | { cart: RestCart } | null) {
    if (!restCart) {
        return { products: [], totalProductsCount: 0, totalProductsPrice: 0 };
    }

    // Unwrap { cart: ... } wrapper from proxy mutation responses
    // Use any cast to safely check at runtime without TS overlap errors
    const maybeWrapped = restCart as any;
    const cart: RestCart | null = (
        maybeWrapped.cart &&
        typeof maybeWrapped.cart === 'object' &&
        Array.isArray(maybeWrapped.cart.items)
    )
        ? maybeWrapped.cart
        : (restCart as RestCart);


    if (!cart || !cart.items) {
        return {
            products: [],
            totalProductsCount: 0,
            totalProductsPrice: 0
        };
    }

    return {
        products: cart.items.map(item => ({
            productId: item.id,
            cartKey: item.key,
            name: item.name,
            qty: item.quantity,
            price: parseFloat(item.prices.price) || 0,
            totalPrice: item.totals.line_total,
            image: {
                title: item.name,
                sourceUrl: item.images?.[0]?.src || '',
                altText: item.images?.[0]?.alt || item.name
            }
        })),
        totalProductsCount: cart.items_count,
        totalProductsPrice: parseFloat(cart.totals.total_price) || 0
    };
}

/**
 * Transform add-to-cart response.
 * The proxy wraps the WC Store API cart in { cart: ... } so this
 * delegate to transformCartResponse which handles both shapes.
 */
export function transformAddToCartResponse(response: any) {
    if (!response) {
        return null;
    }

    // Works with both { cart: RestCart } and raw RestCart shapes
    const transformed = transformCartResponse(response);
    if (!transformed) return null;

    // If response has a cart property, the transformation is already complete
    // If response IS the cart, wrap it for the AddToCart component
    return { cart: transformed };
}
