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
      'https://staging.shopwice.com/product/sample-product',
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
      'https://staging.shopwice.com/product/sample-product',
    );

    const graph = (enriched[0] as Record<string, any>)['@graph'] as Record<string, any>[];
    expect(graph.find((node) => node['@type'] === 'BreadcrumbList')).toBeTruthy();
    expect(graph.find((node) => node['@type'] === 'WebSite')).toBeTruthy();
    expect(graph.find((node) => node['@type'] === 'Product')).toBeFalsy();
  });

  it('rewrites cms.shopwice.com schema entity URLs to the canonical frontend origin', () => {
    const schemas = [
      {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': 'https://cms.shopwice.com/#website',
            url: 'https://cms.shopwice.com',
          },
          {
            '@type': 'BreadcrumbList',
            '@id': 'https://cms.shopwice.com/product/sample-product/#breadcrumb',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                item: {
                  '@id': 'https://cms.shopwice.com/product-category/phones/',
                  name: 'Phones',
                },
              },
            ],
          },
          {
            '@type': 'Product',
            '@id': 'https://cms.shopwice.com/product/sample-product/#richSnippet',
            name: 'Sample Product',
            mainEntityOfPage: {
              '@id': 'https://cms.shopwice.com/product/sample-product/#webpage',
            },
            offers: {
              '@type': 'Offer',
              url: 'https://cms.shopwice.com/product/sample-product/',
            },
          },
          {
            '@type': 'Organization',
            '@id': 'https://cms.shopwice.com/#organization',
            url: 'https://cms.shopwice.com',
            logo: 'https://cms.shopwice.com/wp-content/uploads/2022/04/logo.png',
          },
        ],
      },
    ];

    const enriched = enrichRankMathProductSchemas(
      schemas,
      { price: '1499', stockStatus: 'instock', currency: 'GHS' },
      'https://shopwice.com/product/sample-product/',
    );

    const graph = (enriched[0] as Record<string, any>)['@graph'] as Record<string, any>[];
    const webSiteNode = graph.find((node) => node['@type'] === 'WebSite');
    const breadcrumbNode = graph.find((node) => node['@type'] === 'BreadcrumbList');
    const productNode = graph.find((node) => node['@type'] === 'Product');
    const orgNode = graph.find((node) => node['@type'] === 'Organization');

    expect(webSiteNode?.['@id']).toBe('https://shopwice.com/#website');
    expect(webSiteNode?.url).toBe('https://shopwice.com/');
    expect(breadcrumbNode?.['@id']).toBe('https://shopwice.com/product/sample-product/#breadcrumb');
    expect(breadcrumbNode?.itemListElement?.[0]?.item?.['@id']).toBe(
      'https://shopwice.com/product-category/phones/',
    );
    expect(productNode?.['@id']).toBe('https://shopwice.com/product/sample-product/#richSnippet');
    expect(productNode?.mainEntityOfPage?.['@id']).toBe(
      'https://shopwice.com/product/sample-product/#webpage',
    );
    expect(productNode?.offers?.url).toBe('https://shopwice.com/product/sample-product/');
    expect(orgNode?.['@id']).toBe('https://shopwice.com/#organization');
    expect(orgNode?.url).toBe('https://shopwice.com/');
    expect(orgNode?.logo).toBe('https://cms.shopwice.com/wp-content/uploads/2022/04/logo.png');
  });
});

