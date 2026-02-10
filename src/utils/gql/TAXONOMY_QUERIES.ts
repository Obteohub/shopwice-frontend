import { gql } from '@apollo/client';
import { PRODUCT_CARD_FIELDS_FRAGMENT } from './GQL_QUERIES';

// For brand pages - fetch products and filter client-side
export const GET_BRAND_PRODUCTS = gql`
  query BrandProducts($after: String) {
    products(first: 24, after: $after) {
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

export const GET_BRAND_DATA_BY_SLUG = gql`
  query BrandData($id: ID!, $slug: [String], $after: String) {
    productBrand(id: $id, idType: SLUG) {
      id
      name
      children {
        nodes {
          id
          name
          slug
        }
      }
    }
    products(
      first: 24
      after: $after
      where: { 
        taxonomyFilter: { 
          filters: [{ taxonomy: PRODUCT_BRAND, terms: $slug }] 
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

export const GET_BRAND_DATA_BY_SLUG_WITH_ATTRIBUTE = gql`
  query BrandDataWithAttribute($id: ID!, $slug: [String], $attrTax: TaxonomyEnum!, $attrTerm: [String]!, $after: String) {
    productBrand(id: $id, idType: SLUG) {
      id
      name
      children {
        nodes {
          id
          name
          slug
        }
      }
    }
    products(
      first: 24
      after: $after
      where: {
        taxQuery: {
          taxArray: [
            {
              taxonomy: PRODUCTBRAND
              field: SLUG
              terms: $slug
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
