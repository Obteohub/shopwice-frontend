/*eslint complexity: ["error", 8]*/

import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  ApolloLink,
} from '@apollo/client';

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

const getLocalStorageJson = (key) => {
  if (typeof window === 'undefined') return null;
  return JSON.parse(localStorage.getItem(key));
};

const shouldLogSession = (operationName) =>
  operationName === 'addToCart' || operationName === 'GET_CART';

const getSessionHeader = (sessionData, operationName) => {
  if (!sessionData?.token || !sessionData?.createdTime || operationName === 'CreateUser') {
    return null;
  }

  const { token, createdTime } = sessionData;
  if (Date.now() - createdTime > SEVEN_DAYS) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('woo-session');
    }
    return null;
  }

  const cleanToken = token.replace(/^Session\s+/i, '');
  return `Session ${cleanToken}`;
};

const getAuthHeader = (authData, operationName) => {
  if (!authData?.authToken || operationName === 'CreateUser') return null;
  return `Bearer ${authData.authToken}`;
};

const getSessionFromHeaders = (headers) => {
  if (!headers) return null;
  return headers.get('woocommerce-session') || headers.get('x-woocommerce-session') || null;
};

const persistSession = (session) => {
  if (!session || typeof window === 'undefined') return;
  if (session === 'false') {
    localStorage.removeItem('woo-session');
    return;
  }
  localStorage.setItem(
    'woo-session',
    JSON.stringify({ token: session, createdTime: Date.now() }),
  );
};

const handleInvalidSession = (errors) => {
  if (!errors || typeof window === 'undefined') return;
  const invalid = errors.some((err) => err.message === "The 'woocommerce-session' header is invalid");
  if (invalid) {
    localStorage.removeItem('woo-session');
    window.location.reload();
  }
};

/**
 * Middleware operation
 * If we have a session token in localStorage, add it to the GraphQL request as a Session header.
 */
export const middleware = new ApolloLink((operation, forward) => {
  /**
   * If session data exist in local storage, set value as session header.
   */
  const sessionData = getLocalStorageJson('woo-session');
  const authData = getLocalStorageJson('auth-data');

  const headers = {};

  // Middleware Log
  if (shouldLogSession(operation.operationName)) {
    console.log(`[Apollo Middleware] Op: ${operation.operationName}, Session in Storage:`, sessionData);
  }

  const sessionHeader = getSessionHeader(sessionData, operation.operationName);
  if (sessionHeader) {
    headers['woocommerce-session'] = sessionHeader;
  }

  const authHeader = getAuthHeader(authData, operation.operationName);
  if (authHeader) {
    headers['Authorization'] = authHeader;
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
  const session = getSessionFromHeaders(responseHeaders);

  if (operation.operationName === 'AddToCart' || operation.operationName === 'GET_CART') {
    console.log(`[Apollo Afterware] Op: ${operation.operationName}, Session: ${session}`);
  }

  persistSession(session);
  handleInvalidSession(response.errors);

    return response;
  }),
);

const clientSide = typeof window === 'undefined';

// Apollo GraphQL client.
const linkUri = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'https://api.shopwice.com/graphql';
const linkCredentials = 'omit';

/**
 * Custom fetch wrapper to capture session headers directly from the response.
 * This ensures session tokens are saved even if Apollo Link context doesn't propagate headers.
 */
const customFetch = async (uri, options) => {
  const response = await fetch(uri, options);

  if (typeof window !== 'undefined') {
    const sessionHeader = response.headers.get('woocommerce-session') || 
                          response.headers.get('x-woocommerce-session');

    if (sessionHeader) {
      console.log('[Apollo customFetch] Captured Session Header:', sessionHeader);
      localStorage.setItem(
        'woo-session',
        JSON.stringify({ token: sessionHeader, createdTime: Date.now() }),
      );
    }

  }

  return response;
};

const client = new ApolloClient({
  ssrMode: clientSide,
  link: middleware.concat(
    afterware.concat(
      createHttpLink({
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
