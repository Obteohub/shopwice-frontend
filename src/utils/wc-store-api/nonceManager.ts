/**
 * WooCommerce Store API Nonce Manager
 * 
 * Handles nonce generation and storage for WooCommerce Store API requests.
 * The Store API uses nonces for authentication instead of traditional sessions.
 */

const NONCE_STORAGE_KEY = 'wc_store_api_nonce';
const NONCE_EXPIRY_KEY = 'wc_store_api_nonce_expiry';
const NONCE_LIFETIME = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

/**
 * Fetches a fresh nonce from the WooCommerce Store API
 */
export async function fetchNonce(): Promise<string | null> {
    try {
        const response = await fetch('/api/wc-store/nonce');

        if (!response.ok) {
            console.warn(`[Nonce Manager] Nonce endpoint failed: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();

        if (data.nonce) {
            // Store nonce with expiry
            if (typeof window !== 'undefined') {
                localStorage.setItem(NONCE_STORAGE_KEY, data.nonce);
                localStorage.setItem(NONCE_EXPIRY_KEY, (Date.now() + NONCE_LIFETIME).toString());
            }

            console.log('[Nonce Manager] Fresh nonce obtained and stored');
            return data.nonce;
        }

        return null;
    } catch (error) {
        console.error('[Nonce Manager] Error fetching nonce:', error);
        return null;
    }
}

/**
 * Gets the current nonce from storage or fetches a new one if expired
 */
export async function getNonce(): Promise<string | null> {
    if (typeof window === 'undefined') {
        return null;
    }

    const storedNonce = localStorage.getItem(NONCE_STORAGE_KEY);
    const expiryTime = localStorage.getItem(NONCE_EXPIRY_KEY);

    // Check if nonce exists and is not expired
    if (storedNonce && expiryTime) {
        const expiry = parseInt(expiryTime, 10);

        if (Date.now() < expiry) {
            console.log('[Nonce Manager] Using cached nonce');
            return storedNonce;
        }

        console.log('[Nonce Manager] Nonce expired, fetching new one');
    }

    // Fetch new nonce if none exists or expired
    return await fetchNonce();
}

/**
 * Clears the stored nonce (useful for logout or session reset)
 */
export function clearNonce(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(NONCE_STORAGE_KEY);
        localStorage.removeItem(NONCE_EXPIRY_KEY);
        console.log('[Nonce Manager] Nonce cleared');
    }
}

/**
 * Gets headers for WooCommerce Store API requests
 */
export async function getStoreApiHeaders(): Promise<Record<string, string>> {
    const nonce = await getNonce();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (nonce) {
        headers['Nonce'] = nonce;
    }

    // Add woocommerce-session if available (from Apollo/LocalStorage)
    // This ensures Store API requests share the same session as GraphQL requests
    if (typeof window !== 'undefined') {
        try {
            const sessionDataStr = localStorage.getItem('woo-session');
            console.log('[Nonce Manager] Raw woo-session from storage:', sessionDataStr);
            
            if (sessionDataStr) {
                const sessionData = JSON.parse(sessionDataStr);
                if (sessionData && sessionData.token) {
                    // Format: "Session {token}" - matches Apollo Client behavior
                    // Ensure we don't double-prefix
                    const token = sessionData.token.replace(/^Session\s+/i, '');
                    headers['woocommerce-session'] = `Session ${token}`;
                    console.log('[Nonce Manager] Attached session header:', headers['woocommerce-session']);
                } else {
                    console.warn('[Nonce Manager] Session data invalid or missing token');
                }
            } else {
                console.log('[Nonce Manager] No woo-session found in localStorage');
            }
        } catch (e) {
            console.warn('[Nonce Manager] Failed to load woo-session:', e);
        }
    }

    return headers;
}
