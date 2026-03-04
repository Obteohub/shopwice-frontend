import { describe, expect, it } from 'vitest';
import { parseSeoHead } from '@/utils/parseSeoHead';

describe('parseSeoHead', () => {
  it('extracts all required fields from RankMath head html', async () => {
    const sampleHead = `
      <title>Sample Product Title</title>
      <meta name="description" content="Sample meta description" />
      <link rel="canonical" href="https://frontend.test/product/sample-product" />
      <meta name="robots" content="index, follow" />
      <meta property="og:title" content="OG Product Title" />
      <meta property="og:description" content="OG Product Description" />
      <meta property="og:image" content="https://frontend.test/images/og.jpg" />
      <meta property="og:url" content="https://frontend.test/product/sample-product" />
      <meta property="og:type" content="product" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Twitter Product Title" />
      <meta name="twitter:description" content="Twitter Product Description" />
      <meta name="twitter:image" content="https://frontend.test/images/twitter.jpg" />
      <link rel="prev" href="https://frontend.test/product-category/phones?page=1" />
      <link rel="next" href="https://frontend.test/product-category/phones?page=3" />
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList"}</script>
      <script type="application/ld+json">[{"@context":"https://schema.org","@type":"Product"}]</script>
    `;

    const seoData = await parseSeoHead(sampleHead);

    expect(seoData.title).toBe('Sample Product Title');
    expect(seoData.metaDescription).toBe('Sample meta description');
    expect(seoData.canonical).toBe('https://frontend.test/product/sample-product');
    expect(seoData.robots).toBe('index, follow');
    expect(seoData.ogTitle).toBe('OG Product Title');
    expect(seoData.ogDescription).toBe('OG Product Description');
    expect(seoData.ogImage).toBe('https://frontend.test/images/og.jpg');
    expect(seoData.ogUrl).toBe('https://frontend.test/product/sample-product');
    expect(seoData.ogType).toBe('product');
    expect(seoData.twitterCard).toBe('summary_large_image');
    expect(seoData.twitterTitle).toBe('Twitter Product Title');
    expect(seoData.twitterDescription).toBe('Twitter Product Description');
    expect(seoData.twitterImage).toBe('https://frontend.test/images/twitter.jpg');
    expect(seoData.prev).toBe('https://frontend.test/product-category/phones?page=1');
    expect(seoData.next).toBe('https://frontend.test/product-category/phones?page=3');
    expect(Array.isArray(seoData.jsonLd)).toBe(true);
    expect(seoData.jsonLd).toHaveLength(2);
  });
});

