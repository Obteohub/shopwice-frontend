import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Cart proxy (frontend -> middleware API).
 *
 * Uses middleware cart endpoints directly:
 *   GET/DELETE /cart
 *   POST /cart/add|update|remove|apply-coupon|remove-coupon|shipping|update-customer
 *
 * This avoids extra Woo direct round-trips and keeps cart interactions snappy.
 */

const API_ROOT = (
    process.env.CART_API_ROOT ||
    process.env.NEXT_PUBLIC_REST_API_URL ||
    'https://api.shopwice.com/api'
).replace(/\/+$/, '');
const CART_PROXY_TIMING_LOGS =
    process.env.CART_PROXY_TIMING_LOGS === 'true' || process.env.NODE_ENV !== 'production';

const nowMs = () =>
    (typeof performance !== 'undefined' && typeof performance.now === 'function')
        ? performance.now()
        : Date.now();

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

const mapActionToUpstream = (
    actionPath: string,
    requestMethod: string,
    body: any,
) => {
    let method = requestMethod;
    let path = '/cart';
    let nextBody = body;

    switch (actionPath) {
        case '':
            path = '/cart';
            break;
        case 'add':
            method = 'POST';
            path = '/cart/add';
            break;
        case 'update':
            method = 'POST';
            path = '/cart/update';
            break;
        case 'remove':
            method = 'POST';
            path = '/cart/remove';
            break;
        case 'apply-coupon':
            method = 'POST';
            path = '/cart/apply-coupon';
            break;
        case 'remove-coupon':
            method = 'POST';
            path = '/cart/remove-coupon';
            break;
        case 'shipping':
            method = 'POST';
            path = '/cart/shipping';
            break;
        case 'update-customer':
            method = 'POST';
            path = '/cart/update-customer';
            break;
        default:
            path = `/cart/${actionPath}`;
            break;
    }

    if (
        method === 'POST' &&
        path === '/cart/remove' &&
        nextBody &&
        typeof nextBody === 'object' &&
        typeof nextBody.key === 'string'
    ) {
        nextBody = { key: nextBody.key };
    }

    if (requestMethod === 'DELETE' && actionPath === '') {
        method = 'DELETE';
        path = '/cart';
    }

    return { method, path, body: nextBody };
};

const appendForwardedQueryParams = (targetUrl: URL, req: NextApiRequest) => {
    Object.entries(req.query).forEach(([key, value]) => {
        if (key === 'action') return;
        if (value == null) return;
        if (Array.isArray(value)) {
            value.forEach((entry) => {
                const normalized = String(entry ?? '').trim();
                if (!normalized) return;
                targetUrl.searchParams.append(key, normalized);
            });
            return;
        }
        const normalized = String(value).trim();
        if (!normalized) return;
        targetUrl.searchParams.append(key, normalized);
    });
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

const parseUpstreamPayload = async (upstream: Response) => {
    const text = await upstream.text();
    const bytes = text ? new TextEncoder().encode(text).length : 0;
    if (!text) {
        return { data: null, bytes };
    }
    try {
        return { data: JSON.parse(text), bytes };
    } catch {
        return { data: text, bytes };
    }
};

const getPayloadSize = (payload: any) => {
    if (payload == null) return 0;
    if (typeof payload === 'string') return new TextEncoder().encode(payload).length;
    try {
        return new TextEncoder().encode(JSON.stringify(payload)).length;
    } catch {
        return 0;
    }
};

const logCartTiming = (meta: Record<string, unknown>) => {
    if (!CART_PROXY_TIMING_LOGS) return;
    try {
        console.info(`[Cart Proxy][Timing] ${JSON.stringify(meta)}`);
    } catch {
        console.info('[Cart Proxy][Timing]', meta);
    }
};

const setServerTimingHeaders = (
    res: NextApiResponse,
    upstreamMs: number,
    sanitizeMs: number,
    totalMs: number,
) => {
    res.setHeader(
        'Server-Timing',
        `upstream;dur=${upstreamMs.toFixed(1)}, sanitize;dur=${sanitizeMs.toFixed(1)}, total;dur=${totalMs.toFixed(1)}`,
    );
    res.setHeader('X-Cart-Upstream-Ms', upstreamMs.toFixed(1));
    res.setHeader('X-Cart-Total-Ms', totalMs.toFixed(1));
};

const setNoStoreHeaders = (res: NextApiResponse) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
};

