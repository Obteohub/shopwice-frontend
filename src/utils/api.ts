import { getAuthToken } from './auth';

const API_ROOT = process.env.NEXT_PUBLIC_REST_API_URL || process.env.NEXT_PUBLIC_STORE_API_URL || 'https://api.shopwice.com/api';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface FetchOptions extends RequestInit {
    params?: Record<string, string | number | boolean>;
    requireAuth?: boolean;
    /** Skip the review-rating enrichment pass for this request (e.g. single-product slug lookups). */
    skipReviewEnrich?: boolean;
}

const normalizeOrigin = (value?: string) => {
    if (!value) return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const shouldBypassInternalProxyOnServer = (endpoint: string, method: RequestMethod) => {
    const normalized = endpoint.split('?')[0];
    // Cart/checkout paths should go directly to middleware to avoid an extra frontend proxy hop.
    if (/^\/api\/(cart|checkout|payment-methods|shipping-rates)(?:\/|$)/.test(normalized)) {
        return true;
    }
    // Public catalog GET calls are safer and faster directly against middleware on the server:
    // - avoids self-calling the frontend origin during SSG/ISR
    // - removes build-time dependency on localhost/frontend host availability
    if (
        method === 'GET' &&
        (
            /^\/api\/(products|products\/reviews|reviews|categories|brands|locations|tags|attributes|collection-data|brand-landing)(?:\/|$)/.test(normalized) ||
            /^\/(?:api\/)?search(?:\/|$)/.test(normalized)
        )
    ) {
        return true;
    }
    return false;
};

const shouldBypassInternalProxyInBrowser = (endpoint: string) => {
    // Keep browser calls on same-origin /api to avoid cross-origin preflight latency.
    void endpoint;
    return false;
};

const isSessionEndpoint = (endpoint: string) => {
    const normalized = endpoint.split('?')[0];
    return (
        /^\/api\/(cart|checkout|payment-methods|shipping-rates)(?:\/|$)/.test(normalized) ||
        /^\/(cart|checkout|payment-methods|shipping-rates)(?:\/|$)/.test(normalized)
    );
};

const isPublicCatalogEndpoint = (endpoint: string) => {
    const normalized = endpoint.split('?')[0];
    return (
        /^\/api\/(products|products\/reviews|reviews|categories|brands|locations|tags|attributes|collection-data|brand-landing)(?:\/|$)/.test(normalized) ||
        /^\/(?:api\/)?search(?:\/|$)/.test(normalized)
    );
};

const shouldAttachAuthHeader = (
    endpoint: string,
    method: RequestMethod,
    requireAuth: boolean,
) => {
    if (isSessionEndpoint(endpoint)) return false;
    if (requireAuth) return true;
    if (method === 'GET' && isPublicCatalogEndpoint(endpoint)) return false;
    return true;
};

const shouldAttachSessionHeaders = (
    endpoint: string,
    method: RequestMethod,
) => {
    if (isPublicCatalogEndpoint(endpoint) && method === 'GET') return false;
    return true;
};

const getServerOrigin = () => {
    // Only use runtime/deployment host hints on the server.
    // Do not use NEXT_PUBLIC_SITE_URL here; it can be localhost in dev env files and breaks SSG builds.
    const candidates = [
        process.env.URL,
        process.env.CF_PAGES_URL,
        process.env.SITE_URL,
        process.env.VERCEL_URL,
    ];

    for (const candidate of candidates) {
        const normalized = normalizeOrigin(candidate);
        if (normalized) return normalized.replace(/\/+$/, '');
    }

    return '';
};

export class ApiError extends Error {
    public status: number;
    public data: any;

    constructor(message: string, status: number, data?: any) {
        super(message);
        this.status = status;
        this.data = data;
        this.name = 'ApiError';
    }
}

const WC_SESSION_STORAGE_KEYS = {
    session: 'wc-session',
    cartToken: 'wc-cart-token',
    legacySession: 'woo-session',
    nonce: 'wc-store-api-nonce',
    legacyNonce: 'wc_store_api_nonce',
} as const;

const normalizeHeaderValue = (value: string) => {
    if (!value) return '';
    const first = value
        .split(',')
        .map((part) => part.trim())
        .find(Boolean);
    return first || value.trim();
};

const findHeaderKey = (headers: Headers | Record<string, string>, name: string) => {
    if (headers instanceof Headers) {
        for (const key of headers.keys()) {
            if (key.toLowerCase() === name.toLowerCase()) return key;
        }
        return undefined;
    }
    return Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());
};

