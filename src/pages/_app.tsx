// Imports
import Router from 'next/router';
import NProgress from 'nprogress';
import { ApolloProvider } from '@apollo/client';

import client from '@/utils/apollo/ApolloClient';
import CartInitializer from '@/components/Cart/CartInitializer.component';
import GlobalInitializer from '@/components/GlobalInitializer.component';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Types
import type { AppProps } from 'next/app';

// Styles
import '@/styles/globals.css';
import 'nprogress/nprogress.css';

// NProgress
Router.events.on('routeChangeStart', () => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', () => NProgress.done());

import { DefaultSeo } from 'next-seo';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ApolloProvider client={client}>
      <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
        <DefaultSeo
          titleTemplate="%s | Shopwice"
          defaultTitle="Shopwice"
          openGraph={{
            type: 'website',
            locale: 'en_GB',
            url: 'https://shopwice.com/',
            siteName: 'Shopwice',
          }}
          twitter={{
            handle: '@shopwice',
            site: '@shopwice',
            cardType: 'summary_large_image',
          }}
        />
        <CartInitializer />
        <GlobalInitializer />
        <main className="font-sans">
          <Component {...pageProps} />
        </main>
      </GoogleOAuthProvider>
    </ApolloProvider>
  );
}

export default MyApp;
