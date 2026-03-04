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

  it('prefers backend-mirrored RankMath head when frontend head is generic for product URLs', async () => {
    const fetchMock = vi.fn(async (requestUrl: RequestInfo | URL) => {
      const url = String(requestUrl);

      if (url.includes(encodeURIComponent('https://frontend.test/product/rich-product-a'))) {
        return new Response(
          JSON.stringify({
            head: '<title>Shopwice</title><meta name="robots" content="follow, index" /><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"BreadcrumbList"}]}</script>',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

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
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('normalizes localhost URLs to the public site URL for RankMath requests', async () => {
    const fetchMock = vi.fn(async () => {
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
      encodeURIComponent('https://frontend.test/product/local-product'),
    );
    expect(firstRequest).not.toContain(
      encodeURIComponent('http://localhost:3000/product/local-product'),
    );
  });
});

