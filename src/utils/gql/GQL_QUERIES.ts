import { gql } from '@apollo/client';

export const GET_SINGLE_PRODUCT = gql`
  query Product($slug: ID!) {
    product(id: $slug, idType: SLUG) {
      id
      databaseId
      averageRating
      reviewCount
      slug
      description
      shortDescription
      onSale
      image {
        id
        uri
        title
        srcSet
        sourceUrl
      }
      galleryImages {
        nodes {
          id
          sourceUrl
          srcSet
          title
        }
      }
      productCategories {
        nodes {
          name
          slug
          ancestors {
            nodes {
              name
              slug
            }
          }
        }
      }
      productBrand: terms(where: { taxonomies: PRODUCTBRAND }) {
        nodes {
          name
          slug
        }
      }
      reviews {
        nodes {
          id
          content
          date
          author {
            node {
              name
            }
          }
        }
      }
      name
      seo {
        title
        description
        fullHead
      }
      related(first: 12) {
        nodes {
          id
          databaseId
          name
          slug
          averageRating
          reviewCount
          image {
            id
            sourceUrl
            srcSet
          }
          ... on SimpleProduct {
            price
            regularPrice
            salePrice
            stockQuantity
            productCategories {
              nodes {
                name
                slug
              }
            }
            attributes {
              nodes {
                name
                options
              }
            }
          }
          ... on VariableProduct {
            price
            regularPrice
            salePrice
            stockQuantity
            productCategories {
              nodes {
                name
                slug
              }
            }
            attributes {
              nodes {
                name
                options
              }
            }
          }
        }
      }
      upsell(first: 12) {
        nodes {
          id
          databaseId
          name
          slug
          averageRating
          reviewCount
          image {
            id
            sourceUrl
            srcSet
          }
          ... on SimpleProduct {
            price
            regularPrice
            salePrice
            stockQuantity
            productCategories {
              nodes {
                name
                slug
              }
            }
            attributes {
              nodes {
                name
                options
              }
            }
          }
          ... on VariableProduct {
            price
            regularPrice
            salePrice
            stockQuantity
            productCategories {
              nodes {
                name
                slug
              }
            }
            attributes {
              nodes {
                name
                options
              }
            }
          }
        }
      }

      ... on SimpleProduct {
        salePrice
        regularPrice
        price
        id
        sku
        stockStatus
        stockQuantity
        totalSales
        crossSell(first: 12) {
        nodes {
          id
          databaseId
          name
          slug
          averageRating
          reviewCount
          image {
            id
            sourceUrl
            srcSet
          }
          ... on SimpleProduct {
            price
            regularPrice
            salePrice
            stockQuantity
            productCategories {
              nodes {
                name
                slug
              }
            }
            attributes {
              nodes {
                name
                options
              }
            }
          }
          ... on VariableProduct {
            price
            regularPrice
            salePrice
            stockQuantity
            productCategories {
              nodes {
                name
                slug
              }
            }
            attributes {
              nodes {
                name
                options
              }
            }
          }
        }
      }
      attributes {
            nodes {
              name
              options
            }
        }
      }
      ... on VariableProduct {
        salePrice
        regularPrice
        price
        id
        sku
        stockStatus
        totalSales
        crossSell(first: 12) {
        nodes {
          id
          databaseId
          name
          slug
          averageRating
          reviewCount
          image {
            id
            sourceUrl
            srcSet
          }
          ... on SimpleProduct {
            price
            regularPrice
            salePrice
            stockQuantity
            productCategories {
              nodes {
                name
                slug
              }
            }
            attributes {
              nodes {
                name
                options
              }
            }
          }
          ... on VariableProduct {
            price
            regularPrice
            salePrice
            stockQuantity
            productCategories {
              nodes {
                name
                slug
              }
            }
            attributes {
              nodes {
                name
                options
              }
            }
          }
        }
      }
        allPaColor {
          nodes {
            name
          }
        }
        allPaSize {
          nodes {
            name
          }
        }
        attributes {
            nodes {
              name
              options
            }
          }
        variations {
          nodes {
            id
            databaseId
            name
            stockStatus
            stockQuantity
            purchasable
            onSale
            salePrice
            regularPrice
          }
        }
      }
      ... on ExternalProduct {
        price
        id
        externalUrl
      }
      ... on GroupProduct {
        products {
          nodes {
            ... on SimpleProduct {
              id
              price
            }
          }
        }
        id
      }
    }
  }
`;