const sanitizeVariation = (variation: any) => {
    if (!Array.isArray(variation)) return [];
    return variation
        .filter((entry) => entry && typeof entry === 'object')
        .map((entry) => ({
            attribute: String(entry.attribute || ''),
            value: String(entry.value || ''),
        }))
        .filter((entry) => entry.attribute || entry.value);
};

const sanitizeImages = (images: any) => {
    if (!Array.isArray(images)) return [];
    return images
        .filter((img) => img && typeof img === 'object')
        .slice(0, 1)
        .map((img) => ({
            src: img.src || img.source_url || '',
            thumbnail: img.thumbnail || '',
            name: img.name || '',
            alt: img.alt || img.alt_text || '',
        }))
        .filter((img) => !!img.src);
};

const sanitizeCartItem = (item: any) => ({
    key: String(item?.key || ''),
    id: Number(item?.id || 0),
    slug: String(item?.slug || item?.post_name || ''),
    quantity: Number(item?.quantity || 0),
    name: String(item?.name || ''),
    permalink: String(item?.permalink || ''),
    images: sanitizeImages(item?.images),
    variation: sanitizeVariation(item?.variation),
    prices: {
        price: String(item?.prices?.price ?? '0'),
        regular_price: String(item?.prices?.regular_price ?? item?.prices?.price ?? '0'),
        sale_price: String(item?.prices?.sale_price ?? item?.prices?.price ?? '0'),
        currency_code: String(item?.prices?.currency_code ?? item?.totals?.currency_code ?? 'GHS'),
        currency_symbol: String(item?.prices?.currency_symbol ?? item?.totals?.currency_symbol ?? 'GHS'),
        currency_minor_unit: Number(item?.prices?.currency_minor_unit ?? item?.totals?.currency_minor_unit ?? 2),
        currency_decimal_separator: String(item?.prices?.currency_decimal_separator ?? '.'),
        currency_thousand_separator: String(item?.prices?.currency_thousand_separator ?? ','),
        currency_prefix: String(item?.prices?.currency_prefix ?? ''),
        currency_suffix: String(item?.prices?.currency_suffix ?? ''),
    },
    totals: {
        line_subtotal: String(item?.totals?.line_subtotal ?? '0'),
        line_subtotal_tax: String(item?.totals?.line_subtotal_tax ?? '0'),
        line_total: String(item?.totals?.line_total ?? '0'),
        line_total_tax: String(item?.totals?.line_total_tax ?? '0'),
        currency_code: String(item?.totals?.currency_code ?? item?.prices?.currency_code ?? 'GHS'),
        currency_symbol: String(item?.totals?.currency_symbol ?? item?.prices?.currency_symbol ?? 'GHS'),
        currency_minor_unit: Number(item?.totals?.currency_minor_unit ?? item?.prices?.currency_minor_unit ?? 2),
        currency_decimal_separator: String(item?.totals?.currency_decimal_separator ?? '.'),
        currency_thousand_separator: String(item?.totals?.currency_thousand_separator ?? ','),
        currency_prefix: String(item?.totals?.currency_prefix ?? ''),
        currency_suffix: String(item?.totals?.currency_suffix ?? ''),
    },
});

