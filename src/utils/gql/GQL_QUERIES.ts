import { gql } from '@apollo/client';
import {
  IMAGE_FIELDS,
  TERM_FIELDS,
  PRICING_FIELDS,
  VARIATION_FIELDS,
} from './FRAGMENTS';

/**
 * Product Card Fields Fragment
 * Optimized with reusable fragments for better cache normalization
 */
export const PRODUCT_CARD_FIELDS_FRAGMENT = gql`
  fragment ProductCardFields on Product {
    id
    databaseId
    name
    slug
    date
    averageRating
    reviewCount
    onSale
    stockQuantity

    image {
      ...ImageFields
    }

    ...PricingFields

    productCategories {
      nodes {
        ...TermFields
      }
    }

    attributes {
      nodes {
        id
        name
        label
        options
        variation
        visible
      }
    }
  }

  ${IMAGE_FIELDS}
  ${TERM_FIELDS}
  ${PRICING_FIELDS}
`;

/**
 * Lightweight Product Card Fields Fragment
 * Used for Homepage sections to reduce payload size
 */
export const HOME_PRODUCT_CARD_FIELDS_FRAGMENT = gql`
  fragment HomeProductCardFields on Product {
  id
  databaseId
  name
  slug
  averageRating
  reviewCount
  onSale
  stockQuantity
    image {
    id
    sourceUrl
    altText
  }
    ...PricingFields
    productCategories {
      nodes {
      id
      databaseId
      name
      slug
    }
  }
    attributes {
      nodes {
      id
      name
      options
    }
  }
}
  ${PRICING_FIELDS}
`;

export const GET_SINGLE_PRODUCT = gql`
  query Product($slug: String!) {
    products(first: 1, where: { search: $slug }) {
      nodes {
        ...ProductCardFields
        description
        shortDescription
        stockStatus

        galleryImages {
          nodes {
            ...ImageFields
          }
        }
        productCategories {
          nodes {
            id
            name
            slug
          }
        }
        reviews {
          nodes {
            id
            content
            date
            rating
            author {
              node {
                name
              }
            }
          }
        }
        seo {
          title
          description
          fullHead
        }

        # ... on SimpleProduct {
        #   sku
        #   totalSales
        # }
        # ... on VariableProduct {
        #   sku
        #   totalSales
        #   allPaColor {
        #     nodes {
        #       name
        #     }
        #   }
        #   allPaSize {
        #     nodes {
        #       name
        #     }
        #   }
        #   variations(first: 50) {
        #     nodes {
        #       ...VariationFields
        #     }
        #   }
        # }
      }
    }
  }

  ${PRODUCT_CARD_FIELDS_FRAGMENT}
  ${VARIATION_FIELDS}
`;

/**
 * Fetch first 4 products from a specific category
 */

export const FETCH_FIRST_PRODUCTS_FROM_HOODIES_QUERY = `
 query MyQuery {
  products(first: 4, where: { taxQuery: { taxArray: [{ taxonomy: PRODUCTCAT, field: SLUG, terms: ["hoodies"] }] } }) {
    nodes {
      databaseId
      name
      onSale
      slug
      image {
        sourceUrl
      }
      ... on SimpleProduct {
        price
        regularPrice
        salePrice
      }
      ... on VariableProduct {
        price
        regularPrice
        salePrice
      }
    }
  }
}
`;

/**
 * Fetch first 200 Woocommerce products from GraphQL
 */
