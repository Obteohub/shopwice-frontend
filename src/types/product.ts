/**
 * ============================================
 * WPGraphQL Connection Helper
 * ============================================
 */

export interface Connection<T> {
  nodes?: T[] | null;
}

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
  __typename?: string;
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

export interface BrandNode {
  name: string;
  slug: string;
}

export interface LocationNode {
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

export interface ColorNode {
  name: string;
  slug: string;
}

export interface SizeNode {
  name: string;
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

  author?: {
    node?: {
      name?: string | null;
    } | null;
  } | null;
}

/**
 * ============================================
 * Variation
 * ============================================
 */

export interface Variation extends Pricing, StockInfo {
  attributes?: Connection<VariationAttribute>;
}

/**
 * ============================================
 * Product
 * ============================================
 */

export interface Product extends Pricing, StockInfo {
  __typename?: string;

  databaseId: number;
  slug: string;
  name: string;

  onSale?: boolean;

  averageRating?: number;
  reviewCount?: number;

  shortDescription?: string | null;

  image?: Image | null;
  galleryImages?: Connection<Image>;

  productCategories?: Connection<ProductCategory>;
  productBrand?: Connection<BrandNode>;
  productLocation?: Connection<LocationNode>;

  attributes?: Connection<ProductAttribute>;

  allPaColor?: Connection<ColorNode>;
  allPaSize?: Connection<SizeNode>;

  reviews?: Connection<Review>;

  variations?: Connection<Variation>;
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
