import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Shipping rates proxy (frontend -> middleware API).
 */

const API_ROOT = (
    process.env.CART_API_ROOT ||
    process.env.NEXT_PUBLIC_REST_API_URL ||
    'https://api.shopwice.com/api'
).replace(/\/+$/, '');

const normalizeHeaderValue = (value: string) => {
    if (!value) return '';
    const first = value
        .split(',')
        .map((part) => part.trim())
        .find(Boolean);
    return first || value.trim();
};

const readHeader = (req: NextApiRequest, name: string) => {
    const value = req.headers[name.toLowerCase()];
    if (Array.isArray(value)) return normalizeHeaderValue(value[0] || '');
    return typeof value === 'string' ? normalizeHeaderValue(value) : '';
};

const readFirstHeader = (req: NextApiRequest, names: string[]) => {
    for (const name of names) {
        const value = readHeader(req, name);
        if (value) return value;
    }
    return '';
};

const setNoStoreHeaders = (res: NextApiResponse) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
};

const relaySessionHeaders = (res: NextApiResponse, upstream: Response) => {
    const token = normalizeHeaderValue(
        upstream.headers.get('X-WC-Session') ||
        upstream.headers.get('Cart-Token') ||
        upstream.headers.get('cart-token') ||
        '',
    );
    if (token) {
        res.setHeader('X-WC-Session', token);
        res.setHeader('Cart-Token', token);
    }

    const nonce = normalizeHeaderValue(
        upstream.headers.get('X-WC-Store-API-Nonce') ||
        upstream.headers.get('Nonce') ||
        upstream.headers.get('x-wc-store-api-nonce') ||
        upstream.headers.get('nonce') ||
        '',
    );
    if (nonce) {
        res.setHeader('X-WC-Store-API-Nonce', nonce);
        res.setHeader('Nonce', nonce);
    }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    setNoStoreHeaders(res);

    try {
        const cartToken = readFirstHeader(req, ['x-wc-session', 'cart-token']);
        const nonce = readFirstHeader(req, ['x-wc-store-api-nonce', 'nonce']);

        const headers: Record<string, string> = {
            Accept: 'application/json',
            'Cache-Control': 'no-store',
            Pragma: 'no-cache',
        };

        if (cartToken) {
            headers['X-WC-Session'] = cartToken;
            headers['Cart-Token'] = cartToken;
        }
        if (nonce) {
            headers['X-WC-Store-API-Nonce'] = nonce;
            headers['Nonce'] = nonce;
        }

        const upstream = await fetch(`${API_ROOT}/shipping-rates`, {
            method: 'GET',
            headers,
            credentials: 'omit',
            cache: 'no-store',
        });

        // Middleware can return 404 for /shipping-rates; fallback to cart payload.
        if (upstream.status === 404) {
            const cartUpstream = await fetch(`${API_ROOT}/cart`, {
                method: 'GET',
                headers,
                credentials: 'omit',
                cache: 'no-store',
            });

            relaySessionHeaders(res, cartUpstream);
            const cartContentType = cartUpstream.headers.get('content-type');
            if (cartContentType) {
                res.setHeader('Content-Type', cartContentType);
            }
            const cartRawPayload = await cartUpstream.text();

            if (cartUpstream.ok) {
                try {
                    const cartPayload = cartContentType?.includes('application/json')
                        ? JSON.parse(cartRawPayload)
                        : {};
                    const shippingRates = Array.isArray(cartPayload?.shipping_rates)
                        ? cartPayload.shipping_rates
                        : [];
                    return res.status(200).json(shippingRates);
                } catch {
                    return res.status(200).json([]);
                }
            }

            return res.status(cartUpstream.status).send(cartRawPayload);
        }

        relaySessionHeaders(res, upstream);
        const contentType = upstream.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }
        const rawPayload = await upstream.text();
        return res.status(upstream.status).send(rawPayload);
    } catch (err: any) {
        console.error('[Shipping Rates Proxy] Error:', err);
        return res.status(500).json({
            error: true,
            message: err?.message || 'Internal Server Error',
        });
    }
}