const hasHeader = (headers: Headers | Record<string, string> | undefined, name: string) => {
    if (!headers) return false;
    if (headers instanceof Headers) {
        return headers.has(name) || headers.has(name.toLowerCase());
    }
    const key = findHeaderKey(headers, name);
    return !!(key && headers[key]);
};

const setHeaderIfMissing = (headers: Headers | Record<string, string>, name: string, value: string) => {
    if (!value) return;
    if (headers instanceof Headers) {
        if (!headers.has(name)) headers.set(name, value);
        return;
    }
    if (hasHeader(headers, name)) return;
    headers[name] = value;
};

const getResponseHeader = (response: Response, names: string[]) => {
    for (const name of names) {
        const value = response.headers.get(name);
        if (value) return value;
    }
    return '';
};

const getResponseHeaderNumber = (response: Response, names: string[]) => {
    for (const name of names) {
        const raw = response.headers.get(name);
        if (!raw) continue;
        const parsed = Number(String(raw).trim());
        if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    return undefined;
};

const readLegacyWooSessionToken = () => {
    try {
        const raw = localStorage.getItem(WC_SESSION_STORAGE_KEYS.legacySession);
        if (!raw) return '';
        const parsed = JSON.parse(raw);
        return typeof parsed?.token === 'string' ? normalizeHeaderValue(parsed.token) : '';
    } catch {
        return '';
    }
};

const readPersistedCartToken = () => {
    if (typeof window === 'undefined') return '';
    return normalizeHeaderValue(
        localStorage.getItem(WC_SESSION_STORAGE_KEYS.cartToken)?.trim() ||
        localStorage.getItem(WC_SESSION_STORAGE_KEYS.session)?.trim() ||
        readLegacyWooSessionToken() ||
        '',
    );
};

const readPersistedNonce = () => {
    if (typeof window === 'undefined') return '';
    return normalizeHeaderValue(
        localStorage.getItem(WC_SESSION_STORAGE_KEYS.nonce)?.trim() ||
        localStorage.getItem(WC_SESSION_STORAGE_KEYS.legacyNonce)?.trim() ||
        '',
    );
};

const persistCartHeadersFromResponse = (response: Response) => {
    if (typeof window === 'undefined') return;

    const token = normalizeHeaderValue(
        getResponseHeader(response, ['X-WC-Session', 'Cart-Token', 'x-wc-session', 'cart-token']),
    );
    if (token) {
        localStorage.setItem(WC_SESSION_STORAGE_KEYS.session, token);
        localStorage.setItem(WC_SESSION_STORAGE_KEYS.cartToken, token);
        localStorage.setItem(WC_SESSION_STORAGE_KEYS.legacySession, JSON.stringify({
            token,
            updatedAt: Date.now(),
        }));
    }

    const nonce = normalizeHeaderValue(
        getResponseHeader(response, ['Nonce', 'X-WC-Store-API-Nonce', 'nonce', 'x-wc-store-api-nonce']),
    );
    if (nonce) {
        localStorage.setItem(WC_SESSION_STORAGE_KEYS.nonce, nonce);
        localStorage.setItem(WC_SESSION_STORAGE_KEYS.legacyNonce, nonce);
    }
};

const getEdgeCache = (): Cache | null => {
    try {
        const maybeCache = (globalThis as any)?.caches?.default as Cache | undefined;
        return maybeCache ?? null;
    } catch {
        return null;
    }
};

const getEndpointCacheTtl = (endpoint: string, method: RequestMethod): number | null => {
    if (method !== 'GET') return null;
    const normalized = endpoint.split('?')[0];
    if (/^\/api\/products\/reviews(?:\/|$)/.test(normalized) || /^\/api\/products\/[^/]+\/reviews(?:\/|$)/.test(normalized) || /^\/api\/reviews(?:\/|$)/.test(normalized)) return 600;
    if (/^\/api\/products(?:\/|$)/.test(normalized)) return 300;
    if (/^\/api\/collection-data(?:\/|$)/.test(normalized)) return 300;
    if (/^\/api\/brand-landing(?:\/|$)/.test(normalized)) return 300;
    if (/^\/api\/categories(?:\/|$)/.test(normalized)) return 3600;
    if (/^\/api\/(?:brands|locations|tags|attributes)(?:\/|$)/.test(normalized)) return 3600;
    return null;
};

const canUseEndpointEdgeCache = (ttl: number | null, config: RequestInit) => {
    if (!ttl) return false;
    if (typeof window !== 'undefined') return false;
    const headers = config.headers as Headers | Record<string, string> | undefined;
    if (!headers) return true;
    if (hasHeader(headers, 'Authorization')) return false;
    if (hasHeader(headers, 'X-WC-Session')) return false;
    if (hasHeader(headers, 'Cart-Token')) return false;
    if (hasHeader(headers, 'Nonce')) return false;
    if (hasHeader(headers, 'X-WC-Store-API-Nonce')) return false;
    return true;
};

async function fetchWithEdgeCache(url: URL, config: RequestInit, ttl: number): Promise<Response> {
    const edgeCache = getEdgeCache();
    if (!edgeCache) {
        return fetch(url.toString(), config);
    }

    const cacheKey = new Request(url.toString(), { method: 'GET' });
    const cached = await edgeCache.match(cacheKey);
    if (cached) {
        return cached;
    }

    const response = await fetch(url.toString(), config);
    if (response.ok) {
        const cacheHeaders = new Headers(response.headers);
        cacheHeaders.set('Cache-Control', `public, max-age=${ttl}, stale-while-revalidate=60`);
        const cacheResponse = new Response(response.clone().body, {
            status: response.status,
            statusText: response.statusText,
            headers: cacheHeaders,
        });
        void edgeCache.put(cacheKey, cacheResponse).catch(() => {
            // Best-effort edge cache write.
        });
    }
    return response;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableStatus = (status: number) =>
    status === 408 || status === 425 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;

async function fetchWithRetry(
    url: URL,
    config: RequestInit,
    method: RequestMethod,
    ttl: number | null,
): Promise<Response> {
    const maxAttempts = method === 'GET' ? 3 : 1;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const response = canUseEndpointEdgeCache(ttl, config)
                ? await fetchWithEdgeCache(url, config, ttl!)
                : await fetch(url.toString(), config);

            if (attempt < maxAttempts && method === 'GET' && isRetryableStatus(response.status)) {
                await sleep(120 * attempt);
                continue;
            }

            return response;
        } catch (error) {
            lastError = error;
            if (attempt < maxAttempts && method === 'GET') {
                await sleep(120 * attempt);
                continue;
            }
            throw error;
        }
    }

    throw (lastError || new Error('Request failed'));
}

