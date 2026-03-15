// Imports
import Router from 'next/router';
import NProgress from 'nprogress';

import GlobalInitializer from '@/components/GlobalInitializer.component';
import InstallPrompt from '@/components/InstallPrompt/InstallPrompt.component';

// Types
import type { AppProps } from 'next/app';

// Styles
import '@/styles/globals.css';
import 'nprogress/nprogress.css';

// NProgress
Router.events.on('routeChangeStart', () => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', () => NProgress.done());

import { useEffect } from 'react';

const STAGING_RUNTIME_RESET_VERSION = '20260315-1';
const STAGING_RUNTIME_RESET_MARKER_KEY = 'shopwice-staging-runtime-reset';
const STAGING_RUNTIME_RESET_RELOAD_KEY = 'shopwice-staging-runtime-reset-reload';
const STAGING_STORAGE_KEYS_TO_CLEAR = [
  'auth-data',
  'cart-store',
  'location-storage',
  'shopwice-global-store',
  'shopwice_menu_cache',
  'wishlist',
  'woocommerce-cart',
  'woo-session',
  'wc-session',
  'wc-store-api-nonce',
  'wc_store_api_nonce',
  'wc-cart-token',
];

const clearStagingRuntimeState = async (version: string) => {
  if (typeof window === 'undefined') return false;

  try {
    const appliedVersion = window.localStorage.getItem(STAGING_RUNTIME_RESET_MARKER_KEY);
    if (appliedVersion === version) return false;

    STAGING_STORAGE_KEYS_TO_CLEAR.forEach((key) => {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore localStorage failures on restrictive browsers.
      }
    });

    try {
      window.sessionStorage.clear();
    } catch {
      // Ignore sessionStorage failures on restrictive browsers.
    }

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('shopwice-cache'))
          .map((key) => caches.delete(key)),
      );
    }

    window.localStorage.setItem(STAGING_RUNTIME_RESET_MARKER_KEY, version);
    return true;
  } catch {
    return false;
  }
};

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const isStagingRuntime = process.env.NEXT_PUBLIC_SITE_NOINDEX === 'true';
    if (!isStagingRuntime) return;

    const version = `${process.env.NEXT_PUBLIC_SITE_URL || 'staging'}:${STAGING_RUNTIME_RESET_VERSION}`;
    const reloadMarker = window.sessionStorage.getItem(STAGING_RUNTIME_RESET_RELOAD_KEY);

    void clearStagingRuntimeState(version).then((didReset) => {
      if (!didReset) {
        if (reloadMarker === version) {
          window.sessionStorage.removeItem(STAGING_RUNTIME_RESET_RELOAD_KEY);
        }
        return;
      }

      if (reloadMarker === version) {
        return;
      }

      window.sessionStorage.setItem(STAGING_RUNTIME_RESET_RELOAD_KEY, version);
      window.location.reload();
    });
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const enableServiceWorker = process.env.NEXT_PUBLIC_ENABLE_PWA_SW === 'true';
    const isProduction = process.env.NODE_ENV === 'production';

    // Default behavior is SW OFF to avoid stale shell/chunk blank screens.
    // Opt in explicitly with NEXT_PUBLIC_ENABLE_PWA_SW=true.
    if (!enableServiceWorker || !isProduction) {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          void registration.unregister();
        }
      });

      if ('caches' in window) {
        void caches.keys().then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith('shopwice-cache'))
              .map((key) => caches.delete(key)),
          ),
        );
      }
      return;
    }

    const registerServiceWorker = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Ignore service worker registration errors in UI runtime.
      });
    };

    window.addEventListener('load', registerServiceWorker);
    return () => {
      window.removeEventListener('load', registerServiceWorker);
    };
  }, []);

  return (
    <>
      <GlobalInitializer />
      <InstallPrompt />
      <main className="font-sans">
        <Component {...pageProps} />
      </main>
    </>
  );
}

export default MyApp;
