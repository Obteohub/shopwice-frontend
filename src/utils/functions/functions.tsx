/*eslint complexity: ["error", 20]*/

import { v4 as uuidv4 } from 'uuid';

import type { Product } from '@/stores/cartStore';

interface RootObject {
  products: Product[];
  totalProductsCount: number;
  totalProductsPrice: number;
}

import { ChangeEvent } from 'react';

/* Interface for products*/

export interface IImage {
  __typename: string;
  id: string;
  sourceUrl?: string;
  srcSet?: string;
  altText: string;
  title: string;
}

export interface IGalleryImages {
  __typename: string;
  nodes: IImage[];
}

interface IProductNode {
  __typename: string;
  id: string;
  databaseId: number;
  name: string;
  description: string;
  stockStatus: string;
  type: string;
  onSale: boolean;
  slug: string;
  averageRating: number;
  reviewCount: number;
  image: IImage;
  galleryImages: IGalleryImages;
  productId: number;
  totalSales?: number;
}

interface IProduct {
  __typename: string;
  node: IProductNode;
}

interface IVariationNode {
  __typename: string;
  id: string;
  databaseId: number;
  name: string;
  description: string;
  type: string;
  onSale: boolean;
  price: string;
  regularPrice: string;
  salePrice: string;
  image: IImage;
  attributes: {
    nodes: Array<{
      id: string;
      name: string;
      value: string;
    }>;
  };
}

interface IVariation {
  __typename: string;
  node: IVariationNode;
}

export interface IProductRootObject {
  __typename: string;
  key: string;
  product: IProduct;
  variation?: IVariation;
  quantity: number;
  total: string;
  subtotal?: string;
}

type TUpdatedItems = { key: string; quantity: number }[];

export interface IUpdateCartItem {
  key: string;
  quantity: number;
}

export interface IUpdateCartInput {
  clientMutationId: string;
  items: IUpdateCartItem[];
}

export interface IUpdateCartVariables {
  input: IUpdateCartInput;
}

export interface IUpdateCartRootObject {
  variables: IUpdateCartVariables;
}

/* Interface for props */

interface IFormattedCartProps {
  cart: {
    contents?: { nodes: IProductRootObject[] };
    items?: Array<{
      id: string;
      name: string;
      quantity: number;
      line_total: string | number;
      price: string | number;
      variation?: any;
      key?: string;
    }>;
    total: number | string;
    itemCount?: number;
  };
}

export interface ICheckoutDataProps {
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  country: string;
  state: string;
  postcode: string;
  email: string;
  phone: string;
  company: string;
  paymentMethod: string;
}

/**
 * Add empty character after currency symbol
 * @param {string} price The price string that we input
 * @param {string} symbol Currency symbol to add empty character/padding after
 */

export const paddedPrice = (price?: string | number | null, symbol?: string) => {
  if (price === null || price === undefined || !symbol) return '';
  const priceStr = String(price);
  if (priceStr.includes(symbol)) {
    return priceStr.split(symbol).join(`${symbol} `);
  }
  return `${symbol} ${priceStr}`;
};

/**
 * Shorten inputted string (usually product description) to a maximum of length
 * @param {string} input The string that we input
 * @param {number} length The length that we want to shorten the text to
 */
export const trimmedStringToLength = (input: string, length: number) => {
  if (input.length > length) {
    const subStr = input.substring(0, length);
    return `${subStr}...`;
  }
  return input;
};

/**
 * Filter variant price. Changes "kr198.00 - kr299.00" to kr299.00 or kr198 depending on the side variable
 * @param {String} side Which side of the string to return (which side of the "-" symbol)
 * @param {String} price The inputted price that we need to convert
 */
export const filteredVariantPrice = (price: string | number, side: string) => {
  if (!price) {
    return '';
  }

  const priceStr = String(price);
  const dashIndex = priceStr.indexOf('-');

  if (dashIndex === -1) {
    // If no dash, it's a single price.
    // If asking for 'right' (regular/high), return empty or same?
    // Usually 'right' is used for struck-through regular price in the context of a range.
    // But in SingleProduct, 'right' is used for regular price.
    // If there's no range, there's only one price.
    // Let's assume if side is 'right', we might not want to show it if it's the same as left?
    // But the current logic returned the WHOLE string for 'right' (due to substring(length, -1)) and EMPTY for 'left'.
    // We want 'left' (sale/main) to show the price.
    if (side === 'right') {
      return ''; // Don't show a "regular" price if there's no range? Or handle in component?
      // Actually, if we return empty for right, the component might hide the struck-through price.
      // Let's see SingleProduct usage:
      // {product.variations ? filteredVariantPrice(price, 'right') : regularPrice}
      // If we return '', it shows nothing.
      // {product.variations ? filteredVariantPrice(price, '') : salePrice}
      // If we return 'GH₵100', it shows 'GH₵100'.
      // This seems correct for a single price variable product.
    }
    return priceStr;
  }

  if ('right' === side) {
    return priceStr.substring(dashIndex + 1).trim();
  }

  return priceStr.substring(0, dashIndex).trim();
};

/**
 * Returns cart data in the required format.
 * @param {String} data Cart data
 */

