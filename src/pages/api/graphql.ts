import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * GraphQL Proxy Endpoint
 * 
 * This endpoint proxies all GraphQL requests to the WooCommerce GraphQL API
 * while preserving session cookies and headers. This ensures that cart
 * operations work correctly with the local middleware.
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Only allow POST requests (GraphQL standard)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'https://api.shopwice.com/graphql';

        console.log('[GraphQL Proxy] Request to:', graphqlUrl);
        console.log('[GraphQL Proxy] Operation:', req.body?.operationName);

        // Forward the GraphQL request to the actual endpoint
        // IMPORTANT: credentials: 'omit' prevents cookies from shopwice.com being sent
        // This ensures session isolation - we only use the woocommerce-session header
        const response = await fetch(graphqlUrl, {
            method: 'POST',
            credentials: 'omit', // Don't send cookies to prevent session conflicts
            headers: {
                'Content-Type': 'application/json',
                // Forward any session headers from the client
                ...(req.headers['woocommerce-session'] && {
                    'woocommerce-session': req.headers['woocommerce-session'] as string,
                }),
                ...(req.headers['authorization'] && {
                    'authorization': req.headers['authorization'] as string,
                }),
            },
            body: JSON.stringify(req.body),
        });

        // Get the response data
        let data;
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (err) {
                const text = await response.text();
                console.error('[GraphQL Proxy] Invalid JSON response:', text.substring(0, 500));
                return res.status(502).json({ error: 'Invalid JSON from upstream', details: text.substring(0, 200) });
            }
        } else {
            const text = await response.text();
            console.error('[GraphQL Proxy] Upstream returned non-JSON:', response.status, contentType, text.substring(0, 500));
            return res.status(response.status || 502).json({ error: 'Upstream returned non-JSON', status: response.status, body: text.substring(0, 200) });
        }

        // Forward session headers back to the client
        let sessionToken = response.headers.get('woocommerce-session') ||
            response.headers.get('x-woocommerce-session');

        // Check for Set-Cookie if header is missing
        if (!sessionToken) {
            const setCookie = response.headers.get('set-cookie');
            if (setCookie) {
                // Handle multiple cookies or single string
                // Note: node-fetch might combine cookies or return first.
                // We'll search the string for the session cookie.
                try {
                    const match = setCookie.match(/wp_woocommerce_session_[^=]+=([^;]+)/);
                    if (match && match[1]) {
                        // Use the raw value (encoded) to ensure header safety and compatibility
                        sessionToken = match[1];
                        console.log('[GraphQL Proxy] Extracted session from cookie:', sessionToken);
                    }
                } catch (e) {
                    console.error('[GraphQL Proxy] Failed to parse session cookie:', e);
                }
            }
        }

        if (sessionToken) {
            console.log('[GraphQL Proxy] Session header sent to client:', sessionToken);
            res.setHeader('woocommerce-session', sessionToken);
        }

        // Return the GraphQL response
        return res.status(response.status).json(data);
    } catch (error) {
        console.error('[GraphQL Proxy] Error:', error);
        return res.status(500).json({
            error: 'Failed to proxy GraphQL request',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