/**
 * Fetch first 4 products from a specific category
 */

export const FETCH_FIRST_PRODUCTS_FROM_HOODIES_QUERY = `
 query MyQuery {
  products(first: 4, where: {category: "Hoodies"}) {
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
    products(first: 24, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        databaseId
        name
        onSale
        slug
        averageRating
        image {
          sourceUrl
        }
        ... on SimpleProduct {
          databaseId
          price
          regularPrice
          salePrice
          productCategories {
            nodes {
              name
              slug
            }
          }
        }
        ... on VariableProduct {
          databaseId
          price
          regularPrice
          salePrice
          productCategories {
            nodes {
              name
              slug
            }
          }
          allPaColor {
            nodes {
              name
              slug
            }
          }
          allPaSize {
            nodes {
              name
            }
          }
          variations {
            nodes {
              price
              regularPrice
              salePrice
              attributes {
                nodes {
                  name
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Fetch first 20 categories from GraphQL
 */
export const FETCH_ALL_CATEGORIES_QUERY = gql`
  query Categories {
    productCategories(first: 50, where: { parent: 0 }) {
      nodes {
        id
        name
        slug
        children(first: 20) {
          nodes {
            id
            name
            slug
            children(first: 20) {
              nodes {
                id
                name
                slug
              }
            }
          }
        }
      }
    }
  }
`;

export const GET_CATEGORY_DATA_BY_SLUG = gql`
  query CategoryData($slug: String!, $id: ID!, $first: Int = 24, $after: String) {
    productCategory(id: $id, idType: SLUG) {
      id
      name
      description
      count
    }
    products(first: $first, after: $after, where: { category: $slug }) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        databaseId
        onSale
        averageRating
        slug
        description
        image {
          id
          uri
          title
          srcSet
          sourceUrl
        }
        name
        ... on SimpleProduct {
          salePrice
          regularPrice
          onSale
          price
          id
          productCategories {
            nodes {
              name
              slug
            }
          }
          productBrand: terms(where: { taxonomies: PRODUCTBRAND }) {
            nodes {
              name
              slug
            }
          }
          productLocation: terms(where: { taxonomies: PRODUCTLOCATION }) {
            nodes {
              name
              slug
            }
          }
          stockQuantity
          attributes {
            nodes {
              name
              options
            }
          }
        }
        ... on VariableProduct {
          salePrice
          regularPrice
          onSale
          price
          id
          productCategories {
            nodes {
              name
              slug
            }
          }
          productBrand: terms(where: { taxonomies: PRODUCTBRAND }) {
            nodes {
              name
              slug
            }
          }
          productLocation: terms(where: { taxonomies: PRODUCTLOCATION }) {
            nodes {
              name
              slug
            }
          }
          stockQuantity
          reviewCount
          attributes {
            nodes {
              name
              options
            }
          }
        }
        ... on ExternalProduct {
          price
          id
          externalUrl
        }
        ... on GroupProduct {
          products {
            nodes {
              ... on SimpleProduct {
                id
                price
              }
            }
          }
          id
        }
      }
    }
  }
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
              description
              type
              onSale
              slug
              averageRating
              reviewCount
              image {
                id
                sourceUrl
                srcSet
                altText
                title
              }
              galleryImages {
                nodes {
                  id
                  sourceUrl
                  srcSet
                  altText
                  title
                }
              }
            }
          }
          variation {
            node {
              id
              databaseId
              name
              description
              type
              onSale
              price
              regularPrice
              salePrice
              image {
                id
                sourceUrl
                srcSet
                altText
                title
              }
              attributes {
                nodes {
                  id
                  name
                  value
                }
              }
            }
          }
          quantity
          total
          subtotal
          subtotalTax
        }
      }

      subtotal
      subtotalTax
      shippingTax
      shippingTotal
      total
      totalTax
      feeTax
      feeTotal
      discountTax
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
        databaseId
        id
        name
        onSale
        slug
        averageRating
        reviewCount
        image {
          sourceUrl
        }
        ... on SimpleProduct {
          databaseId
          price
          regularPrice
          salePrice
          stockQuantity
          productCategories {
            nodes {
              name
              slug
            }
          }
           attributes {
            nodes {
              name
              options
            }
          }
        }
        ... on VariableProduct {
          databaseId
          price
          regularPrice
          salePrice
          stockQuantity
          productCategories {
            nodes {
              name
              slug
            }
          }
          attributes {
            nodes {
              name
              options
            }
          }
        }
      }
    }
  }

