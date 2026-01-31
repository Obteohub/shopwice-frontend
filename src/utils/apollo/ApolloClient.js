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
      headers['woocommerce-session'] = `Session ${token}`;
    }
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

    if (operation.operationName === 'addToCart' || operation.operationName === 'GET_CART') {
      console.log(`[Apollo Afterware] Op: ${operation.operationName}, Session Header:`, session);
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

// Apollo GraphQL client.
const client = new ApolloClient({
  ssrMode: clientSide,
  link: middleware.concat(
    afterware.concat(
      createHttpLink({
        // Use proxy on client to avoid CORS, absolute URL on server
        uri: typeof window === 'undefined' ? (process.env.NEXT_PUBLIC_GRAPHQL_URL || 'https://api.shopwice.com/graphql') : '/graphql',
        fetch,
        credentials: 'include',
      }),
    ),
  ),
  cache: new InMemoryCache(),
});

export default client;
