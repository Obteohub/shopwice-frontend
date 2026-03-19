import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  const disableServiceWorker = String(process.env.NEXT_PUBLIC_ENABLE_PWA_SW || '').toLowerCase() === 'false';
  const googleTagManagerId = String(process.env.NEXT_PUBLIC_GTM_ID || '').trim();

  return (
    <Html lang="en" suppressHydrationWarning>
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="application-name" content="Shopwice" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Shopwice" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0C6DC9" />
        <meta name="msapplication-TileColor" content="#0C6DC9" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        {googleTagManagerId ? (
          <>
            <link rel="preconnect" href="https://www.googletagmanager.com" />
            <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
            <link rel="preconnect" href="https://www.google-analytics.com" />
            <link rel="dns-prefetch" href="https://www.google-analytics.com" />
          </>
        ) : null}
        {disableServiceWorker ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function () {
                  if (!('serviceWorker' in navigator)) return;
                  navigator.serviceWorker.getRegistrations().then(function (registrations) {
                    registrations.forEach(function (registration) { registration.unregister(); });
                  });
                  if ('caches' in window) {
                    caches.keys().then(function (keys) {
                      return Promise.all(
                        keys
                          .filter(function (key) { return key.indexOf('shopwice-cache') === 0; })
                          .map(function (key) { return caches.delete(key); })
                      );
                    });
                  }
                })();
              `,
            }}
          />
        ) : null}
      </Head>
      <body suppressHydrationWarning>
        {googleTagManagerId ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${googleTagManagerId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        ) : null}
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