`;

export const GET_404_PAGE_PRODUCTS = gql`
  query Get404PageProducts {
    bestSellers: products(first: 5, where: { orderby: { field: TOTAL_SALES, order: DESC } }) {
      nodes {
        databaseId
        name
        onSale
        slug
        averageRating
        reviewCount
        image {
          sourceUrl
        }
        ... on SimpleProduct {
          price
          regularPrice
          salePrice
          productCategories {
            nodes {
              name
              slug
            }
          }
          stockQuantity
          attributes {
            nodes {
              name
              options
            }
          }
        }
        ... on VariableProduct {
          price
          regularPrice
          salePrice
          productCategories {
            nodes {
              name
              slug
            }
          }
          stockQuantity
          attributes {
            nodes {
              name
              options
            }
          }
        }
      }
    }
    newest: products(first: 5, where: { orderby: { field: DATE, order: DESC } }) {
      nodes {
        databaseId
        name
        onSale
        slug
        averageRating
        reviewCount
        image {
          sourceUrl
        }
        ... on SimpleProduct {
          price
          regularPrice
          salePrice
          productCategories {
            nodes {
              name
              slug
            }
          }
          stockQuantity
          attributes {
            nodes {
              name
              options
            }
          }
        }
        ... on VariableProduct {
          price
          regularPrice
          salePrice
          productCategories {
            nodes {
              name
              slug
            }
          }
          stockQuantity
          attributes {
            nodes {
              name
              options
            }
          }
        }
      }
    }
    topRated: products(first: 5, where: { orderby: { field: RATING, order: DESC } }) {
      nodes {
        databaseId
        name
        onSale
        slug
        averageRating
        reviewCount
        image {
          sourceUrl
        }
        ... on SimpleProduct {
          price
          regularPrice
          salePrice
          productCategories {
            nodes {
              name
              slug
            }
          }
          stockQuantity
          attributes {
            nodes {
              name
              options
            }
          }
        }
        ... on VariableProduct {
          price
          regularPrice
          salePrice
          productCategories {
            nodes {
              name
              slug
            }
          }
          stockQuantity
          attributes {
            nodes {
              name
              options
            }
          }
        }
      }
    }
  }
`;

export const FETCH_TOP_RATED_PRODUCTS_QUERY = gql`
  query FetchTopRatedProducts {
    products(first: 12, where: { orderby: { field: RATING, order: DESC } }) {
      nodes {
        databaseId
        name
        slug
        averageRating
        reviewCount
        onSale
        image {
          sourceUrl
        }
        ... on SimpleProduct {
          price
          regularPrice
          salePrice
          stockQuantity
          productCategories {
            nodes {
              name
              slug
            }
          }
          attributes {
            nodes {
              name
              options
            }
          }
        }
        ... on VariableProduct {
          price
          regularPrice
          salePrice
          stockQuantity
          productCategories {
            nodes {
              name
              slug
            }
          }
          attributes {
            nodes {
              name
              options
            }
          }
        }
      }
    }
  }
`;

export const FETCH_BEST_SELLING_PRODUCTS_QUERY = gql`
  query FetchBestSellingProducts {
    products(first: 12, where: { orderby: { field: TOTAL_SALES, order: DESC } }) {
      nodes {
        databaseId
        name
        slug
        averageRating
        reviewCount
        onSale
        image {
          sourceUrl
        }
        ... on SimpleProduct {
          price
          regularPrice
          salePrice
          stockQuantity
          productCategories {
            nodes {
              name
              slug
            }
          }
          attributes {
            nodes {
              name
              options
            }
          }
        }
        ... on VariableProduct {
          price
          regularPrice
          salePrice
          stockQuantity
          productCategories {
            nodes {
              name
              slug
            }
          }
          attributes {
            nodes {
              name
              options
            }
          }
        }
      }
    }
  }
