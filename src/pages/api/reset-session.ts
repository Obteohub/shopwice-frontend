
import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = 'experimental-edge';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    // Clear WooCommerce Session Cookies by setting them to expire immediately
    // We need to target the specific session cookies WC uses.
    // Since the hash/ID in the cookie name varies, we ideally need to know the exact names.
    // However, we can try to "guess" or simply instruct the browser to clear them via header if we knew the names.

    // Actually, identifying the exact cookie name for HTTPOnly cookies from the server side
    // without seeing the request cookies is hard, BUT:
    // We can read 'req.cookies' to see what cookies are being sent!

    const cookies = req.cookies;
    const cookiesToClear = Object.keys(cookies).filter(name =>
        name.includes('woocommerce') ||
        name.includes('wp_woocommerce') ||
        name.includes('wordpress_logged_in')
    );

    const serializedCookies = cookiesToClear.map(name => {
        return `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; HttpOnly; SameSite=Lax`;
    });

    if (serializedCookies.length > 0) {
        res.setHeader('Set-Cookie', serializedCookies);
    }

    res.status(200).json({ message: 'Session reset', cleared: cookiesToClear });
}
