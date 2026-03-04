import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  const disableServiceWorker = process.env.NEXT_PUBLIC_ENABLE_PWA_SW !== 'true';

  return (
    <Html lang="en" suppressHydrationWarning>
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" href="/favicon.png" />
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
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
