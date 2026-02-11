
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * WooCommerce Store API Generic Proxy
 * 
 * This endpoint proxies all requests to the WooCommerce Store API.
 * It handles nonce-based authentication and ensures session isolation.
 * 
 * Usage:
 * - GET /api/wc-store/cart -> /wp-json/wc/store/v1/cart
 * - POST /api/wc-store/checkout -> /wp-json/wc/store/v1/checkout
 * - etc.
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    try {
        // Force the correct backend URL as the environment variable NEXT_PUBLIC_STORE_API_URL
        const storeApiUrl = process.env.NEXT_PUBLIC_STORE_API_URL || 'https://api.shopwice.com/api';

        // Extract the path from the URL
        // e.g., /api/wc-store/cart/add-item -> cart/add-item
        const { path, ...queryParams } = req.query;
        const apiPath = Array.isArray(path) ? path.join('/') : path;

        if (!apiPath) {
            return res.status(400).json({ error: 'Missing path parameter' });
        }

        // Build query string
        const searchParams = new URLSearchParams();
        Object.entries(queryParams).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach(v => searchParams.append(key, v));
            } else if (value !== undefined) {
                searchParams.append(key, value);
            }
        });
        
        // Add cache buster to prevent Cloudflare caching of API responses
        searchParams.append('_t', Date.now().toString());
        
        const queryString = searchParams.toString();

        // Build the target URL
        const targetUrl = `${storeApiUrl}/${apiPath}${queryString ? `?${queryString}` : ''}`;

        console.log('[Store API Proxy] Forwarding:', req.method, targetUrl);
        if (req.method !== 'GET') {
            console.log('[Store API Proxy] Body:', JSON.stringify(req.body, null, 2));
        }

        // Prepare headers
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Forward Authorization header if present
        if (req.headers['authorization']) {
            headers['Authorization'] = req.headers['authorization'] as string;
        }

        // Forward nonce if present (our internal 'Nonce' header)
        if (req.headers['nonce']) {
            headers['X-WC-Store-API-Nonce'] = req.headers['nonce'] as string;
        }

        // Forward woocommerce-session header if present
        if (req.headers['woocommerce-session']) {
            headers['woocommerce-session'] = req.headers['woocommerce-session'] as string;
        }

        // Make the request to WooCommerce Store API
        const response = await fetch(targetUrl, {
            method: req.method,
            credentials: 'omit',
            headers,
            body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
        });

        // Get the response data
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = { message: await response.text() };
        }

        // Forward the nonce header back if present
        const nonceHeader = response.headers.get('nonce') ||
            response.headers.get('x-wc-store-api-nonce');

        if (nonceHeader) {
            res.setHeader('Nonce', nonceHeader);
        }

        // Forward woocommerce-session header back if present
        const sessionHeader = response.headers.get('woocommerce-session') || 
                              response.headers.get('x-woocommerce-session');
        
        if (sessionHeader) {
            console.log('[Store API Proxy] Forwarding Session to client:', sessionHeader.substring(0, 20) + '...');
            res.setHeader('woocommerce-session', sessionHeader);
            // Also set x-woocommerce-session for compatibility
            res.setHeader('x-woocommerce-session', sessionHeader);
        }

        // Return the response
        return res.status(response.status).json(data);

    } catch (error) {
        console.error('[Store API Proxy] Error:', error);
        return res.status(500).json({
            error: 'Failed to proxy Store API request',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
