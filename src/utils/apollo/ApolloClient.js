/*eslint complexity: ["error", 8]*/

import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  ApolloLink,
} from '@apollo/client';

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Middleware operation
 * If we have a session token in localStorage, add it to the GraphQL request as a Session header.
 */
export const middleware = new ApolloLink((operation, forward) => {
  /**
   * If session data exist in local storage, set value as session header.
   */
  const sessionData = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('woo-session'))
    : null;

  const authData = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('auth-data'))
    : null;

  const headers = {};

  // Middleware Log
  if (operation.operationName === 'addToCart' || operation.operationName === 'GET_CART') {
    console.log(`[Apollo Middleware] Op: ${operation.operationName}, Session in Storage:`, sessionData);
  }

  // Add Session Header (Skip for Registration to prevent Nonce/Session conflicts)
  if (sessionData && sessionData.token && sessionData.createdTime && operation.operationName !== 'CreateUser') {
    const { token, createdTime } = sessionData;
    // Check if the token is older than 7 days
    if (Date.now() - createdTime > SEVEN_DAYS) {
      localStorage.removeItem('woo-session');
    } else {
      const cleanToken = token.replace(/^Session\s+/i, '');
      headers['woocommerce-session'] = `Session ${cleanToken}`;
    }
  }

  // Add Nonce Header if available
  const nonce = typeof window !== 'undefined' ? localStorage.getItem('wc_nonce') : null;
  if (nonce) {
    headers['X-WC-Store-API-Nonce'] = nonce;
  }

  // Add JWT Authorization if available (Skip for Registration)
  if (authData && authData.authToken && operation.operationName !== 'CreateUser') {
    headers['Authorization'] = `Bearer ${authData.authToken}`;
  }

  operation.setContext({
    headers,
  });

  return forward(operation);
});

/**
 * Afterware operation.
 *
 * This catches the incoming session token and stores it in localStorage, for future GraphQL requests.
 */
export const afterware = new ApolloLink((operation, forward) =>
  forward(operation).map((response) => {
    /**
   * Check for session header and update session in local storage accordingly.
   */
  const context = operation.getContext();
  const responseHeaders = context?.response?.headers;

  const session = responseHeaders ? (responseHeaders.get('woocommerce-session') || responseHeaders.get('x-woocommerce-session')) : null;
  const nonce = responseHeaders ? (responseHeaders.get('x-wc-store-api-nonce') || responseHeaders.get('X-WC-Store-API-Nonce')) : null;

  if (operation.operationName === 'AddToCart' || operation.operationName === 'GET_CART') {
    console.log(`[Apollo Afterware] Op: ${operation.operationName}, Session: ${session}, Nonce: ${nonce}`);
  }

  // Capture Nonce
  if (nonce && typeof window !== 'undefined') {
    localStorage.setItem('wc_nonce', nonce);
  }

  if (session && typeof window !== 'undefined') {
      if ('false' === session) {
        // Remove session data if session destroyed.
        localStorage.removeItem('woo-session');
        // Update session new data if changed.
      } else {
        // Always update session data if header is present
        localStorage.setItem(
          'woo-session',
          JSON.stringify({ token: session, createdTime: Date.now() }),
        );
      }
    }

    // Check for errors in response
    if (response.errors) {
      response.errors.forEach(err => {
        if (err.message === "The 'woocommerce-session' header is invalid") {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('woo-session');
            window.location.reload();
          }
        }
      })
    }

    return response;
  }),
);

const clientSide = typeof window === 'undefined';

// Determine the base URL for SSR
const getServerUrl = () => {
  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3000';
  }
  // In production (deployed), use the actual domain
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  // In development, use localhost
  return 'http://localhost:3000';
};

// Apollo GraphQL client.
const serverGraphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL;
const isServer = typeof window === 'undefined';
const linkUri = isServer
  ? (serverGraphqlUrl || `${getServerUrl()}/api/graphql`)
  : '/api/graphql';
const linkCredentials = isServer && serverGraphqlUrl ? 'omit' : 'include';

/**
 * Custom fetch wrapper to capture session headers directly from the response.
 * This ensures session tokens are saved even if Apollo Link context doesn't propagate headers.
 */