`;


export const FETCH_AIR_CONDITIONER_PRODUCTS_QUERY = gql`
  query FetchAirConditionerProducts {
    products(first: 12, where: { category: "air-conditioners" }) {
      nodes {
        databaseId
        name
        slug
        averageRating
        reviewCount
        onSale
        image {
          sourceUrl
        }
        ... on SimpleProduct {
          price
          regularPrice
          salePrice
          stockQuantity
          productCategories {
            nodes {
              name
              slug
            }
          }
          attributes {
            nodes {
              name
              options
            }
          }
        }
        ... on VariableProduct {
          price
          regularPrice
          salePrice
          stockQuantity
          productCategories {
            nodes {
              name
              slug
            }
          }
          attributes {
            nodes {
              name
              options
            }
          }
        }
      }
    }
  }
`;

export const FETCH_MOBILE_PHONES_ON_SALE_QUERY = gql`
  query FetchMobilePhonesOnSale {
    products(first: 12, where: { category: "mobile-phones", onSale: true }) {
      nodes {
        databaseId
        name
        slug
        averageRating
        reviewCount
        onSale
        image {
          sourceUrl
        }
        ... on SimpleProduct {
          price
          regularPrice
          salePrice
          stockQuantity
          productCategories {
            nodes {
              name
              slug
            }
          }
          attributes {
            nodes {
              name
              options
            }
          }
        }
        ... on VariableProduct {
          price
          regularPrice
          salePrice
          stockQuantity
          productCategories {
            nodes {
              name
              slug
            }
          }
          attributes {
            nodes {
              name
              options
            }
          }
        }
      }
    }
  }
`;

export const FETCH_LAPTOPS_QUERY = gql`
  query FetchLaptops {
    products(first: 12, where: { category: "laptops" }) {
      nodes {
        databaseId
        name
        slug
        averageRating
        reviewCount
        onSale
        image {
          sourceUrl
        }
        ... on SimpleProduct {
          price
          regularPrice
          salePrice
          stockQuantity
          productCategories {
            nodes {
              name
              slug
            }
          }
          attributes {
            nodes {
              name
              options
            }
          }
        }
        ... on VariableProduct {
          price
          regularPrice
          salePrice
          stockQuantity
          productCategories {
            nodes {
              name
              slug
            }
          }
          attributes {
            nodes {
              name
              options
            }
          }
        }
      }
    }
  }
`;

export const FETCH_SPEAKERS_QUERY = gql`
  query FetchSpeakers {
    products(first: 12, where: { category: "speakers" }) {
      nodes {
        databaseId
        name
        slug
        averageRating
        reviewCount
        onSale
        image {
          sourceUrl
        }
        ... on SimpleProduct {
          price
          regularPrice
          salePrice
          stockQuantity
          productCategories {
            nodes {
              name
              slug
            }
          }
          attributes {
            nodes {
              name
              options
            }
          }
        }
        ... on VariableProduct {
          price
          regularPrice
          salePrice
          stockQuantity
          productCategories {
            nodes {
              name
              slug
            }
          }
          attributes {
            nodes {
              name
              options
            }
          }
        }
      }
    }
  }
`;

export const FETCH_TELEVISIONS_QUERY = gql`
  query FetchTelevisions {
    products(first: 12, where: { category: "televisions" }) {
      nodes {
        databaseId
        name
        slug
        averageRating
        reviewCount
        onSale
        image {
          sourceUrl
        }
        ... on SimpleProduct {
          price
          regularPrice
          salePrice
          stockQuantity
          productCategories {
            nodes {
              name
              slug
            }
          }
          attributes {
            nodes {
              name
              options
            }
          }
        }
        ... on VariableProduct {
          price
          regularPrice
          salePrice
          stockQuantity
          productCategories {
            nodes {
              name
              slug
            }
          }
          attributes {
            nodes {
              name
              options
            }
          }
        }
      }
    }
  }
`;

export const FETCH_PROMO_PRODUCT_QUERY = gql`
  query FetchPromoProduct($slug: ID!) {
    product(id: $slug, idType: SLUG) {
      databaseId
      name
      slug
      averageRating
      reviewCount
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
`;

export const GET_RECENT_REVIEWS_QUERY = gql`
  query GetRecentReviews {
    products(first: 10, where: { search: "Refurbished" }) {
      nodes {
        id
        name
        slug
        image {
          sourceUrl
        }
        ... on Product {
          reviews(first: 3, where: { status: "APPROVE" }) {
            nodes {
              id
              date
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
`;
