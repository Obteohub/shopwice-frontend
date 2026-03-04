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

function MyApp({ Component, pageProps }: AppProps) {
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