type ReviewAggregate = { sum: number; count: number };

const reviewRatingsByProductId = new Map<string, ReviewAggregate>();
const reviewRatingsByProductSlug = new Map<string, ReviewAggregate>();
let reviewPagesLoaded = 0;
let reviewIndexExhausted = false;
let reviewIndexExpiresAt = 0;
const REVIEW_INDEX_TTL_MS = 10 * 60 * 1000;
const REVIEW_MAX_PAGE_SCANS_PER_REQUEST = Math.max(
    1,
    Number(process.env.REVIEW_MAX_PAGE_SCANS_PER_REQUEST ?? 1),
);
const reviewEnrichFlagRaw = String(
    process.env.ENABLE_PRODUCT_REVIEW_ENRICH ??
    process.env.NEXT_PUBLIC_ENABLE_PRODUCT_REVIEW_ENRICH ??
    'true',
)
    .trim()
    .toLowerCase();
const REVIEW_ENRICH_ENABLED = !['false', '0', 'no', 'off'].includes(reviewEnrichFlagRaw);
const REVIEW_PAGE_SIZE = 100;
const REVIEW_UNMATCHED_TTL_MS = 5 * 60 * 1000;
const reviewUnmatchedProducts = new Map<string, number>();
const BROKEN_WC_PLACEHOLDER_URL = 'https://shopwice.com/wp-content/uploads/woocommerce-placeholder.png';
const FIXED_WC_PLACEHOLDER_URL = 'https://shopwice.com/wp-content/uploads/woocommerce-placeholder.webp';

const isProductsListEndpointPath = (path: string) =>
    /^\/(?:api\/)?products\/?$/.test(path);