export const getFormattedCart = (data: IFormattedCartProps) => {
  const formattedCart: RootObject = {
    products: [],
    totalProductsCount: 0,
    totalProductsPrice: 0,
  };

  if (!data || !data.cart) {
    return formattedCart;
  }

  const givenProducts = data.cart.contents?.nodes;
  const simpleProducts = data.cart.items;

  // 1. Handle Standard Schema (contents.nodes)
  if (givenProducts && givenProducts.length > 0) {
    givenProducts.forEach((item) => {
      console.log(`[getFormattedCart] Processing item key: ${item.key}`);
      const givenProduct = item.product?.node;
      if (!givenProduct) {
        console.warn(`[getFormattedCart] Item ${item.key} skipped: No product node.`, item);
        return;
      }

      // Convert price to a float value
      const totalStr = String(item.total);
      const convertedCurrency = totalStr.replace(/[^0-9.-]+/g, '');

      const product: Product = {
        productId: givenProduct.databaseId,
        cartKey: item.key || uuidv4(),
        name: givenProduct.name,
        qty: item.quantity,
        price: Number(convertedCurrency) / item.quantity,
        totalPrice: item.total,
        image: {
          sourceUrl: givenProduct.image?.sourceUrl || process.env.NEXT_PUBLIC_PLACEHOLDER_SMALL_IMAGE_URL,
          srcSet: givenProduct.image?.srcSet || process.env.NEXT_PUBLIC_PLACEHOLDER_SMALL_IMAGE_URL,
          title: givenProduct.image?.title || givenProduct.name,
        }
      };

      formattedCart.products.push(product);
    });
    formattedCart.totalProductsCount = data.cart.itemCount || data.cart.contents?.nodes?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  } 
  // 2. Handle Simplified Schema (items) - Fallback
  else if (simpleProducts && simpleProducts.length > 0) {
     simpleProducts.forEach((item) => {
       const product: Product = {
         productId: parseInt(item.id, 10) || 0,
         cartKey: item.key || item.id || uuidv4(),
         name: item.name,
         qty: item.quantity,
         price: typeof item.price === 'string' ? parseFloat(item.price.replace(/[^0-9.-]+/g, '')) / 100 : Number(item.price) / 100, // Assuming cents if number, or string format
         totalPrice: String(item.line_total),
         image: {
           sourceUrl: process.env.NEXT_PUBLIC_PLACEHOLDER_SMALL_IMAGE_URL,
           srcSet: process.env.NEXT_PUBLIC_PLACEHOLDER_SMALL_IMAGE_URL,
           title: item.name,
         }
       };
       formattedCart.products.push(product);
     });
     formattedCart.totalProductsCount = data.cart.itemCount || simpleProducts.reduce((acc, item) => acc + item.quantity, 0);
  }

  // Final Totals
  const totalVal = String(data.cart.total).replace(/[^0-9.-]+/g, '');
  formattedCart.totalProductsPrice = Number(totalVal);

  return formattedCart;
};

export const createCheckoutData = (order: ICheckoutDataProps) => ({
  clientMutationId: uuidv4(),
  billing: {
    firstName: order.firstName,
    lastName: order.lastName,
    address1: order.address1,
    address2: order.address2,
    city: order.city,
    country: order.country,
    state: order.state,
    postcode: order.postcode,
    email: order.email,
    phone: order.phone,
    company: order.company,
  },
  shipping: {
    firstName: order.firstName,
    lastName: order.lastName,
    address1: order.address1,
    address2: order.address2,
    city: order.city,
    country: order.country,
    state: order.state,
    postcode: order.postcode,
    email: order.email,
    phone: order.phone,
    company: order.company,
  },
  shipToDifferentAddress: false,
  paymentMethod: order.paymentMethod,
  isPaid: false,
  transactionId: 'fhggdfjgfi',
});

/**
 * Get the updated items in the below format required for mutation input.
 *
 * Creates an array in above format with the newQty (updated Qty ).
 *
 */
export const getUpdatedItems = (
  products: IProductRootObject[],
  newQty: number,
  cartKey: string,
) => {
  // Create an empty array.

  const updatedItems: TUpdatedItems = [];

  // Loop through the product array.
  products.forEach((cartItem) => {
    // If you find the cart key of the product user is trying to update, push the key and new qty.
    if (cartItem.key === cartKey) {
      updatedItems.push({
        key: cartItem.key,
        quantity: newQty,
      });

      // Otherwise just push the existing qty without updating.
    } else {
      updatedItems.push({
        key: cartItem.key,
        quantity: cartItem.quantity,
      });
    }
  });

  // Return the updatedItems array with new Qtys.
  return updatedItems;
};

/*
 * When user changes the quantity, update the cart in localStorage
 * Also update the cart in the global Context
 */
export const handleQuantityChange = (
  event: ChangeEvent<HTMLInputElement>,
  cartKey: string,
  cart: IProductRootObject[],
  updateCart: (variables: IUpdateCartRootObject) => void,
  updateCartProcessing: boolean,
) => {
  if (typeof window !== 'undefined') {
    event.stopPropagation();

    // Return if the previous update cart mutation request is still processing
    if (updateCartProcessing || !cart) {
      return;
    }

    // If the user tries to delete the count of product, set that to 1 by default ( This will not allow him to reduce it less than zero )
    const newQty = event.target.value ? parseInt(event.target.value, 10) : 1;

    if (cart.length) {
      const updatedItems = getUpdatedItems(cart, newQty, cartKey);

      updateCart({
        variables: {
          input: {
            clientMutationId: uuidv4(),
            items: updatedItems,
          },
        },
      });
    }
  }
};
