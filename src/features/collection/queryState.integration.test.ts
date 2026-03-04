import { describe, expect, it } from 'vitest';
import {
  buildCollectionUrlFromState,
  mergeCollectionQueryWithPreservedParams,
  parseAsPathQuery,
  parseCollectionFilterState,
} from './queryState';

describe('collection state <-> URL integration', () => {
  it('preserves unmanaged query params while updating managed filters', () => {
    const currentAsPath = '/products?utm_source=ad&brand=avon&page=3';
    const currentQuery = parseAsPathQuery(currentAsPath);
    const state = parseCollectionFilterState(currentQuery, { defaultPerPage: 24 });
    state.brand = ['nike', 'adidas'];
    state.page = 1;

    const merged = mergeCollectionQueryWithPreservedParams(state, currentQuery, {
      defaultPerPage: 24,
    });

    expect(merged.utm_source).toBe('ad');
    expect(merged.brand).toBe('nike,adidas');
    expect(merged.page).toBeUndefined();
  });

  it('keeps category route URLs clean while still serializing other filters', () => {
    const state = parseCollectionFilterState(
      {
        category: '126',
        brand: 'samsung',
        page: '2',
      },
      {
        defaultPerPage: 24,
        routeScope: { taxonomy: 'category', value: '126' },
      },
    );

    const url = buildCollectionUrlFromState('/product-category/electronics', state, {}, {
      defaultPerPage: 24,
      routeScope: { taxonomy: 'category', value: '126' },
      includePagination: true,
    });

    expect(url).toContain('/product-category/electronics');
    expect(url).toContain('brand=samsung');
    expect(url).toContain('page=2');
    expect(url).not.toContain('category=');
  });

  it('round-trips parser/serializer behavior for attribute filters', () => {
    const parsed = parseCollectionFilterState(
      {
        pa_color: 'black,white',
        attr_storage: '128gb',
        search: 'headphones',
      },
      { defaultPerPage: 24 },
    );

    const url = buildCollectionUrlFromState('/products', parsed, {}, {
      defaultPerPage: 24,
      includePagination: true,
    });

    const roundTrip = parseCollectionFilterState(parseAsPathQuery(url), {
      defaultPerPage: 24,
    });

    expect(roundTrip.search).toBe('headphones');
    expect(roundTrip.attributes.color).toEqual(['black', 'white']);
    expect(roundTrip.attributes.storage).toEqual(['128gb']);
  });
});