const sanitizeShippingRates = (shippingRates: any) => {
    if (!Array.isArray(shippingRates)) return [];
    return shippingRates.map((pkg: any, index: number) => {
        const rates = Array.isArray(pkg?.shipping_rates)
            ? pkg.shipping_rates
            : (Array.isArray(pkg?.rates) ? pkg.rates : []);
        return {
            package_id: Number.isFinite(Number(pkg?.package_id))
                ? Number(pkg.package_id)
                : index,
            shipping_rates: rates.map((rate: any) => ({
                rate_id: String(rate?.rate_id ?? rate?.id ?? ''),
                id: String(rate?.id ?? rate?.rate_id ?? ''),
                name: String(rate?.name ?? rate?.label ?? rate?.method_title ?? 'Shipping'),
                label: String(rate?.label ?? rate?.name ?? rate?.method_title ?? 'Shipping'),
                method_title: String(rate?.method_title ?? rate?.label ?? rate?.name ?? ''),
                method_id: String(rate?.method_id ?? ''),
                cost: String(rate?.cost ?? rate?.price ?? rate?.price_amount ?? ''),
                price: String(rate?.price ?? rate?.cost ?? rate?.price_amount ?? ''),
                price_amount: String(rate?.price_amount ?? rate?.price ?? rate?.cost ?? ''),
                selected: Boolean(rate?.selected ?? rate?.chosen ?? rate?.is_selected),
            })),
        };
    });
};

const sanitizeTotals = (totals: any) => ({
    total_items: String(totals?.total_items ?? '0'),
    total_items_tax: String(totals?.total_items_tax ?? '0'),
    total_shipping: String(totals?.total_shipping ?? '0'),
    total_shipping_tax: String(totals?.total_shipping_tax ?? '0'),
    total_price: String(totals?.total_price ?? '0'),
    total_tax: String(totals?.total_tax ?? '0'),
    currency_code: String(totals?.currency_code ?? 'GHS'),
    currency_symbol: String(totals?.currency_symbol ?? 'GHS'),
    currency_minor_unit: Number(totals?.currency_minor_unit ?? 2),
    currency_decimal_separator: String(totals?.currency_decimal_separator ?? '.'),
    currency_thousand_separator: String(totals?.currency_thousand_separator ?? ','),
    currency_prefix: String(totals?.currency_prefix ?? ''),
    currency_suffix: String(totals?.currency_suffix ?? ''),
});

const sanitizeCart = (cart: any) => {
    const items = Array.isArray(cart?.items) ? cart.items : [];
    return {
        coupons: Array.isArray(cart?.coupons) ? cart.coupons : [],
        shipping_rates: sanitizeShippingRates(cart?.shipping_rates),
        shipping_address: (cart?.shipping_address && typeof cart.shipping_address === 'object') ? cart.shipping_address : {},
        billing_address: (cart?.billing_address && typeof cart.billing_address === 'object') ? cart.billing_address : {},
        items: items.map(sanitizeCartItem),
        items_count: Number(cart?.items_count ?? items.reduce((sum: number, item: any) => sum + Number(item?.quantity || 0), 0)),
        needs_payment: Boolean(cart?.needs_payment),
        needs_shipping: Boolean(cart?.needs_shipping),
        has_calculated_shipping: Boolean(cart?.has_calculated_shipping),
        totals: sanitizeTotals(cart?.totals),
        errors: Array.isArray(cart?.errors) ? cart.errors : [],
        payment_methods: Array.isArray(cart?.payment_methods) ? cart.payment_methods : [],
        payment_requirements: Array.isArray(cart?.payment_requirements) ? cart.payment_requirements : [],
    };
};

