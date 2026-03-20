import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRankMathSEO } from '@/utils/seo';

describe('getRankMathSEO', () => {
  const originalFetch = global.fetch;
  const originalWpUrl = process.env.NEXT_PUBLIC_WP_API_URL;
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_WP_API_URL = 'https://wp.test';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://frontend.test';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.NEXT_PUBLIC_WP_API_URL = originalWpUrl;
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    vi.restoreAllMocks();
  });

  it('returns null when RankMath API request fails', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;

    const result = await getRankMathSEO('https://frontend.test/product/test-product');
    expect(result).toBeNull();
  });

  it('requests backend-mirrored RankMath head first for product URLs', async () => {
    const fetchMock = vi.fn(async (requestUrl: RequestInfo | URL) => {
      const url = String(requestUrl);

      if (url.includes(encodeURIComponent('https://wp.test/product/rich-product-a'))) {
        return new Response(
          JSON.stringify({
            head: '<title>Rich Product A | Shopwice</title><meta name="description" content="Detailed product metadata from RankMath" /><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Product"},{"@type":"BreadcrumbList"}]}</script>',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      return new Response(JSON.stringify({ head: '' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getRankMathSEO('https://frontend.test/product/rich-product-a');

    expect(result).toContain('"@type":"Product"');
    expect(result).toContain('"@type":"BreadcrumbList"');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0] || '')).toContain(
      encodeURIComponent('https://wp.test/product/rich-product-a'),
    );
  });

  it('does not fall back to the frontend target for product URLs when the backend-mirrored head is empty', async () => {
    const fetchMock = vi.fn(async (requestUrl: RequestInfo | URL) => {
      const url = String(requestUrl);

      if (url.includes(encodeURIComponent('https://wp.test/product/fallback-product-b'))) {
        return new Response(JSON.stringify({ head: '' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url.includes(encodeURIComponent('https://frontend.test/product/fallback-product-b'))) {
        return new Response(
          JSON.stringify({
            head: '<title>Rich Product A | Shopwice</title><meta name="description" content="Detailed product metadata from the frontend target" /><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Product"},{"@type":"BreadcrumbList"}]}</script>',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      return new Response(JSON.stringify({ head: '' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getRankMathSEO('https://frontend.test/product/fallback-product-b');

    expect(result).toBe('');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('normalizes localhost URLs to the public site URL for RankMath requests', async () => {
    const fetchMock = vi.fn(async (requestUrl: RequestInfo | URL) => {
      void requestUrl;
      return new Response(
        JSON.stringify({
          head: '<title>Local Product | Shopwice</title><meta name="description" content="Local test product metadata from RankMath" />',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    await getRankMathSEO('http://localhost:3000/product/local-product');

    const firstRequest = String(fetchMock.mock.calls[0]?.[0] || '');
    expect(firstRequest).toContain(
      encodeURIComponent('https://wp.test/product/local-product'),
    );
    expect(firstRequest).not.toContain(
      encodeURIComponent('http://localhost:3000/product/local-product'),
    );
  });

  it('maps shopwice.com WP config to cms.shopwice.com and falls back to backend-mirrored archive URLs', async () => {
    process.env.NEXT_PUBLIC_WP_API_URL = 'https://shopwice.com';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://shopwice.com';

    const fetchMock = vi.fn(async (requestUrl: RequestInfo | URL) => {
      const url = String(requestUrl);

      if (url.includes(encodeURIComponent('https://shopwice.com/brand/avon/perfumes/men'))) {
        return new Response(JSON.stringify({
          code: 'rest_invalid_param',
          message: 'Invalid parameter(s): url',
          data: { status: 400 },
        }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url.includes(encodeURIComponent('https://cms.shopwice.com/brand/avon/perfumes/men'))) {
        return new Response(
          JSON.stringify({
            head: '<title>Avon Men Perfumes | Shopwice</title><meta name="description" content="Shop Avon Men perfumes on Shopwice." /><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"BreadcrumbList"},{"@type":"CollectionPage"}]}</script>',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      return new Response(JSON.stringify({ head: '' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getRankMathSEO('https://shopwice.com/brand/avon/perfumes/men');

    expect(result).toContain('Avon Men Perfumes | Shopwice');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0] || '')).toContain(
      encodeURIComponent('https://cms.shopwice.com/brand/avon/perfumes/men/'),
    );
  });

  it('requests backend-mirrored RankMath head first for the homepage', async () => {
    process.env.NEXT_PUBLIC_WP_API_URL = 'https://shopwice.com';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://shopwice.com';

    const fetchMock = vi.fn(async (requestUrl: RequestInfo | URL) => {
      const url = String(requestUrl);

      if (url.includes(encodeURIComponent('https://cms.shopwice.com/'))) {
        return new Response(
          JSON.stringify({
            head: '<title>Shop Online In Ghana | Shopwice</title><meta name="description" content="Shop online in Ghana on Shopwice." />',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      return new Response(JSON.stringify({ head: '' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getRankMathSEO('https://shopwice.com');

    expect(result).toContain('Shop Online In Ghana | Shopwice');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0] || '')).toContain(
      encodeURIComponent('https://cms.shopwice.com/'),
    );
  });

  it('does not cache collection Rank Math responses between calls', async () => {
    process.env.NEXT_PUBLIC_WP_API_URL = 'https://shopwice.com';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://shopwice.com';

    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          head: '<title>128GB Samsung Phones In Ghana | Buy Online At Shopwice</title>',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    global.fetch = fetchMock as unknown as typeof fetch;

    await getRankMathSEO('https://shopwice.com/collection/128gb-samsung-phones');
    await getRankMathSEO('https://shopwice.com/collection/128gb-samsung-phones');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

