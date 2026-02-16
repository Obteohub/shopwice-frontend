import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * GraphQL Proxy Endpoint
 * 
 * Proxies requests to WooCommerce GraphQL API.
 * Refactored for Next.js Edge Runtime.
 */
export default async function handler(req: NextRequest) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    try {
        const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'https://api.shopwice.com/graphql';

        // Parse body
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        console.log('[GraphQL Proxy] Operation:', body?.operationName);

        // Prepare headers for upstream
        const upstreamHeaders = new Headers();
        upstreamHeaders.set('Content-Type', 'application/json');

        // Forward session headers
        const sessionHeader = req.headers.get('woocommerce-session') || req.headers.get('x-woocommerce-session');
        if (sessionHeader) {
            upstreamHeaders.set('woocommerce-session', sessionHeader);
        }

        const authHeader = req.headers.get('authorization');
        if (authHeader) {
            upstreamHeaders.set('authorization', authHeader);
        }

        // Forward request
        const upstreamResponse = await fetch(graphqlUrl, {
            method: 'POST',
            credentials: 'omit',
            headers: upstreamHeaders,
            body: JSON.stringify(body),
        });

        // Parse upstream response
        let data;
        const contentType = upstreamResponse.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
            try {
                data = await upstreamResponse.json();
            } catch {
                return NextResponse.json({ error: 'Invalid JSON from upstream' }, { status: 502 });
            }
        } else {
            const text = await upstreamResponse.text();
            return NextResponse.json({ error: 'Upstream returned non-JSON', status: upstreamResponse.status, body: text.substring(0, 200) }, { status: upstreamResponse.status || 502 });
        }

        // Create response
        const res = NextResponse.json(data, { status: upstreamResponse.status });

        // Forward specific headers back to client
        const newSessionToken = upstreamResponse.headers.get('woocommerce-session') || upstreamResponse.headers.get('x-woocommerce-session');
        if (newSessionToken) {
            res.headers.set('woocommerce-session', newSessionToken);
        }

        // Handle Set-Cookie
        // In Edge, accessing Set-Cookie from fetch response can be restricted or implementation dependent, 
        // but if available we forward it.
        const setCookie = upstreamResponse.headers.get('set-cookie');
        if (setCookie) {
            // Check for session cookie if header wasn't present
            if (!newSessionToken) {
                const match = setCookie.match(/wp_woocommerce_session_[^=]+=([^;]+)/);
                if (match && match[1]) {
                    res.headers.set('woocommerce-session', match[1]);
                }
            }
            res.headers.set('set-cookie', setCookie);
        }

        return res;

    } catch (error) {
        console.error('[GraphQL Proxy] Error:', error);
        return NextResponse.json({
            error: 'Failed to proxy GraphQL request',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
