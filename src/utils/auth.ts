import { api } from './api';
import { ENDPOINTS } from './endpoints';

// Token expiry buffer in milliseconds (5 minutes)
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

// Check if user has credentials
export function hasCredentials(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const authData = localStorage.getItem('auth-data');
  if (!authData) return false;

  try {
    const { authToken, expiresAt } = JSON.parse(authData);
    if (!authToken) return false;

    // If we stored an expiry time, check it
    if (expiresAt && Date.now() >= expiresAt - TOKEN_EXPIRY_BUFFER_MS) {
      // Token is expired or about to expire — clear it
      localStorage.removeItem('auth-data');
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// Get the auth token (returns null if expired)
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  const authData = localStorage.getItem('auth-data');
  if (!authData) return null;

  try {
    const { authToken, expiresAt } = JSON.parse(authData);
    if (!authToken) return null;

    // If we stored an expiry time, check it
    if (expiresAt && Date.now() >= expiresAt - TOKEN_EXPIRY_BUFFER_MS) {
      localStorage.removeItem('auth-data');
      return null;
    }

    return authToken;
  } catch {
    return null;
  }
}

/**
 * Parse a JWT and return its expiry timestamp in ms, or null if unavailable.
 */
function parseTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp) {
      return payload.exp * 1000; // Convert seconds → ms
    }
  } catch {
    // Not a JWT or malformed — ignore
  }
  return null;
}

/**
 * Map REST API errors to user-friendly messages
 */
function getErrorMessage(error: any): string {
  // Extract error details from ApiError response body
  const errorData = error?.data || {};
  const errorMessage = error?.message || '';
  
  // Check error code from response body first
  if (errorData.code) {
    const code = errorData.code;
    const message = errorData.message || '';

    if (code.includes('incorrect_password') || code.includes('invalid_username')) {
      return 'Invalid username or password. Please check your credentials and try again.';
    }
    if (code.includes('invalid_email')) {
      return 'Invalid email address. Please enter a valid email address.';
    }
    if (code.includes('empty_username')) {
      return 'Please enter username or email address.';
    }
    if (code.includes('empty_password')) {
      return 'Please enter password.';
    }
    if (code.includes('existing_user')) {
      return 'This username or email is already registered. Please use a different one or try logging in.';
    }

    return message.replace(/<[^>]*>/g, '').trim() || 'An error occurred. Please try again.';
  }

  // Check error property from response body (direct error message)
  if (errorData.error) {
    const errorStr = String(errorData.error).replace(/<[^>]*>/g, '').trim();
    if (errorStr) return errorStr;
  }

  // Fall back to error message from ApiError itself
  if (errorMessage && errorMessage !== 'API request failed') {
    return errorMessage.replace(/<[^>]*>/g, '').trim();
  }

  // Last resort
  return 'An unknown error occurred. Please try again later.';
}

/**
 * Persist auth data to localStorage, parsing token expiry if available.
 */
function persistAuthData(token: string, user: { email?: string; nicename?: string; displayName?: string }) {
  if (typeof window === 'undefined') return;

  const expiresAt = parseTokenExpiry(token);

  localStorage.setItem('auth-data', JSON.stringify({
    authToken: token,
    // No separate refresh token from the REST API — omit rather than duplicate
    user,
    ...(expiresAt ? { expiresAt } : {}),
  }));
}

/**
 * Login user via REST API
 */
export async function login(username: string, password: string) {
  try {
    if (!username || !password) {
      return { 
        success: false, 
        status: 'VALIDATION_ERROR',
        error: 'Username and password are required'
      };
    }

    const response: any = await api.post(ENDPOINTS.AUTH.LOGIN, { username, password });

    if (response.token) {
      const user = response.user || {};
      persistAuthData(response.token, {
        email: user.email || response.user_email || undefined,
        nicename: user.nicename || user.username || response.user_nicename || undefined,
        displayName: user.displayName || user.display_name || response.user_display_name || username,
      });
      console.info('[auth] Login successful');
      return { success: true, status: 'SUCCESS' };
    } else {
      console.error('[auth] Login failed - No token received:', response);
      throw new Error('Login failed. No token received from server.');
    }
  } catch (error: any) {
    const friendlyMessage = getErrorMessage(error);
    console.error('[auth] Login error:', {
      status: error?.status,
      message: error?.message,
      data: error?.data,
      friendlyMessage
    });
    return {
      success: false,
      status: 'LOGIN_ERROR',
      error: friendlyMessage
    };
  }
}

/**
 * Social login via app API route
 * Expects backend to exchange provider code/token and return a JWT-like token.
 */
export async function socialLogin(payload: Record<string, any>) {
  let data: any;
  const provider = String(payload?.provider || '').toLowerCase();
  const socialToken = payload?.token || payload?.access_token || payload?.id_token;
  const endpoint =
    provider === 'google' || provider === 'facebook'
      ? `/api/auth/${provider}`
      : '/api/auth/social-login';
  const requestBody =
    provider && socialToken
      ? { provider, token: socialToken, ...payload }
      : payload;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    data = await response.json();

    if (!response.ok) {
      const message = data?.message || data?.error || 'Social login failed.';
      throw new Error(message);
    }
  } catch (error: any) {
    // Re-throw with a consistent error message format
    throw new Error(getErrorMessage(error));
  }

  const token = data?.token || data?.authToken || data?.access_token;

  if (token) {
    const user = data?.user || {};
    persistAuthData(token, {
      email: user.email || data?.user_email || null,
      nicename: user.nicename || data?.user_nicename || null,
      displayName: user.displayName || data?.user_display_name || null,
    });
    return { success: true, status: 'SUCCESS' };
  }

  throw new Error('Social login failed. No token received.');
}

/**
 * Register user via REST API
 */
export async function register(data: any) {
  try {
    // Validate required fields
    if (!data.username || !data.email || !data.password) {
      console.warn('[auth] Registration validation failed - missing required fields');
      return {
        success: false,
        status: 'VALIDATION_ERROR',
        error: 'Username, email, and password are required'
      };
    }

    const response: any = await api.post(ENDPOINTS.AUTH.REGISTER, data);

    if (response.id) {
      console.info('[auth] Registration successful');
      return {
        success: true,
        status: 'REGISTRATION_SUCCESS',
        customer: {
          id: response.id,
          email: response.email,
          username: response.username,
        }
      };
    } else {
      console.error('[auth] Registration failed - No ID in response:', response);
      throw new Error('Registration failed. No user ID received from server.');
    }
  } catch (error: any) {
    const friendlyMessage = getErrorMessage(error);
    console.error('[auth] Registration error:', {
      status: error?.status,
      message: error?.message,
      data: error?.data,
      friendlyMessage
    });
    return {
      success: false,
      status: 'REGISTRATION_ERROR',
      error: friendlyMessage
    };
  }
}

/**
 * Logout user
 */
export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth-data');
    localStorage.removeItem('woo-session');
    localStorage.removeItem('wc-session');
    localStorage.removeItem('wc-store-api-nonce');
    localStorage.removeItem('wc_store_api_nonce');
    localStorage.removeItem('wc-cart-token');
    localStorage.removeItem('woocommerce-cart');
    localStorage.removeItem('cart-store');

    window.location.href = '/login';
  }
}
