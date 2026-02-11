import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { include, slug } = req.query;

        const baseUrl = process.env.WORDPRESS_API_URL || 'https://api.shopwice.com/api';
        const restEndpoint = `${baseUrl}/products`;

        const queryParams = new URLSearchParams();

        if (process.env.WC_CONSUMER_KEY && process.env.WC_CONSUMER_SECRET) {
            queryParams.append('consumer_key', process.env.WC_CONSUMER_KEY);
            queryParams.append('consumer_secret', process.env.WC_CONSUMER_SECRET);
        }

        if (include) {
            queryParams.append('include', include as string);
        }
        if (slug) {
            queryParams.append('slug', slug as string);
        }

        const fetchUrl = `${restEndpoint}?${queryParams.toString()}`;
        console.log('[API Proxy] Fetching products:', fetchUrl.replace(/consumer_secret=[^&]+/, 'consumer_secret=***'));

        const response = await fetch(fetchUrl);

        if (!response.ok) {
            console.error('[API Proxy] Upstream error:', response.status, response.statusText);
            return res.status(response.status).json({ error: 'Failed to fetch from upstream' });
        }

        const data = await response.json();

        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

        return res.status(200).json(data);
    } catch (error) {
        console.error('[API Proxy] Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
