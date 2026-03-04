import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * General API Proxy Catch-all
 * 
 * Proxies all requests from /api/* to the central Shopwice API root.
 * This ensures "everything passes through the api middleware" as requested.
 * 
 * Note: Specific routes like /api/cart, /api/checkout, etc. are handled by 
 * their own specialized files in this directory and will take precedence.
 */

const API_ROOT = process.env.NEXT_PUBLIC_REST_API_URL || 'https://api.shopwice.com/api';

const BROKEN_WC_PLACEHOLDER_URL = 'https://shopwice.com/wp-content/uploads/woocommerce-placeholder.png';
const FIXED_WC_PLACEHOLDER_URL = 'https://shopwice.com/wp-content/uploads/woocommerce-placeholder.webp';

const getEdgeCache = (): Cache | null => {
    try {
        const maybeCache = (globalThis as any)?.caches?.default as Cache | undefined;
        return maybeCache ?? null;
    } catch {
        return null;
    }
};

const getCacheTtl = (routePath: string): number | null => {
    if (routePath.startsWith('products/reviews') || /^products\/[^/]+\/reviews(?:\/|$)/.test(routePath) || routePath.startsWith('reviews')) return 600;
    if (routePath.startsWith('products')) return 300;
    if (routePath.startsWith('collection-data')) return 300;
    if (routePath.startsWith('brand-landing')) return 300;
    if (routePath.startsWith('categories')) return 3600;
    if (routePath.startsWith('brands') || routePath.startsWith('locations') || routePath.startsWith('tags') || routePath.startsWith('attributes')) return 3600;
    return null;
};

const isPublicCatalogRoutePath = (routePath: string) => (
    /^(products(?:(?:\/reviews)|(?:\/[^/]+\/reviews))?|reviews|categories|brands|locations|tags|attributes|collection-data|brand-landing)(?:\/|$)/.test(routePath)
);

const shouldForwardAuthHeader = (req: NextApiRequest, routePath: string) => {
    if (!req.headers['authorization']) return false;
    const method = (req.method || 'GET').toUpperCase();
    if (method === 'GET' && isPublicCatalogRoutePath(routePath)) return false;
    return true;
};

const shouldForwardSessionHeaders = (req: NextApiRequest, routePath: string) => {
    const method = (req.method || 'GET').toUpperCase();
    if (method === 'GET' && isPublicCatalogRoutePath(routePath)) return false;
    return true;
};

const canUseEdgeCache = (req: NextApiRequest, routePath: string) => {
    if ((req.method || 'GET').toUpperCase() !== 'GET') return false;
    if (!getCacheTtl(routePath)) return false;
    if (req.headers['authorization'] && !isPublicCatalogRoutePath(routePath)) return false;
    if (req.headers['x-wc-session'] && !isPublicCatalogRoutePath(routePath)) return false;
    if (req.headers['cart-token'] && !isPublicCatalogRoutePath(routePath)) return false;
    if (req.headers['nonce'] && !isPublicCatalogRoutePath(routePath)) return false;
    if (req.headers['x-wc-store-api-nonce'] && !isPublicCatalogRoutePath(routePath)) return false;
    return true;
};

const makeCacheKey = (url: URL) => new Request(url.toString(), { method: 'GET' });

const readHeader = (req: NextApiRequest, name: string) => {
    const value = req.headers[name.toLowerCase()];
    if (Array.isArray(value)) return value[0] || '';
    return typeof value === 'string' ? value : '';
};

const readFirstHeader = (req: NextApiRequest, names: string[]) => {
    for (const name of names) {
        const value = readHeader(req, name);
        if (value) return value;
    }
    return '';
};