const shouldNormalizeCatalogImages = (path: string) =>
    /^\/(?:api\/)?(products|categories|collection-data)(?:\/|$)/.test(path);

const maybeFixBrokenImageUrl = (value: unknown) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return value;
    if (trimmed === BROKEN_WC_PLACEHOLDER_URL) return FIXED_WC_PLACEHOLDER_URL;
    if (/^http:\/\//i.test(trimmed)) {
        return trimmed.replace(/^http:\/\//i, 'https://');
    }
    if (
        trimmed.includes('/wp-content/uploads/') &&
        /woocommerce-placeholder\.png$/i.test(trimmed)
    ) {
        return trimmed.replace(/woocommerce-placeholder\.png$/i, 'woocommerce-placeholder.webp');
    }
    return value;
};

const normalizeCatalogImageUrls = (value: any): any => {
    if (Array.isArray(value)) {
        return value.map((entry) => normalizeCatalogImageUrls(entry));
    }
    if (!value || typeof value !== 'object') {
        return maybeFixBrokenImageUrl(value);
    }

    const clone: Record<string, any> = {};
    for (const [key, entry] of Object.entries(value)) {
        if (typeof entry === 'string') {
            clone[key] = maybeFixBrokenImageUrl(entry);
            continue;
        }
        clone[key] = normalizeCatalogImageUrls(entry);
    }
    return clone;
};

const resetReviewIndexIfExpired = () => {
    if (Date.now() <= reviewIndexExpiresAt) return;
    reviewRatingsByProductId.clear();
    reviewRatingsByProductSlug.clear();
    reviewUnmatchedProducts.clear();
    reviewPagesLoaded = 0;
    reviewIndexExhausted = false;
    reviewIndexExpiresAt = Date.now() + REVIEW_INDEX_TTL_MS;
};

const normalizeReviewsPayload = (payload: any): any[] => {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object') {
        if (Array.isArray(payload.reviews)) return payload.reviews;
        if (Array.isArray(payload.data)) return payload.data;
        if (Array.isArray(payload.results)) return payload.results;
        if (Array.isArray(payload.items)) return payload.items;
    }
    return [];
};

const addReviewToIndex = (review: any) => {
    const rating = Number(review?.rating ?? 0);
    if (!Number.isFinite(rating) || rating <= 0) return;

    const productId = review?.productId != null ? String(review.productId).trim() : '';
    const productSlug = review?.productSlug != null ? String(review.productSlug).trim() : '';

    if (productId) {
        const existing = reviewRatingsByProductId.get(productId) || { sum: 0, count: 0 };
        existing.sum += rating;
        existing.count += 1;
        reviewRatingsByProductId.set(productId, existing);
        reviewUnmatchedProducts.delete(`id:${productId}`);
    }

    if (productSlug) {
        const existing = reviewRatingsByProductSlug.get(productSlug) || { sum: 0, count: 0 };
        existing.sum += rating;
        existing.count += 1;
        reviewRatingsByProductSlug.set(productSlug, existing);
        reviewUnmatchedProducts.delete(`slug:${productSlug}`);
    }
};

const productHasNativeRatings = (product: any) => {
    const source = (product && typeof product === 'object') ? product : {};
    const existingAverage = Number(source.averageRating ?? source.average_rating ?? NaN);
    const existingReviewCount = Number(
        source.reviewCount ?? source.rating_count ?? source.ratingCount ?? NaN,
    );
    return Number.isFinite(existingAverage) && Number.isFinite(existingReviewCount);
};

const getProductReviewKeys = (product: any) => {
    const source = (product && typeof product === 'object') ? product : {};
    const keys: string[] = [];
    if (source.id != null) {
        const id = String(source.id).trim();
        if (id) keys.push(`id:${id}`);
    }
    if (source.slug != null) {
        const slug = String(source.slug).trim();
        if (slug) keys.push(`slug:${slug}`);
    }
    return keys;
};

const clearExpiredUnmatchedReviewKeys = () => {
    const now = Date.now();
    for (const [key, expiresAt] of reviewUnmatchedProducts.entries()) {
        if (expiresAt <= now) {
            reviewUnmatchedProducts.delete(key);
        }
    }
};

const hasUnmatchedReviewKey = (product: any) =>
    getProductReviewKeys(product).some((key) => {
        const expiresAt = reviewUnmatchedProducts.get(key);
        return typeof expiresAt === 'number' && expiresAt > Date.now();
    });