const sanitizeCartPayload = (payload: any) => {
    if (!payload || typeof payload !== 'object') return payload;
    if (Array.isArray(payload?.items)) {
        return sanitizeCart(payload);
    }
    if (payload?.cart && typeof payload.cart === 'object' && Array.isArray(payload.cart.items)) {
        return { ...payload, cart: sanitizeCart(payload.cart) };
    }
    return payload;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const action = req.query.action;
    const actionPath = Array.isArray(action) ? action.join('/') : (action ?? '');
    const requestMethod = String(req.method || 'GET').toUpperCase();
    const incomingBody = parseBody(req);
    const mapped = mapActionToUpstream(actionPath, requestMethod, incomingBody);
    setNoStoreHeaders(res);
    const requestStartMs = nowMs();

    try {
        const headers: Record<string, string> = {
            Accept: 'application/json',
            'Cache-Control': 'no-store',
            Pragma: 'no-cache',
        };

        if (mapped.method !== 'GET' && mapped.method !== 'HEAD') {
            headers['Content-Type'] = 'application/json';
        }

        // Intentionally skip forwarding Authorization for cart endpoints.
        // Cart identity is maintained via Cart-Token / X-WC-Session headers.

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

        const upstreamUrl = new URL(`${API_ROOT}${mapped.path}`);
        appendForwardedQueryParams(upstreamUrl, req);
        const fetchOptions: RequestInit = {
            method: mapped.method,
            credentials: 'omit',
            headers,
            cache: 'no-store',
        };

        if (mapped.method !== 'GET' && mapped.method !== 'HEAD' && mapped.body != null) {
            fetchOptions.body = typeof mapped.body === 'string'
                ? mapped.body
                : JSON.stringify(mapped.body);
        }

        const upstreamStartMs = nowMs();
        const upstream = await fetch(upstreamUrl.toString(), fetchOptions);
        const upstreamLatencyMs = nowMs() - upstreamStartMs;
        relaySessionHeaders(res, upstream);
        const { data: upstreamPayload, bytes: upstreamPayloadBytes } = await parseUpstreamPayload(upstream);
        const sanitizeStartMs = nowMs();
        let data = sanitizeCartPayload(upstreamPayload);
        const sanitizeLatencyMs = nowMs() - sanitizeStartMs;
        const responsePayloadBytes = getPayloadSize(data);

        if (!upstream.ok) {
            const totalMs = nowMs() - requestStartMs;
            setServerTimingHeaders(res, upstreamLatencyMs, sanitizeLatencyMs, totalMs);

            logCartTiming({
                method: requestMethod,
                action: actionPath || 'cart',
                upstreamPath: mapped.path,
                status: upstream.status,
                upstreamLatencyMs: Number(upstreamLatencyMs.toFixed(1)),
                sanitizeLatencyMs: Number(sanitizeLatencyMs.toFixed(1)),
                upstreamPayloadBytes,
                responsePayloadBytes,
                totalMs: Number(totalMs.toFixed(1)),
            });

            const contentType = upstream.headers.get('content-type');
            if (contentType) {
                res.setHeader('Content-Type', contentType);
            }

            if (data == null) {
                return res.status(upstream.status).end();
            }

            if (typeof data === 'string') {
                return res.status(upstream.status).send(data);
            }

            return res.status(upstream.status).json(data);
        }

        // Keep response shape compatible with existing cart transformers.
        if (
            mapped.method === 'POST' &&
            data &&
            typeof data === 'object' &&
            'items' in data &&
            !('cart' in data)
        ) {
            data = { cart: data };
        }

        const totalMs = nowMs() - requestStartMs;
        setServerTimingHeaders(res, upstreamLatencyMs, sanitizeLatencyMs, totalMs);
        logCartTiming({
            method: requestMethod,
            action: actionPath || 'cart',
            upstreamPath: mapped.path,
            status: upstream.status,
            upstreamLatencyMs: Number(upstreamLatencyMs.toFixed(1)),
            sanitizeLatencyMs: Number(sanitizeLatencyMs.toFixed(1)),
            upstreamPayloadBytes,
            responsePayloadBytes: getPayloadSize(data),
            totalMs: Number(totalMs.toFixed(1)),
        });

        return res.status(upstream.status).json(data ?? {});
    } catch (error: any) {
        console.error(`[Cart Proxy] Error during ${requestMethod} ${mapped.path}:`, error);
        const totalMs = nowMs() - requestStartMs;
        setServerTimingHeaders(res, 0, 0, totalMs);
        logCartTiming({
            method: requestMethod,
            action: actionPath || 'cart',
            upstreamPath: mapped.path,
            status: 500,
            error: error?.message || 'Internal Server Error',
            totalMs: Number(totalMs.toFixed(1)),
        });
        return res.status(500).json({
            error: true,
            message: error?.message || 'Internal Server Error',
        });
    }
}