const readResponseHeaderNumber = (headers: Headers, names: string[]): number | null => {
    for (const name of names) {
        const raw = headers.get(name);
        if (!raw) continue;
        const parsed = Number(String(raw).trim());
        if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    return null;
};

const maybeFixBrokenImageUrl = (value: unknown) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return value;

    if (trimmed === BROKEN_WC_PLACEHOLDER_URL) {
        return FIXED_WC_PLACEHOLDER_URL;
    }

    if (
        trimmed.includes('/wp-content/uploads/') &&
        /woocommerce-placeholder\.png$/i.test(trimmed)
    ) {
        return trimmed.replace(/woocommerce-placeholder\.png$/i, 'woocommerce-placeholder.webp');
    }

    return value;
};

const fixBrokenProductImageUrls = (value: any): any => {
    if (Array.isArray(value)) {
        return value.map((entry) => fixBrokenProductImageUrls(entry));
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
        clone[key] = fixBrokenProductImageUrls(entry);
    }

    return clone;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { route } = req.query;
    const routePath = Array.isArray(route) ? route.join('/') : (route ?? '');

    // Construct the target URL
    const targetUrl = new URL(`${API_ROOT}/${routePath}`);

    // Append any other query parameters
    Object.entries(req.query).forEach(([key, value]) => {
        if (key !== 'route') {
            if (Array.isArray(value)) {
                value.forEach(v => targetUrl.searchParams.append(key, v));
            } else if (value) {
                targetUrl.searchParams.append(key, value);
            }
        }
    });

    try {
        const headers: Record<string, string> = {
            'Accept': 'application/json',
        };

        // Only set Content-Type if we have a body
        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
            headers['Content-Type'] = 'application/json';
        }

        // Forward important headers
        if (shouldForwardAuthHeader(req, routePath)) {
            headers['Authorization'] = req.headers['authorization'] as string;
            if (process.env.NODE_ENV === 'development') {
                console.info(`[Global Proxy] Authorization header forwarded`);
            }
        }
        
        if (shouldForwardSessionHeaders(req, routePath)) {
            const cartToken = readFirstHeader(req, ['x-wc-session', 'cart-token']);
            if (cartToken) {
                headers['X-WC-Session'] = cartToken;
                headers['Cart-Token'] = cartToken;
            }

            const nonce = readFirstHeader(req, ['x-wc-store-api-nonce', 'nonce']);
            if (nonce) {
                headers['X-WC-Store-API-Nonce'] = nonce;
                headers['Nonce'] = nonce;
            }
        }

        // Forward other important headers
        const headersToForward = ['content-type', 'user-agent', 'accept-language', 'referer'];
        headersToForward.forEach(headerName => {
            if (req.headers[headerName] && !headers[headerName.toLowerCase()]) {
                headers[headerName] = req.headers[headerName] as string;
            }
        });

        const fetchOptions: RequestInit = {
            method: req.method,
            headers,
            credentials: 'omit',
        };

        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
            try {
                // req.body is already parsed by Next.js; ensure it's stringified correctly
                fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
            } catch (bodyErr: any) {
                console.error(`[Global Proxy] Failed to serialize body for ${routePath}:`, bodyErr);
                return res.status(400).json({
                    error: 'Invalid request body',
                    details: bodyErr.message,
                });
            }
        }

        const edgeCache = getEdgeCache();
        const ttl = getCacheTtl(routePath);
        const cacheable = !!edgeCache && canUseEdgeCache(req, routePath) && !!ttl;
        const cacheKey = cacheable ? makeCacheKey(targetUrl) : null;

        if (cacheable && cacheKey) {
            const cached = await edgeCache!.match(cacheKey);
            if (cached) {
                const cachedHeaders = new Headers(cached.headers);
                cachedHeaders.set('X-Edge-Cache', 'HIT');
                const text = await cached.text();
                const contentType = cachedHeaders.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    try {
                        return res.status(cached.status).setHeader('X-Edge-Cache', 'HIT').json(JSON.parse(text));
                    } catch {
                        return res.status(cached.status).setHeader('X-Edge-Cache', 'HIT').json({ message: text });
                    }
                }
                return res.status(cached.status).setHeader('X-Edge-Cache', 'HIT').json({ message: text });
            }
        }

        const apiRes = await fetch(targetUrl.toString(), fetchOptions);

        if (process.env.NODE_ENV === 'development') {
            console.info(`[Global Proxy] ${req.method} /${routePath} => ${apiRes.status}`);
        }

        // Pass through the WC Session token if returned
        const wcSession = apiRes.headers.get('X-WC-Session') || apiRes.headers.get('Cart-Token');
        if (wcSession) {
            res.setHeader('X-WC-Session', wcSession);
            res.setHeader('Cart-Token', wcSession);
        }
        const wcNonce =
            apiRes.headers.get('X-WC-Store-API-Nonce') ||
            apiRes.headers.get('Nonce') ||
            apiRes.headers.get('x-wc-store-api-nonce') ||
            apiRes.headers.get('nonce');
        if (wcNonce) {
            res.setHeader('X-WC-Store-API-Nonce', wcNonce);
            res.setHeader('Nonce', wcNonce);
        }

        // Forward pagination/count headers so frontend can compute true totals
        // even when JSON payload is an array (common WooCommerce behavior).
        const totalCountHeader = readResponseHeaderNumber(apiRes.headers, [
            'x-wp-total',
            'x-total-count',
            'x-total',
        ]);
        const totalPagesHeader = readResponseHeaderNumber(apiRes.headers, [
            'x-wp-totalpages',
            'x-total-pages',
            'x-totalpages',
        ]);
        if (totalCountHeader !== null) {
            res.setHeader('X-WP-Total', String(totalCountHeader));
            res.setHeader('X-Total-Count', String(totalCountHeader));
        }
        if (totalPagesHeader !== null) {
            res.setHeader('X-WP-TotalPages', String(totalPagesHeader));
            res.setHeader('X-Total-Pages', String(totalPagesHeader));
        }

        // Get response content-type
        const contentType = apiRes.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');

        let data: any;
        const text = await apiRes.text();

        if (isJson && text) {
            try {
                data = JSON.parse(text);
            } catch (parseErr: any) {
                console.error(`[Global Proxy] JSON parse failed for ${routePath}:`, parseErr);
                // Return raw text if JSON parsing fails
                data = { message: text };
            }
        } else if (text) {
            // Non-JSON response (HTML error page, plain text, etc.)
            try {
                // Try to parse as JSON anyway in case content-type header is wrong
                data = JSON.parse(text);
            } catch {
                data = { message: text };
            }
        } else {
            // Empty response
            data = null;
        }

        if (apiRes.status >= 400 && process.env.NODE_ENV === 'development') {
            console.error(`[Global Proxy] Backend returned ${apiRes.status} for ${req.method} /${routePath}:`, {
                hasAuth: !!headers['Authorization'],
                statusText: apiRes.statusText,
                contentType,
                data: typeof data === 'object' ? data : { message: data }
            });
        }

        if (routePath.startsWith('products') && data && typeof data === 'object') {
            data = fixBrokenProductImageUrls(data);
        }

        if (cacheable && cacheKey && apiRes.ok && edgeCache && ttl) {
            const payloadText = typeof data === 'string' ? data : JSON.stringify(data || {});
            const cacheHeaders = new Headers({
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': `public, max-age=${ttl}, stale-while-revalidate=60`,
            });
            if (wcSession) {
                cacheHeaders.set('X-WC-Session', wcSession);
            }
            const cacheResponse = new Response(payloadText, {
                status: apiRes.status,
                statusText: apiRes.statusText,
                headers: cacheHeaders,
            });
            void edgeCache.put(cacheKey, cacheResponse).catch((err) => {
                if (process.env.NODE_ENV === 'development') {
                    console.warn('[Global Proxy] Failed to write edge cache:', err);
                }
            });
            res.setHeader('X-Edge-Cache', 'MISS');
        }

        res.status(apiRes.status).json(data || {});
    } catch (err: any) {
        console.error(`[Global Proxy] Fetch failed for ${req.method} /${routePath}:`, {
            error: err.message,
            code: err.code,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to proxy request to backend',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }
}