const markProductAsUnmatchedForReviewLookup = (product: any) => {
    const expiresAt = Date.now() + REVIEW_UNMATCHED_TTL_MS;
    getProductReviewKeys(product).forEach((key) => {
        reviewUnmatchedProducts.set(key, expiresAt);
    });
};

const hasRatingAggregateForProduct = (product: any) => {
    const id = product?.id != null ? String(product.id).trim() : '';
    const slug = product?.slug != null ? String(product.slug).trim() : '';
    return (
        (!!id && reviewRatingsByProductId.has(id)) ||
        (!!slug && reviewRatingsByProductSlug.has(slug))
    );
};

const fetchReviewsPageForIndex = async (
    normalizedBase: string,
    useApiPrefix: boolean,
    page: number,
): Promise<any[]> => {
    const reviewsPath = useApiPrefix ? '/api/reviews' : '/reviews';
    const reviewsUrl = new URL(`${normalizedBase}${reviewsPath}`);
    reviewsUrl.searchParams.set('per_page', String(REVIEW_PAGE_SIZE));
    reviewsUrl.searchParams.set('page', String(page));

    const response = await fetchWithRetry(
        reviewsUrl,
        {
            method: 'GET',
            credentials: 'omit',
            headers: { Accept: 'application/json' },
        },
        'GET',
        600,
    );

    if (!response.ok) return [];

    let payload: any = null;
    try {
        payload = await response.json();
    } catch {
        return [];
    }

    return normalizeReviewsPayload(payload);
};

const enrichProductsWithReviewRatings = async (
    products: any[],
    normalizedBase: string,
    normalizedEndpointPath: string,
): Promise<any[]> => {
    if (!products.length) return products;

    resetReviewIndexIfExpired();
    clearExpiredUnmatchedReviewKeys();

    const useApiPrefix = normalizedEndpointPath.startsWith('/api/');
    const missingTargetsExist = () =>
        products.some((product) =>
            !productHasNativeRatings(product) &&
            !hasRatingAggregateForProduct(product) &&
            !hasUnmatchedReviewKey(product),
        );

    if (missingTargetsExist() && !reviewIndexExhausted) {
        let scans = 0;
        let page = reviewPagesLoaded + 1;

        while (scans < REVIEW_MAX_PAGE_SCANS_PER_REQUEST && !reviewIndexExhausted && missingTargetsExist()) {
            const reviews = await fetchReviewsPageForIndex(normalizedBase, useApiPrefix, page).catch(
                () => [] as any[],
            );

            if (!reviews.length) {
                reviewIndexExhausted = true;
                break;
            }

            reviews.forEach(addReviewToIndex);
            reviewPagesLoaded = page;
            page += 1;
            scans += 1;
        }
    }

    // Avoid repeated review-page scans for products that still have no aggregate after
    // the current scan window. They remain zero-rated until cache expiry.
    products.forEach((product) => {
        if (productHasNativeRatings(product)) return;
        if (hasRatingAggregateForProduct(product)) return;
        markProductAsUnmatchedForReviewLookup(product);
    });

    return products.map((product) => {
        const source = (product && typeof product === 'object') ? product : {};
        const existingAverage = Number(
            source.averageRating ?? source.average_rating ?? NaN,
        );
        const existingReviewCount = Number(
            source.reviewCount ?? source.rating_count ?? source.ratingCount ?? NaN,
        );

        if (Number.isFinite(existingAverage) && Number.isFinite(existingReviewCount)) {
            return source;
        }

        const productId = source.id != null ? String(source.id).trim() : '';
        const productSlug = source.slug != null ? String(source.slug).trim() : '';
        const aggregate =
            (productId && reviewRatingsByProductId.get(productId)) ||
            (productSlug && reviewRatingsByProductSlug.get(productSlug));

        if (!aggregate || !aggregate.count) {
            return {
                ...source,
                averageRating: Number.isFinite(existingAverage) ? existingAverage : 0,
                reviewCount: Number.isFinite(existingReviewCount) ? existingReviewCount : 0,
            };
        }

        return {
            ...source,
            averageRating: Number((aggregate.sum / aggregate.count).toFixed(1)),
            reviewCount: aggregate.count,
        };
    });
};