export const FETCH_ALL_PRODUCTS_QUERY = gql`
  query MyQuery($after: String) {
  products(first: 200, after: $after) {
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

/**
 * Fetch first 20 categories from GraphQL
 */
export const FETCH_ALL_CATEGORIES_QUERY = gql`
  query Categories {
  productCategories {
      nodes {
      id
      databaseId
      name
      slug
      parent
      image {
        id
        sourceUrl
        altText
      }
    }
  }
}
`;

export const GET_CATEGORY_DATA_BY_SLUG = gql`
  query CategoryData($slug: [String]!, $first: Int = 24, $after: String) {
    productCategories {
      nodes {
        databaseId
        name
        description
        count
        slug
        parent
      }
    }
    products(
      first: $first,
      after: $after,
      where: {
        taxQuery: {
          taxArray: [
            {
              taxonomy: PRODUCTCAT
              field: SLUG
              terms: $slug
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

export const GET_CATEGORY_NODE_BY_SLUG = gql`
  query CategoryNodeBySlug {
    productCategories {
      nodes {
        databaseId
        name
        description
        count
        slug
        parent
      }
    }
  }
`;

export const GET_CATEGORY_PRODUCTS_BY_ID = gql`
  query CategoryProductsById($categoryId: Int!, $first: Int = 24, $after: String) {
    products(
      first: $first
      after: $after
      where: {
        categoryId: $categoryId
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

export const GET_CATEGORY_PRODUCTS_BY_ID_WITH_ATTRIBUTE = gql`
  query CategoryProductsByIdWithAttribute(
    $categoryId: Int!
    $attrTax: TaxonomyEnum!
    $attrTerm: [String]!
    $first: Int = 24
    $after: String
  ) {
    products(
      first: $first
      after: $after
      where: {
        categoryId: $categoryId
        taxQuery: {
          taxArray: [
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

export const GET_ATTRIBUTE_PRODUCTS_BY_TERM = gql`
  query AttributeProducts($term: [String]!, $first: Int = 24, $after: String) {
    products(
      first: $first,
      after: $after,
      where: {
        taxQuery: {
          taxArray: [
            {
              taxonomy: PA_CONDITION,
              field: NAME,
              terms: $term
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

export const GET_CATEGORY_DATA_BY_SLUG_WITH_ATTRIBUTE = gql`
  query CategoryDataWithAttribute(
    $slug: [String]!
    $attrTax: TaxonomyEnum!
    $attrTerm: [String]!
    $first: Int = 24
    $after: String
  ) {
    productCategories {
      nodes {
        databaseId
        name
        description
        count
        slug
        parent
      }
    }
    products(
      first: $first,
      after: $after,
      where: {
        taxonomyFilter: {
          filters: [
            { taxonomy: PRODUCTCATEGORY, terms: $slug }
            { taxonomy: $attrTax, terms: $attrTerm }
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

export const GET_CART = gql`
  query GET_CART {
    cart {
      contents {
        nodes {
        key
          product {
            node {
              id
              databaseId
              name
              slug
              type
              image {
                id
                sourceUrl
                altText
                srcSet
                title
              }
              ... on ProductWithPricing {
                price
                regularPrice
                salePrice
              }
              ... on InventoriedProduct {
                stockQuantity
                stockStatus
              }
            }
          }
          variation {
            node {
              id
              databaseId
              name
              type
              image {
                id
                sourceUrl
                altText
                srcSet
                title
              }
              ... on ProductWithPricing {
                price
                regularPrice
                salePrice
              }
              ... on InventoriedProduct {
                stockQuantity
                stockStatus
              }
              attributes {
                nodes {
                  id
                  attributeId
                  name
                  value
                }
              }
            }
          }
          quantity
          total
          subtotal
        }
      }
      total
      subtotal
      shippingTotal
      feeTotal
      discountTotal
      availableShippingMethods {
        packageDetails
        supportsShippingCalculator
        rates {
          id
          methodId
          label
          cost
        }
      }
      chosenShippingMethods
    }
  }
`;

export const GET_CURRENT_USER = gql`
  query GET_CURRENT_USER {
    customer {
    id
    firstName
    lastName
    email
  }
}
  ${PRODUCT_CARD_FIELDS_FRAGMENT}
  ${IMAGE_FIELDS}
  ${VARIATION_FIELDS}
`;

export const GET_CUSTOMER_ORDERS = gql`
  query GET_CUSTOMER_ORDERS {
    customer {
      orders {
        nodes {
        id
        orderNumber
        status
        total
        date
      }
    }
  }
}
`;

export const GET_CUSTOMER_DASHBOARD_DATA = gql`
  query GET_CUSTOMER_DASHBOARD_DATA {
    customer {
    id
    firstName
    lastName
    email
    username
      billing {
      firstName
      lastName
      address1
      address2
      city
      country
      state
      postcode
      email
      phone
    }
      shipping {
      firstName
      lastName
      address1
      address2
      city
      country
      state
      postcode
    }
    orders(first: 10) {
        nodes {
        id
        orderNumber
        status
        total
        date
      }
    }
  }
}
`;

export const FETCH_ALL_LOCATIONS_QUERY = gql`
  query Locations {
  productLocations(first: 100) {
      nodes {
      id
      name
      slug
    }
  }
}
`;

export const GET_PAYMENT_GATEWAYS = gql`
  query GET_PAYMENT_GATEWAYS {
    paymentGateways {
      nodes {
      id
      title
      description
      icon
    }
  }
}
`;

export const GET_ALLOWED_COUNTRIES = gql`
  query GET_ALLOWED_COUNTRIES {
    wooCommerce {
      countries {
      code
      name
        states {
        code
        name
      }
    }
  }
}
`;
export const SEARCH_PRODUCTS_QUERY = gql`
  query SearchProducts($search: String!, $first: Int = 20, $after: String) {
  products(first: $first, after: $after, where: { search: $search }) {
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

export const GET_404_PAGE_PRODUCTS = gql`
  query Get404PageProducts {
  bestSellers: products(first: 5) {
      nodes {
        ...ProductCardFields
    }
  }
  newest: products(first: 5) {
      nodes {
        ...ProductCardFields
    }
  }
  topRated: products(first: 5) {
      nodes {
        ...ProductCardFields
    }
  }
}
  ${PRODUCT_CARD_FIELDS_FRAGMENT}
`;

export const FETCH_TOP_RATED_PRODUCTS_QUERY = gql`
  query FetchTopRatedProducts {
  products(first: 12) {
      nodes {
        ...ProductCardFields
    }
  }
}
  ${PRODUCT_CARD_FIELDS_FRAGMENT}
`;

export const FETCH_BEST_SELLING_PRODUCTS_QUERY = gql`
  query FetchBestSellingProducts {
  products(first: 12) {
      nodes {
        ...ProductCardFields
    }
  }
}
  ${PRODUCT_CARD_FIELDS_FRAGMENT}
`;


export const FETCH_AIR_CONDITIONER_PRODUCTS_QUERY = gql`
  query FetchAirConditionerProducts {
  products(first: 12, where: { taxQuery: { taxArray: [{ taxonomy: PRODUCTCAT, field: SLUG, terms: ["air-conditioners"] }] } }) {
      nodes {
        ...ProductCardFields
    }
  }
}
  ${PRODUCT_CARD_FIELDS_FRAGMENT}
`;

export const FETCH_MOBILE_PHONES_ON_SALE_QUERY = gql`
  query FetchMobilePhonesOnSale {
  products(first: 12, where: { taxQuery: { taxArray: [{ taxonomy: PRODUCTCAT, field: SLUG, terms: ["mobile-phones"] }] } }) {
      nodes {
        ...ProductCardFields
    }
  }
}
  ${PRODUCT_CARD_FIELDS_FRAGMENT}
`;

export const FETCH_LAPTOPS_QUERY = gql`
  query FetchLaptops {
  products(first: 12, where: { taxQuery: { taxArray: [{ taxonomy: PRODUCTCAT, field: SLUG, terms: ["laptops"] }] } }) {
      nodes {
        ...ProductCardFields
    }
  }
}
  ${PRODUCT_CARD_FIELDS_FRAGMENT}
`;

export const FETCH_SPEAKERS_QUERY = gql`
  query FetchSpeakers {
  products(first: 12, where: { taxQuery: { taxArray: [{ taxonomy: PRODUCTCAT, field: SLUG, terms: ["speakers"] }] } }) {
      nodes {
        ...ProductCardFields
    }
  }
}
  ${PRODUCT_CARD_FIELDS_FRAGMENT}
`;

export const FETCH_TELEVISIONS_QUERY = gql`
  query FetchTelevisions {
  products(first: 12, where: { taxQuery: { taxArray: [{ taxonomy: PRODUCTCAT, field: SLUG, terms: ["televisions"] }] } }) {
      nodes {
        ...ProductCardFields
    }
  }
}
  ${PRODUCT_CARD_FIELDS_FRAGMENT}
`;

export const FETCH_PROMO_PRODUCT_QUERY = gql`
  query FetchPromoProduct($slug: ID!) {
  product(id: $slug) {
      ...ProductCardFields
  }
}
  ${PRODUCT_CARD_FIELDS_FRAGMENT}
`;


export const FETCH_HOME_PAGE_DATA = gql`
  query FetchHomePageData($promoProductSlug: ID!) {
  topRatedProducts: products(first: 12) {
      nodes {
        ...HomeProductCardFields
    }
  }
  bestSellingProducts: products(first: 12) {
      nodes {
        ...HomeProductCardFields
    }
  }
  airConditionerProducts: products(first: 12, where: { taxQuery: { taxArray: [{ taxonomy: PRODUCTCAT, field: SLUG, terms: ["air-conditioners"] }] } }) {
      nodes {
        ...HomeProductCardFields
    }
  }
  mobilePhonesOnSale: products(first: 12, where: { taxQuery: { taxArray: [{ taxonomy: PRODUCTCAT, field: SLUG, terms: ["mobile-phones"] }] } }) {
      nodes {
        ...HomeProductCardFields
    }
  }
  laptopsProducts: products(first: 12, where: { taxQuery: { taxArray: [{ taxonomy: PRODUCTCAT, field: SLUG, terms: ["laptops"] }] } }) {
      nodes {
        ...HomeProductCardFields
    }
  }
  speakersProducts: products(first: 12, where: { taxQuery: { taxArray: [{ taxonomy: PRODUCTCAT, field: SLUG, terms: ["speakers"] }] } }) {
      nodes {
        ...HomeProductCardFields
    }
  }
  televisionsProducts: products(first: 12, where: { taxQuery: { taxArray: [{ taxonomy: PRODUCTCAT, field: SLUG, terms: ["televisions"] }] } }) {
      nodes {
        ...HomeProductCardFields
    }
  }
  promoProduct: product(id: $promoProductSlug) {
      ...HomeProductCardFields
  }
}
  ${HOME_PRODUCT_CARD_FIELDS_FRAGMENT}
`;

export const FETCH_HOME_PAGE_SSG = gql`
  query FetchHomePageSsg($promoProductSlug: ID!) {
    topRatedProducts: products(first: 12) {
      nodes {
        ...HomeProductCardFields
      }
    }
    promoProduct: product(id: $promoProductSlug) {
      ...HomeProductCardFields
    }
  }
  ${HOME_PRODUCT_CARD_FIELDS_FRAGMENT}
`;

export const GET_RECENT_REVIEWS_QUERY = gql`
  query GetRecentReviews {
  products(first: 10, where: { search: "Refurbished" }) {
      nodes {
        ...ProductCardFields
        ... on Product {
        reviews(first: 3, where: { status: "APPROVE" }) {
            nodes {
            id
            date
            rating
            content
              author {
                node {
                name
                  avatar {
                  url
                }
              }
            }
          }
        }
      }
    }
  }
}
  ${PRODUCT_CARD_FIELDS_FRAGMENT}
`;
