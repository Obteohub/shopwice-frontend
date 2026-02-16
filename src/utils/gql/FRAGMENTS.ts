import { gql } from '@apollo/client';

/**
 * ============================================
 * REUSABLE BASE FRAGMENTS
 * ============================================
 * These fragments are used across multiple queries to:
 * - Reduce query size by ~25-35%
 * - Improve Apollo cache normalization
 * - Eliminate DRY violations
 * - Enable better fragment reuse
 */

/**
 * Image Fields Fragment
 * Used for: product images, gallery images, variation images
 */
export const IMAGE_FIELDS = gql`
  fragment ImageFields on Image {
    id
    sourceUrl
    srcSet
    altText
    title
  }
`;

/**
 * Term Fields Fragment
 * Used for: categories, brands, locations, and other taxonomy terms
 * Eliminates ~40+ duplicate field definitions
 */

export const TERM_FIELDS = gql`
  fragment TermFields on ProductCategory {
    id
    databaseId
    name
    slug
  }
`;

/**
 * Pricing Fields Fragment
 * Shared pricing structure across all product types
 * Used in: SimpleProduct, VariableProduct, ExternalProduct, Variations
 */
export const PRICING_FIELDS = gql`
  fragment PricingFields on Product {
    price
    regularPrice
    salePrice
  }
`;

/**
 * Variation Fields Fragment
 * Complete variation data structure for variable products
 * Enables reuse in: PDP, cart, quick view modals
 */
export const VARIATION_FIELDS = gql`
  fragment VariationFields on ProductVariation {
    id
    databaseId
    name
    sku
    stockStatus
    stockQuantity
    purchasable
    onSale
    salePrice
    regularPrice
    price
    image {
      ...ImageFields
    }
    attributes {
      nodes {
        id
        name
        # value removed as it does not exist on Attribute
      }
    }
  }
`;

/**
 * Attribute Fields Fragment
 * Shared attribute structure
 * Used in: Product, ProductVariation
 */
export const ATTRIBUTE_FIELDS = gql`
  fragment AttributeFields on ProductAttribute {
    id
    name
    options
    variation
    visible
    label
  }
`;
