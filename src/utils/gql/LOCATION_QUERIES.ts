import { gql } from '@apollo/client';
import { PRODUCT_CARD_FIELDS_FRAGMENT } from './GQL_QUERIES';

// For location pages - fetch products and filter client-side
export const GET_LOCATION_PRODUCTS = gql`
  query LocationProducts($after: String) {
    products(first: 1000, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ...ProductCardFields
      }
    }
  }
  ${PRODUCT_CARD_FIELDS_FRAGMENT}
`;

export const GET_LOCATION_DATA_BY_SLUG = gql`
  query LocationData($slug: ID!, $after: String) {
    productLocation(id: $slug, idType: SLUG) {
      id
      name
    }
    products(
      first: 50
      after: $after
      where: { 
        taxQuery: { taxArray: [{ taxonomy: PRODUCTLOCATION, field: SLUG, terms: [$slug] }] } 
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ...ProductCardFields
      }
    }
  }
  ${PRODUCT_CARD_FIELDS_FRAGMENT}
`;

export const GET_LOCATION_DATA_BY_SLUG_WITH_ATTRIBUTE = gql`
  query LocationDataWithAttribute($slug: ID!, $attrTax: TaxonomyEnum!, $attrTerm: [String]!, $after: String) {
    productLocation(id: $slug, idType: SLUG) {
      id
      name
    }
    products(
      first: 50
      after: $after
      where: {
        taxQuery: {
          taxArray: [
            {
              taxonomy: PRODUCTLOCATION
              field: SLUG
              terms: [$slug]
            }
            {
              taxonomy: $attrTax
              field: NAME
              terms: $attrTerm
            }
          ]
        }
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ...ProductCardFields
      }
    }
  }
  ${PRODUCT_CARD_FIELDS_FRAGMENT}
`;
