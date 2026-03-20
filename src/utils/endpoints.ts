export const API_URL = process.env.NEXT_PUBLIC_REST_API_URL || process.env.NEXT_PUBLIC_STORE_API_URL || 'https://api.shopwice.com/api';

export const ENDPOINTS = {
    // Catalog (Proxied)
    PRODUCTS: '/api/products',
    PRODUCTS_SOLD: '/api/products/sold',
    PRODUCT_BY_ID: '/api/products', // GET /api/products/:id
    PRODUCT_REVIEWS: '/api/products/reviews',
    /** GET /api/products/:idOrSlug/reviews — all approved reviews for a product */
    productReviews: (idOrSlug: string | number) => `/api/products/${idOrSlug}/reviews`,
    CATEGORIES: '/api/categories',
    CATEGORY_BY_ID: '/api/categories', // GET /api/categories/:id
    TAGS: '/api/tags',
    TAG_BY_ID: '/api/tags', // GET /api/tags/:id
    ATTRIBUTES: '/api/attributes',
    ATTRIBUTE_BY_ID: '/api/attributes', // GET /api/attributes/:id
    ATTRIBUTE_TERMS: '/api/attributes', // GET /api/attributes/:id/terms
    BRANDS: '/api/brands',
    BRAND_LANDING: '/api/brand-landing',
    LOCATIONS: '/api/locations',
    COLLECTION_DATA: '/api/collection-data',
    REVIEWS: '/api/reviews',
    SEARCH: '/api/search',
    /** GET /api/pages/:slugOrId */
    page: (slugOrId: string | number) => `/api/pages/${slugOrId}`,

    // Cart Proxy
    CART: '/api/cart',
    CART_ADD: '/api/cart/add',
    CART_UPDATE: '/api/cart/update',
    CART_REMOVE: '/api/cart/remove',
    CART_CLEAR: '/api/cart', // DELETE
    CART_COUPON_APPLY: '/api/cart/apply-coupon',
    CART_COUPON_REMOVE: '/api/cart/remove-coupon',
    CART_SHIPPING: '/api/cart/shipping',
    CART_CUSTOMER: '/api/cart/update-customer',

    // Checkout & Shipping
    CHECKOUT: '/api/checkout',
    SHIPPING_RATES: '/api/shipping-rates',
    PAYMENT_METHODS: '/api/payment-methods',
    ORDERS: '/api/orders',
    ORDERS_RECEIVED: '/api/orders/received',

    // Auth & User (Proxied)
    AUTH: {
        LOGIN: '/api/auth/login',
        REGISTER: '/api/auth/register',
        VERIFY: '/api/auth/verify',
        FORGOT_PASSWORD: '/api/auth/forgot-password',
        RESET_PASSWORD: '/api/auth/reset-password',
        GOOGLE: '/api/auth/google',
        FACEBOOK: '/api/auth/facebook',
        PROFILE: '/api/customer/profile',
        ORDERS: '/api/customer/orders',
        REVIEWS: '/api/customer/reviews',
    },

    // Places Proxy
    PLACES: {
        AUTOCOMPLETE: '/api/places/autocomplete',
        DETAILS: '/api/places/details',
        REVERSE_GEOCODE: '/api/places/reverse-geocode',
    }
};
