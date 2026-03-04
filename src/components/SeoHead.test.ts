import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildSeoHeadModel,
  dedupeJsonLdSchemas,
  normalizeCanonicalToFrontend,
} from '@/components/SeoHead';

describe('SeoHead helpers', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const originalWpUrl = process.env.NEXT_PUBLIC_WP_API_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://frontend.test';
    process.env.NEXT_PUBLIC_WP_API_URL = 'https://backend.test';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    process.env.NEXT_PUBLIC_WP_API_URL = originalWpUrl;
  });

  it('does not produce duplicate og:title tags', () => {
    const model = buildSeoHeadModel({
      title: 'Title A',
      ogTitle: 'OG Title A',
      ogDescription: 'Description',
      canonical: 'https://frontend.test/product/a',
      jsonLd: [],
    });

    const ogTitleTags = model.metaTags.filter((meta) => meta.property === 'og:title');
    expect(ogTitleTags).toHaveLength(1);
  });

  it('canonical always starts with NEXT_PUBLIC_SITE_URL and strips tracking params', () => {
    const canonical = normalizeCanonicalToFrontend(
      'https://backend.test/product/phone?utm_source=google&fbclid=test123',
    );

    expect(canonical.startsWith('https://frontend.test')).toBe(true);
    expect(canonical.includes('utm_source')).toBe(false);
    expect(canonical.includes('fbclid')).toBe(false);
  });

  it('json-ld deduplication removes duplicate @type entries', () => {
    const deduped = dedupeJsonLdSchemas([
      { '@context': 'https://schema.org', '@type': 'Product', name: 'First Product' },
      { '@context': 'https://schema.org', '@type': 'Product', name: 'Duplicate Product' },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList' },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList' },
    ]);

    const productCount = deduped.filter((schema) => schema['@type'] === 'Product').length;
    const breadcrumbCount = deduped.filter((schema) => schema['@type'] === 'BreadcrumbList').length;

    expect(productCount).toBe(1);
    expect(breadcrumbCount).toBe(1);
  });
});

