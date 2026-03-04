import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import { login, socialLogin } from '@/utils/auth';
import { InputField } from '../Input/InputField.component';
import Button from '../UI/Button.component';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner.component';

interface ILoginData {
  username: string;
  password: string;
}

const GOOGLE_OAUTH_STATE_KEY = 'shopwice_google_oauth_state';

const loadScriptOnce = (id: string, src: string) =>
  new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is not available.'));
      return;
    }

    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });

const buildGoogleOAuthFallbackUrl = (clientId: string, redirectUri: string, state: string) => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    // Request both tokens and prefer id_token server-side handoff when available.
    response_type: 'id_token token',
    scope: 'openid profile email',
    include_granted_scopes: 'true',
    prompt: 'select_account',
    state,
    nonce: state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

const UserLogin = () => {
  const methods = useForm<ILoginData>();
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const hasHandledSocial = useRef(false);

  const completeSocialLogin = useCallback(async (provider: 'google' | 'facebook', token: string) => {
    const result = await socialLogin({ provider, token });
    if (result.success && result.status === 'SUCCESS') {
      await router.replace('/my-account');
      return;
    }
    throw new Error('Social login failed.');
  }, [router]);

  const loginWithGoogle = async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error('Google login is not configured.');
    }

    const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/login` : '';

    try {
      await loadScriptOnce('google-oauth-sdk', 'https://accounts.google.com/gsi/client');

      const googleApi = (window as any)?.google;
      if (!googleApi?.accounts?.oauth2?.initTokenClient) {
        throw new Error('Google login is unavailable right now.');
      }

      const token = await new Promise<string>((resolve, reject) => {
        const tokenClient = googleApi.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid profile email',
          callback: (response: any) => {
            if (response?.error) {
              reject(new Error('Google login was cancelled or failed.'));
              return;
            }
            const accessToken = response?.access_token;
            if (!accessToken) {
              reject(new Error('Google login did not return a token.'));
              return;
            }
            resolve(accessToken);
          },
          error_callback: () => reject(new Error('Google login was cancelled or failed.')),
        });

        tokenClient.requestAccessToken({ prompt: 'consent' });
      });

      await completeSocialLogin('google', token);
      return;
    } catch (error) {
      // Fallback path: redirect OAuth flow without loading Google JS SDK.
      if (!redirectUri) {
        throw error;
      }
      const state = `google_${Date.now()}`;
      sessionStorage.setItem(GOOGLE_OAUTH_STATE_KEY, state);
      const fallbackUrl = buildGoogleOAuthFallbackUrl(clientId, redirectUri, state);
      window.location.href = fallbackUrl;
    }
  };

  const loginWithFacebook = async () => {
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    if (!appId) {
      throw new Error('Facebook login is not configured.');
    }

    await loadScriptOnce('facebook-jssdk', 'https://connect.facebook.net/en_US/sdk.js');

    const fb = (window as any)?.FB;
    if (!fb?.init || !fb?.login) {
      throw new Error('Facebook login is unavailable right now.');
    }

    if (!(window as any).__shopwiceFbInitialized) {
      fb.init({
        appId,
        cookie: true,
        xfbml: false,
        version: 'v20.0',
      });
      (window as any).__shopwiceFbInitialized = true;
    }

    const token = await new Promise<string>((resolve, reject) => {
      fb.login(
        (response: any) => {
          const accessToken = response?.authResponse?.accessToken;
          if (!accessToken) {
            reject(new Error('Facebook login was cancelled or failed.'));
            return;
          }
          resolve(accessToken);
        },
        { scope: 'public_profile,email' },
      );
    });

    await completeSocialLogin('facebook', token);
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setSocialLoading(true);
    setError(null);

    try {
      if (provider === 'google') {
        await loginWithGoogle();
      } else {
        await loginWithFacebook();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Social login failed.';
      setError(message);
      console.error('[social-login] Failed:', err);
    } finally {
      setSocialLoading(false);
    }
  };

  const onSubmit = async (data: ILoginData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await login(data.username, data.password);
      
      if (result.success) {
        router.push('/my-account');
      } else {
        // Handle login error
        const errorMessage = result.error || 'Failed to log in. Please try again.';
        setError(errorMessage);
        console.error('Login failed:', {
          status: result.status,
          error: result.error
        });
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!router.isReady) return;

    // Check if redirected due to token expiration (401 response)
    const isExpired = router.query.expired === 'true';
    if (isExpired) {
      setError('Your session has expired. Please log in again.');
      // Remove the expired query param from URL
      router.replace('/login', undefined, { shallow: true });
      return;
    }

    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const hashAccessToken = hashParams.get('access_token');
      const hashIdToken = hashParams.get('id_token');
      const hashError =
        hashParams.get('error_description') || hashParams.get('error');
      const hashState = hashParams.get('state');

      if (hashAccessToken || hashIdToken || hashError) {
        const cleanUrl = `${window.location.pathname}${window.location.search}`;
        window.history.replaceState({}, document.title, cleanUrl);

        if (hashError) {
          setError(decodeURIComponent(hashError));
          sessionStorage.removeItem(GOOGLE_OAUTH_STATE_KEY);
          return;
        }

        const savedState = sessionStorage.getItem(GOOGLE_OAUTH_STATE_KEY);
        sessionStorage.removeItem(GOOGLE_OAUTH_STATE_KEY);
        if (savedState && hashState && savedState !== hashState) {
          setError('Google login state mismatch. Please try again.');
          return;
        }

        // Prefer id_token when available; backend validators commonly require JWT id token.
        const hashSocialToken = hashIdToken || hashAccessToken;
        if (hashSocialToken && !hasHandledSocial.current) {
          hasHandledSocial.current = true;
          setSocialLoading(true);
          setError(null);
          completeSocialLogin('google', hashSocialToken)
            .catch((err) => {
              setError(err instanceof Error ? err.message : 'Social login failed.');
              hasHandledSocial.current = false;
            })
            .finally(() => {
              setSocialLoading(false);
            });
        }

        return;
      }
    }

    if (hasHandledSocial.current) return;

    const provider = router.query.provider as string | undefined;
    const accessToken = router.query.access_token as string | undefined;
    const idToken = router.query.id_token as string | undefined;
    const token = router.query.token as string | undefined;
    const errorParam = router.query.error as string | undefined;

    if (!provider) return;

    if (errorParam) {
      setError(errorParam);
      return;
    }

    const normalizedProvider = provider?.toLowerCase();
    if (normalizedProvider !== 'google' && normalizedProvider !== 'facebook') return;

    // Prefer id_token when both exist.
    const socialToken = idToken || accessToken || token;
    if (!socialToken) return;

    hasHandledSocial.current = true;
    setSocialLoading(true);
    setError(null);

    completeSocialLogin(normalizedProvider, socialToken)
      .then((result) => {
        return result;
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Social login failed.');
        hasHandledSocial.current = false;
      })
      .finally(() => {
        setSocialLoading(false);
      });
  }, [completeSocialLogin, router.isReady, router.query, router]);

  const isBusy = loading || socialLoading;

  return (
    <div className="flex min-h-[calc(100vh-140px)] bg-white">
      {/* Left Side - Lifestyle Image (Hidden on Mobile) */}
      <div className="hidden lg:block lg:w-1/2 relative bg-gray-900">
        <Image
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
          layout="fill"
          objectFit="cover"
          alt="Lifestyle"
          className="opacity-70"
          priority
        />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-white max-w-lg">
            <h2 className="text-4xl font-bold mb-6">Welcome Back</h2>
            <p className="text-lg text-gray-200">Shop the world&apos;s best brands with confidence. Your premium shopping experience awaits.</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-24 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Log in</h1>
            <p className="mt-2 text-sm text-gray-600">
              New here?{' '}
              <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Create an account
              </Link>
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-md py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Continue with Google"
              disabled={isBusy}
            >
              <span className="text-base">G</span>
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin('facebook')}
              className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-md py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Continue with Facebook"
              disabled={isBusy}
            >
              <span className="text-base">f</span>
              Continue with Facebook
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />
            or
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
              <InputField
                inputName="username"
                inputLabel="Email address"
                type="text"
                customValidation={{ required: true }}
              />

              <div>
                <InputField
                  inputName="password"
                  inputLabel="Password"
                  type="password"
                  customValidation={{ required: true }}
                />
                <div className="flex items-center justify-end mt-1">
                  <Link href="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                    Forgot your password?
                  </Link>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <Button variant="primary" buttonDisabled={isBusy} className="w-full py-3 text-base flex justify-center">
                {isBusy ? <LoadingSpinner /> : 'Sign in'}
              </Button>
            </form>
          </FormProvider>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;
