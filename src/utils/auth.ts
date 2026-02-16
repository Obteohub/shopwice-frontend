import { LOGIN_USER, CREATE_USER } from './gql/GQL_MUTATIONS';

/**
 * GraphQL Fetch Wrapper
 * 
 * Simple fetch-based GraphQL call to avoid circular dependencies with ApolloClient.js
 */
async function fetchGraphQL(mutation: any, variables: any) {
  const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'https://api.shopwice.com/graphql';
  
  const response = await fetch(graphqlUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: mutation.loc.source.body,
      variables,
    }),
  });

  return response.json();
}

// Check if user has credentials
export function hasCredentials() {
  if (typeof window === 'undefined') {
    return false;
  }
  const authData = localStorage.getItem('auth-data');
  return !!authData;
}

// Get the auth token
export async function getAuthToken() {
  if (typeof window === 'undefined') return null;
  const authData = localStorage.getItem('auth-data');
  if (authData) {
    const { authToken } = JSON.parse(authData);
    return authToken;
  }
  return null;
}

/**
 * Map GraphQL/REST errors to user-friendly messages
 */
function getErrorMessage(error: any): string {
  // Check for GraphQL errors
  if (error.graphQLErrors && error.graphQLErrors.length > 0) {
    const graphQLError = error.graphQLErrors[0];
    const message = graphQLError.message;

    // Map GraphQL error messages to user-friendly messages
    switch (message) {
      case 'invalid_username':
      case 'Invalid username.':
        return 'Invalid username or email address. Please check and try again.';
      case 'incorrect_password':
      case 'The password you entered for the username is incorrect.':
        return 'Incorrect password. Please check your password and try again.';
      case 'invalid_email':
        return 'Invalid email address. Please enter a valid email address.';
      case 'empty_username':
        return 'Please enter username or email address.';
      case 'empty_password':
        return 'Please enter password.';
      default:
        return message || 'Login failed. Please check your credentials and try again.';
    }
  }

  return error.message || 'An unknown error occurred. Please try again later.';
}

/**
 * Login user via GraphQL
 */
export async function login(username: string, password: string) {
  try {
    const result = await fetchGraphQL(LOGIN_USER, { username, password });

    if (result.errors) {
      throw { graphQLErrors: result.errors };
    }

    const loginData = result.data?.login;

    if (loginData && loginData.authToken) {
      // Store Auth Data
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth-data', JSON.stringify({
          authToken: loginData.authToken,
          refreshToken: loginData.refreshToken,
          user: loginData.user
        }));
      }
      return { success: true, status: 'SUCCESS' };
    } else {
      throw new Error('Login failed. No token received.');
    }
  } catch (error: any) {
    const userFriendlyMessage = getErrorMessage(error);
    throw new Error(userFriendlyMessage);
  }
}

/**
 * Register user via GraphQL
 */
export async function register(data: any) {
  try {
    const result = await fetchGraphQL(CREATE_USER, data);

    if (result.errors) {
      throw { graphQLErrors: result.errors };
    }

    const registerData = result.data?.registerCustomer;

    if (registerData && registerData.customer) {
      return { success: true, customer: registerData.customer };
    } else {
      throw new Error('Registration failed.');
    }
  } catch (error: any) {
    const userFriendlyMessage = getErrorMessage(error);
    throw new Error(userFriendlyMessage);
  }
}

/**
 * Logout user
 */
export async function logout() {
  if (typeof window !== 'undefined') {
    // Clear Auth Data
    localStorage.removeItem('auth-data');
    localStorage.removeItem('woo-session');

    // Redirect to login or home page after logout
    window.location.href = '/login';
  }
}
