/**
 * ============================================
 * Shared Domain Interfaces
 * ============================================
 */

/**
 * Pricing Model (Shared by Product + Variation)
 */
export interface Pricing {
  price?: string | number | null;
  regularPrice?: string | number | null;
  salePrice?: string | number | null;
}

/**
 * Stock / Inventory Model (DRY)
 */
export type StockStatus =
  | 'IN_STOCK'
  | 'OUT_OF_STOCK'
  | 'ON_BACKORDER';

export interface StockInfo {
  stockQuantity?: number | null;
  stockStatus?: StockStatus;
}

/**
 * ============================================
 * Media
 * ============================================
 */

export interface Image {
  sourceUrl?: string | null;
  altText?: string | null;
}

/**
 * ============================================
 * Taxonomies
 * ============================================
 */

export interface ProductCategory {
  name: string;
  slug: string;
}

export interface Brand {
  name: string;
  slug: string;
}

export interface Location {
  name: string;
  slug: string;
}

/**
 * ============================================
 * Attributes
 * ============================================
 */

/**
 * Product Attribute (multiple options)
 */
export interface ProductAttribute {
  name: string;
  options?: string[] | null;
}

/**
 * Variation Attribute (single selected value)
 */
export interface VariationAttribute {
  name: string;
  value: string;
}

/**
 * ============================================
 * Reviews
 * ============================================
 */

export interface Review {
  id: string;
  content?: string | null;
  date?: string | null;
  rating?: number | null;
  reviewer?: string | null;
}

/**
 * ============================================
 * Variation
 * ============================================
 */

export interface Variation extends Pricing, StockInfo {
  attributes?: VariationAttribute[] | null;
}

/**
 * ============================================
 * Product
 * ============================================
 */

export interface Product extends Pricing, StockInfo {
  databaseId: number;
  slug: string;
  name: string;

  onSale?: boolean;

  averageRating?: number;
  reviewCount?: number;

  shortDescription?: string | null;

  image?: Image | null;

  categories?: ProductCategory[] | null;
  brands?: Brand[] | null;
  locations?: Location[] | null;

  attributes?: ProductAttribute[] | null;

  reviews?: Review[] | null;

  variations?: Variation[] | null;
}

/**
 * ============================================
 * Filters / UI Helpers
 * ============================================
 */

export interface ProductType {
  id: string;
  name: string;
  checked: boolean;
}
