import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { page, per_page, product } = req.query;

        const baseUrl = process.env.WORDPRESS_API_URL || 'https://api.shopwice.com/api';
        const restEndpoint = `${baseUrl}/products/reviews`;

        const queryParams = new URLSearchParams();

        if (process.env.WC_CONSUMER_KEY && process.env.WC_CONSUMER_SECRET) {
            queryParams.append('consumer_key', process.env.WC_CONSUMER_KEY);
            queryParams.append('consumer_secret', process.env.WC_CONSUMER_SECRET);
        }

        if (page) queryParams.append('page', page as string);
        if (per_page) queryParams.append('per_page', per_page as string);
        if (product) queryParams.append('product', product as string);

        const fetchUrl = `${restEndpoint}?${queryParams.toString()}`;
        console.log('[API Proxy] Fetching reviews:', fetchUrl.replace(/consumer_secret=[^&]+/, 'consumer_secret=***'));

        const response = await fetch(fetchUrl);

        // Handle 404 cleanly (no reviews)
        if (response.status === 404) {
            return res.status(200).json([]);
        }

        if (!response.ok) {
            console.error('[API Proxy] Upstream reviews error:', response.status, response.statusText);
            return res.status(response.status).json({ error: 'Failed to fetch reviews' });
        }

        const data = await response.json();

        // Cache reviews for a short time
        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

        return res.status(200).json(data);
    } catch (error) {
        console.error('[API Proxy] Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
