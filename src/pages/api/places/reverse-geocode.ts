import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Google Reverse Geocode Proxy
 *
 * GET /api/places/reverse-geocode?lat=...&lng=...
 * Returns structured address for a coordinate.
 */

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const RETRY_DELAY_MS = 350;
const MAX_ATTEMPTS = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableNetworkError = (err: any) => {
    const code = err?.cause?.code || err?.code || '';
    return [
        'UND_ERR_CONNECT_TIMEOUT',
        'ECONNRESET',
        'ENOTFOUND',
        'EAI_AGAIN',
    ].includes(code);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { lat, lng } = req.query;

    if (!lat || !lng) {
        return res.status(400).json({ error: 'lat and lng parameters are required' });
    }

    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.append('latlng', `${lat},${lng}`);
    url.searchParams.append('key', GOOGLE_MAPS_API_KEY || '');
    url.searchParams.append('result_type', 'street_address|route|premise|subpremise');
    url.searchParams.append('components', 'country:GH');

    try {
        let googleRes: Response | null = null;
        let lastErr: any = null;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
            try {
                googleRes = await fetch(url.toString());
                break;
            } catch (err: any) {
                lastErr = err;
                if (attempt === MAX_ATTEMPTS || !isRetryableNetworkError(err)) {
                    throw err;
                }
                await sleep(RETRY_DELAY_MS * attempt);
            }
        }

        if (!googleRes) {
            throw lastErr || new Error('Failed to reach Places API');
        }

        const data = await googleRes.json();
        res.status(googleRes.status).json(data);
    } catch (err: any) {
        console.error('[Places Reverse Geocode Proxy] Error:', err);
        const code = err?.cause?.code || err?.code || '';
        const isTimeout = code === 'UND_ERR_CONNECT_TIMEOUT';
        res.status(isTimeout ? 503 : 500).json({
            error: isTimeout ? 'Places API timeout. Please try again.' : (err.message || 'Internal Server Error'),
            code: code || undefined,
        });
    }
}
