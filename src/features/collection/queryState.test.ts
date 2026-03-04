import { describe, expect, it } from 'vitest';
import {
  buildApiParamsFromFilterState,
  createDefaultCollectionFilterState,
  parseCollectionFilterState,
  serializeCollectionFilterState,
} from './queryState';

describe('collection query state parser/serializer', () => {
  it('parses all supported filter fields from query safely', () => {
    const state = parseCollectionFilterState(
      {
        search: 'samsung',
        category: '126',
        brand: 'apple,samsung',
        tag: 'phones,featured',
        location: 'accra,kumasi',
        minPrice: '100',
        maxPrice: '999',
        minRating: '3',
        maxRating: '5',
        stockStatus: 'instock,onbackorder',
        inStock: 'true',
        onSale: '1',
        page: '3',
        perPage: '24',
        orderby: 'price',
        order: 'ASC',
        pa_color: 'black,white',
        attr_storage: '128gb,256gb',
      },
      { defaultPerPage: 24 },
    );

    expect(state.search).toBe('samsung');
    expect(state.category).toBe('126');
    expect(state.brand).toEqual(['apple', 'samsung']);
    expect(state.tag).toEqual(['phones', 'featured']);
    expect(state.location).toEqual(['accra', 'kumasi']);
    expect(state.minPrice).toBe(100);
    expect(state.maxPrice).toBe(999);
    expect(state.minRating).toBe(3);
    expect(state.maxRating).toBe(5);
    expect(state.stockStatus).toEqual(['instock', 'onbackorder']);
    expect(state.inStock).toBe(true);
    expect(state.onSale).toBe(true);
    expect(state.page).toBe(3);
    expect(state.perPage).toBe(24);
    expect(state.orderby).toBe('price');
    expect(state.order).toBe('ASC');
    expect(state.attributes).toEqual({
      color: ['black', 'white'],
      storage: ['128gb', '256gb'],
    });
  });

  it('sanitizes invalid params and falls back to defaults', () => {
    const state = parseCollectionFilterState(
      {
        minPrice: 'abc',
        maxPrice: '',
        minRating: '10x',
        maxRating: 'x',
        stockStatus: 'instock,invalid-status',
        inStock: 'maybe',
        onSale: 'invalid',
        page: '-1',
        perPage: '0',
        orderby: 'unknown',
        order: 'UP',
      },
      { defaultPerPage: 24 },
    );

    expect(state.minPrice).toBeUndefined();
    expect(state.maxPrice).toBeUndefined();
    expect(state.minRating).toBeUndefined();
    expect(state.maxRating).toBeUndefined();
    expect(state.stockStatus).toEqual(['instock']);
    expect(state.inStock).toBeUndefined();
    expect(state.onSale).toBeUndefined();
    expect(state.page).toBe(1);
    expect(state.perPage).toBe(24);
    expect(state.orderby).toBeUndefined();
    expect(state.order).toBeUndefined();
  });

  it('serializes without route-scoped category and keeps attributes', () => {
    const state = createDefaultCollectionFilterState(24);
    state.search = 'phone';
    state.category = '126';
    state.brand = ['samsung'];
    state.attributes = {
      color: ['black'],
      storage: ['128gb', '256gb'],
    };
    state.page = 2;
    state.perPage = 24;

    const serialized = serializeCollectionFilterState(state, {
      defaultPerPage: 24,
      routeScope: { taxonomy: 'category', value: '126' },
      includePagination: true,
    });

    expect(serialized.category).toBeUndefined();
    expect(serialized.brand).toBe('samsung');
    expect(serialized.search).toBe('phone');
    expect(serialized.pa_color).toBe('black');
    expect(serialized.pa_storage).toBe('128gb,256gb');
    expect(serialized.page).toBe('2');
    expect(serialized.perPage).toBeUndefined();
  });

  it('maps state to API params with correct key names', () => {
    const state = parseCollectionFilterState(
      {
        search: 'perfume',
        category: '126',
        onSale: 'true',
        inStock: 'false',
        page: '4',
        perPage: '48',
      },
      { defaultPerPage: 24 },
    );

    const params = buildApiParamsFromFilterState(state, { includePagination: true });

    expect(params.search).toBe('perfume');
    expect(params.category).toBe('126');
    expect((params as Record<string, unknown>).categoryId).toBeUndefined();
    expect(params.onSale).toBe(true);
    expect(params.inStock).toBe(false);
    expect(params.page).toBe(4);
    expect(params.per_page).toBe(48);
  });

  it('uses category param for category route scope fallback', () => {
    const state = createDefaultCollectionFilterState(24);
    const params = buildApiParamsFromFilterState(state, {
      includePagination: true,
      routeScope: { taxonomy: 'category', value: '126' },
    });

    expect(params.category).toBe('126');
    expect((params as Record<string, unknown>).categoryId).toBeUndefined();
  });
});