/**
 * Core fetch wrapper.
 *
 * Endpoints starting with /api/ are treated as internal Next.js API routes
 * and are resolved relative to the browser origin so they hit our own proxy
 * routes (e.g. /api/cart/*) rather than the external API_ROOT.
 */
async function request<T>(endpoint: string, method: RequestMethod, options: FetchOptions = {}): Promise<T> {
    const { params, headers, requireAuth = false, skipReviewEnrich = false, ...customConfig } = options;

    // Internal Next.js API routes vs external API_ROOT
    const isInternalRoute = endpoint.startsWith('/api/');
    let finalEndpoint = endpoint;
    let baseUrl: string;
    if (isInternalRoute) {
        if (typeof window !== 'undefined') {
            if (shouldBypassInternalProxyInBrowser(endpoint)) {
                // Browser: call middleware directly for cart/checkout paths.
                baseUrl = API_ROOT;
                finalEndpoint = endpoint.replace(/^\/api(?=\/|$)/, '') || '/';
            } else {
                // Browser: use current origin
                baseUrl = window.location.origin;
            }
        } else {
            if (shouldBypassInternalProxyOnServer(endpoint, method)) {
                baseUrl = API_ROOT;
                finalEndpoint = endpoint.replace(/^\/api(?=\/|$)/, '') || '/';
            } else {
                // Server (SSR/SSG): prefer known deployment origin when available.
                // If unknown (common during static build workers), bypass internal proxy and call middleware directly.
                const origin = getServerOrigin();
                if (origin) {
                    baseUrl = origin;
                } else {
                    baseUrl = API_ROOT;
                    finalEndpoint = endpoint.replace(/^\/api(?=\/|$)/, '') || '/';
                }
            }
        }
    } else {
        baseUrl = API_ROOT;
    }

    // Build URL with query params
    const normalizedBase = baseUrl.replace(/\/+$/, '');
    const normalizedEndpoint = finalEndpoint.startsWith('/') ? finalEndpoint : `/${finalEndpoint}`;
    const url = new URL(`${normalizedBase}${normalizedEndpoint}`);
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, String(value));
            }
        });
    }

    // Default headers
    const requestHeaders = new Headers(headers as HeadersInit | undefined);
    setHeaderIfMissing(requestHeaders, 'Accept', 'application/json');
    if (method !== 'GET' && !hasHeader(requestHeaders, 'Content-Type')) {
        requestHeaders.set('Content-Type', 'application/json');
    }

    const config: RequestInit = {
        method,
        credentials: 'omit', // Prevent session leakage from shopwice.com cookies
        headers: requestHeaders,
        ...customConfig,
    };

    if (isSessionEndpoint(endpoint)) {
        const sessionHeaders = config.headers as Headers;
        sessionHeaders.set('Cache-Control', 'no-store');
        sessionHeaders.set('Pragma', 'no-cache');
        config.cache = 'no-store';
    }

    // 1. JWT Auth Header (if logged in)
    const token = await getAuthToken();
    if (token && shouldAttachAuthHeader(endpoint, method, requireAuth)) {
        setHeaderIfMissing(config.headers as Headers, 'Authorization', `Bearer ${token}`);
    }

    // 2. WooCommerce session + nonce persistence for cart/checkout calls.
    if (typeof window !== 'undefined') {
        const browserRequestHeaders = config.headers as Headers;
        if (shouldAttachSessionHeaders(endpoint, method)) {
            const sessionToken = readPersistedCartToken();
            if (sessionToken) {
                setHeaderIfMissing(browserRequestHeaders, 'X-WC-Session', sessionToken);
                setHeaderIfMissing(browserRequestHeaders, 'Cart-Token', sessionToken);
            }
        }

        if (method !== 'GET' && shouldAttachSessionHeaders(endpoint, method)) {
            const nonce = readPersistedNonce();
            if (nonce) {
                setHeaderIfMissing(browserRequestHeaders, 'Nonce', nonce);
                setHeaderIfMissing(browserRequestHeaders, 'X-WC-Store-API-Nonce', nonce);
            }
        }
    }

    try {
        const ttl = getEndpointCacheTtl(endpoint, method);
        const response = await fetchWithRetry(url, config, method, ttl);

        // Capture session/nonce if returned by proxy or middleware.
        if (typeof window !== 'undefined') {
            persistCartHeadersFromResponse(response);
        }

        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        let data: any = null;
        try {
            data = isJson ? await response.json() : await response.text();
        } catch {
            data = isJson ? null : '';
        }

        if (!response.ok) {
            const message =
                (isJson && data?.message) ||
                (isJson && data?.error) ||
                (typeof data === 'string' && data.trim()) ||
                'API request failed';
            
            // Handle 401 Unauthorized - token expired or invalid
            if (response.status === 401) {
                console.warn('[api] Received 401 Unauthorized - clearing auth token and redirecting to login');
                
                // Clear invalid token
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('auth-data');
                    
                    // Redirect to login only if we're not already on login page
                    if (!window.location.pathname.includes('/login')) {
                        window.location.href = `/login?expired=true&redirect=${encodeURIComponent(window.location.pathname)}`;
                    }
                }
            }
            
            throw new ApiError(message, response.status, data);
        }

        const normalizedEndpointPath = normalizedEndpoint.split('?')[0];
        const includeTotalsRaw = String(url.searchParams.get('include_totals') ?? '').trim().toLowerCase();
        const includeTotals = ['1', 'true', 'yes', 'on'].includes(includeTotalsRaw);

        if (
            method === 'GET' &&
            isJson &&
            includeTotals &&
            isProductsListEndpointPath(normalizedEndpointPath) &&
            Array.isArray(data)
        ) {
            const totalCountFromHeader = getResponseHeaderNumber(response, [
                'x-wp-total',
                'x-total-count',
                'x-total',
            ]);
            const totalPagesFromHeader = getResponseHeaderNumber(response, [
                'x-wp-totalpages',
                'x-total-pages',
                'x-totalpages',
            ]);

            const pageRaw = Number(url.searchParams.get('page') || '1');
            const perPageRaw = Number(
                url.searchParams.get('per_page') ||
                url.searchParams.get('perPage') ||
                url.searchParams.get('perpage') ||
                data.length,
            );
            const currentPage = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
            const perPage = Number.isFinite(perPageRaw) && perPageRaw > 0 ? Math.floor(perPageRaw) : data.length;
            const totalCount = Number.isFinite(Number(totalCountFromHeader))
                ? Number(totalCountFromHeader)
                : undefined;

            const hasNextPage = Number.isFinite(Number(totalPagesFromHeader))
                ? currentPage < Number(totalPagesFromHeader)
                : perPage > 0
                    ? data.length >= perPage
                    : false;

            data = {
                products: data,
                totalCount,
                hasNextPage,
            };
        }
        if (
            method === 'GET' &&
            isJson &&
            shouldNormalizeCatalogImages(normalizedEndpointPath)
        ) {
            data = normalizeCatalogImageUrls(data);
        }
        if (
            REVIEW_ENRICH_ENABLED &&
            !skipReviewEnrich &&
            method === 'GET' &&
            isProductsListEndpointPath(normalizedEndpointPath)
        ) {
            const productsArray =
                Array.isArray(data)
                    ? data
                    : data && typeof data === 'object' && Array.isArray((data as any).products)
                        ? (data as any).products
                        : null;

            if (productsArray && productsArray.length > 0) {
                const enrichedProducts = await enrichProductsWithReviewRatings(
                    productsArray,
                    normalizedBase,
                    normalizedEndpointPath,
                );

                if (Array.isArray(data)) {
                    data = enrichedProducts;
                } else {
                    data = {
                        ...(data as Record<string, unknown>),
                        products: enrichedProducts,
                    };
                }
            }
        }

        return data as T;
    } catch (error: any) {
        if (error?.name === 'AbortError') {
            throw error;
        }
        if (error instanceof ApiError) {
            throw error;
        }
        // Network or parsing errors
        throw new ApiError(error.message || 'Network error', 500);
    }
}

export const api = {
    get: <T>(endpoint: string, options?: FetchOptions) => request<T>(endpoint, 'GET', options),
    post: <T>(endpoint: string, body: any, options?: FetchOptions) => request<T>(endpoint, 'POST', { ...options, body: JSON.stringify(body) }),
    put: <T>(endpoint: string, body: any, options?: FetchOptions) => request<T>(endpoint, 'PUT', { ...options, body: JSON.stringify(body) }),
    del: <T>(endpoint: string, options?: FetchOptions) => request<T>(endpoint, 'DELETE', options),
};
