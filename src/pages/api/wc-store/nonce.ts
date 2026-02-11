import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * WooCommerce Store API Nonce Endpoint
 * 
 * This endpoint fetches a fresh nonce from the WooCommerce Store API.
 * Nonces are required for cart operations when using the Store API.
 * 
 * @see https://github.com/woocommerce/woocommerce/blob/trunk/plugins/woocommerce/src/StoreApi/docs/authentication.md
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const candidates = [
            process.env.NEXT_PUBLIC_STORE_API_URL,
            'https://api.shopwice.com/api',
            process.env.NEXT_PUBLIC_REST_API_URL,
        ].filter(Boolean) as string[];

        let nonce: string | null = null;
        let lastStatus: number | null = null;

        for (const baseUrl of candidates) {
            // Add cache buster to prevent getting cached responses (especially errors)
            // If the URL ends in /api, we assume it's the custom endpoint root and just append /cart
            // Otherwise, we append the standard WooCommerce Store API path
            const path = baseUrl.endsWith('/api') ? '/cart' : '/wp-json/wc/store/v1/cart';
            const nonceEndpoint = `${baseUrl}${path}?_t=${Date.now()}`;
            
            console.log('[Nonce API] Fetching nonce from:', nonceEndpoint);

            // Make a simple GET request to the Store API to get a nonce
            const response = await fetch(nonceEndpoint, {
                method: 'GET',
                credentials: 'omit', // Don't send cookies to prevent session conflicts
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            lastStatus = response.status;
            console.log('[Nonce API] Response status:', response.status);

            // The nonce is returned in the response headers
            nonce = response.headers.get('nonce') ||
                response.headers.get('x-wc-store-api-nonce') ||
                response.headers.get('Nonce');

            if (nonce) {
                break;
            }

            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                try {
                    const data = await response.json();
                    console.log('[Nonce API] Response data:', data);
                } catch (e) {
                    console.error('[Nonce API] Failed to parse response:', e);
                }
            } else {
                console.warn('[Nonce API] Non-JSON response, skipping body parse');
            }
        }

        if (!nonce) {
            console.warn('[Nonce API] No nonce found in headers. Using fallback.');
            nonce = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        if (!nonce) {
            console.error('[Nonce API] No nonce could be obtained');
            return res.status(500).json({
                error: 'Failed to obtain nonce',
                details: 'WooCommerce Store API may not be properly configured. Check if the Store API is enabled on your backend.',
                suggestion: 'You may need to enable the WooCommerce Store API or use GraphQL instead.'
            });
        }

        console.log('[Nonce API] Nonce obtained:', nonce.substring(0, 20) + '...');

        // Return the nonce to the client
        return res.status(200).json({
            nonce,
            expiresIn: 12 * 60 * 60, // 12 hours in seconds
            isTemporary: nonce.startsWith('temp_')
        });

    } catch (error) {
        console.error('[Nonce API] Error:', error);
        return res.status(500).json({
            error: 'Failed to fetch nonce',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