const customFetch = async (uri, options) => {
  const response = await fetch(uri, options);

  if (typeof window !== 'undefined') {
    const sessionHeader = response.headers.get('woocommerce-session') || 
                          response.headers.get('x-woocommerce-session');
    
    const nonceHeader = response.headers.get('x-wc-store-api-nonce') || 
                        response.headers.get('X-WC-Store-API-Nonce');

    if (sessionHeader) {
      console.log('[Apollo customFetch] Captured Session Header:', sessionHeader);
      localStorage.setItem(
        'woo-session',
        JSON.stringify({ token: sessionHeader, createdTime: Date.now() }),
      );
    }

    if (nonceHeader) {
      console.log('[Apollo customFetch] Captured Nonce Header:', nonceHeader);
      localStorage.setItem('wc_nonce', nonceHeader);
    }
  }

  return response;
};

const client = new ApolloClient({
  ssrMode: clientSide,
  link: middleware.concat(
    afterware.concat(
      createHttpLink({
        // ALWAYS use /api/graphql proxy for session isolation
        // This prevents cookies from being sent to api.shopwice.com
        uri: linkUri,
        fetch: customFetch,
        credentials: linkCredentials, // Include credentials for OUR domain only
      }),
    ),
  ),
  cache: new InMemoryCache({
    possibleTypes: {
      Product: ['SimpleProduct', 'VariableProduct', 'ExternalProduct', 'GroupProduct'],
    },
    typePolicies: {
      Query: {
        fields: {
          products: {
            keyArgs: ['where'],
            merge(existing, incoming, { args }) {
              if (!existing) return incoming;
              const { after } = args || {};
              if (after) {
                return {
                  ...incoming,
                  nodes: [...(existing.nodes || []), ...(incoming.nodes || [])],
                };
              }
              return incoming;
            },
          },
        },
      },
      // Disable automatic normalization for Product types to avoid missing field errors
      // Products will be cached by query instead of by ID
      Product: {
        keyFields: false,
        fields: {
          // Handle nullable fields gracefully
          databaseId: { read(existing) { return existing || null; } },
          date: { read(existing) { return existing || null; } },
          averageRating: { read(existing) { return existing || null; } },
          reviewCount: { read(existing) { return existing || null; } },
          stockQuantity: { read(existing) { return existing || null; } },
          image: { read(existing) { return existing || null; } },
          productCategories: {
            read(existing) { return existing || { nodes: [] }; },
            merge(existing, incoming) { return incoming || { nodes: [] }; },
          },
          productBrand: {
            read(existing) { return existing || { nodes: [] }; },
            merge(existing, incoming) { return incoming || { nodes: [] }; },
          },
          productLocation: {
            read(existing) { return existing || { nodes: [] }; },
            merge(existing, incoming) { return incoming || { nodes: [] }; },
          },
          attributes: {
            read(existing) { return existing || { nodes: [] }; },
            merge(existing, incoming) { return incoming || { nodes: [] }; },
          },
        },
      },
      ProductCategory: { keyFields: ['slug'] },
      Cart: {
        fields: {
          contents: { merge(existing, incoming) { return incoming; } },
          total: { merge(existing, incoming) { return incoming; } },
          items: { merge(existing, incoming) { return incoming; } },
          itemCount: { merge(existing, incoming) { return incoming; } },
          totals: { merge(existing, incoming) { return incoming; } },
        },
      },
      CartItem: {
        keyFields: ['key'],
        fields: {
          quantity: { merge(existing, incoming) { return incoming; } },
          total: { merge(existing, incoming) { return incoming; } },
        },
      },
      VariableProduct: {
        keyFields: false,
        fields: {
          variations: {
            merge(existing, incoming) { return incoming; },
          },
        },
      },
      ProductVariation: { keyFields: false },
      SimpleProduct: { keyFields: false },
      ExternalProduct: { keyFields: false },
      GroupProduct: { keyFields: false },
      MediaItem: { keyFields: ['id'] },
      TermNode: { keyFields: false },
      Attribute: {
        keyFields: false,
        fields: {
          nodes: {
            read(existing) { return existing || []; },
            merge(existing, incoming) { return incoming || []; },
          },
        },
      },
    },
  }),
});

export default client;
