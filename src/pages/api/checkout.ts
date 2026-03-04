import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Checkout proxy (frontend -> middleware API).
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

const parseBody = (req: NextApiRequest) => {
    if (req.body == null) return null;
    if (typeof req.body === 'string') {
        try {
            return JSON.parse(req.body);
        } catch {
            return req.body;
        }
    }
    return req.body;
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
    const requestMethod = String(req.method || 'GET').toUpperCase();
    if (requestMethod !== 'GET' && requestMethod !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    setNoStoreHeaders(res);
    const body = parseBody(req);

    try {
        const headers: Record<string, string> = {
            Accept: 'application/json',
            'Cache-Control': 'no-store',
            Pragma: 'no-cache',
        };

        if (requestMethod !== 'GET') {
            headers['Content-Type'] = 'application/json';
        }

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

        const upstream = await fetch(`${API_ROOT}/checkout`, {
            method: requestMethod,
            headers,
            credentials: 'omit',
            cache: 'no-store',
            ...(requestMethod !== 'GET' && body != null
                ? { body: typeof body === 'string' ? body : JSON.stringify(body) }
                : {}),
        });

        relaySessionHeaders(res, upstream);
        const contentType = upstream.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }
        const rawPayload = await upstream.text();
        return res.status(upstream.status).send(rawPayload);
    } catch (err: any) {
        console.error('[Checkout Proxy] Error:', err);
        return res.status(500).json({
            error: true,
            message: err?.message || 'Internal Server Error',
        });
    }
}
