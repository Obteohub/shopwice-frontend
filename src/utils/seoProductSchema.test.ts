import { describe, expect, it } from 'vitest';
import { enrichRankMathProductSchemas } from '@/utils/seoProductSchema';

describe('enrichRankMathProductSchemas', () => {
  it('enriches RankMath Product schema node in @graph with ecommerce signals', () => {
    const schemas = [
      {
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'BreadcrumbList', itemListElement: [] },
          { '@type': 'Product', name: 'Sample Product' },
        ],
      },
    ];

    const product = {
      sku: 'SKU-123',
      price: '1499',
      stockStatus: 'instock',
      currency: 'GHS',
      averageRating: 4.6,
      reviewCount: 12,
      brands: [{ name: 'Acme' }],
      images: [{ src: 'https://cdn.example.com/product.jpg' }],
      reviews: [
        {
          rating: 5,
          reviewer: 'Jane',
          review: 'Great product',
          dateCreated: '2026-01-10',
        },
      ],
    };

    const enriched = enrichRankMathProductSchemas(
      schemas,
      product,
      'https://web.shopwice.com/product/sample-product',
    );

    const graph = (enriched[0] as Record<string, any>)['@graph'] as Record<string, any>[];
    const productNode = graph.find((node) => node['@type'] === 'Product');

    expect(productNode).toBeTruthy();
    expect(productNode?.sku).toBe('SKU-123');
    expect(productNode?.brand?.name).toBe('Acme');
    expect(productNode?.offers?.price).toBe('1499');
    expect(productNode?.offers?.priceCurrency).toBe('GHS');
    expect(productNode?.offers?.availability).toBe('https://schema.org/InStock');
    expect(productNode?.aggregateRating?.ratingValue).toBe('4.6');
    expect(productNode?.aggregateRating?.reviewCount).toBe('12');
    expect(productNode?.review).toBeTruthy();
  });

  it('preserves non-product RankMath schema nodes', () => {
    const schemas = [
      {
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'BreadcrumbList', itemListElement: [{ position: 1, name: 'Home' }] },
          { '@type': 'WebSite', name: 'Shopwice' },
        ],
      },
    ];

    const enriched = enrichRankMathProductSchemas(
      schemas,
      { price: '100' },
      'https://web.shopwice.com/product/sample-product',
    );

    const graph = (enriched[0] as Record<string, any>)['@graph'] as Record<string, any>[];
    expect(graph.find((node) => node['@type'] === 'BreadcrumbList')).toBeTruthy();
    expect(graph.find((node) => node['@type'] === 'WebSite')).toBeTruthy();
    expect(graph.find((node) => node['@type'] === 'Product')).toBeFalsy();
  });
});

