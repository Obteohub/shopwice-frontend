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
 * Format price with proper decimal places (2 decimals)
 * Handles prices in cents (1200 = 12.00) or regular format
 * @param {string | number | null} price The price to format
 * @param {string} symbol Optional currency symbol to add at the end
 * @returns {string} Formatted price like "GHS 12.00"
 */
export const formatPriceWithDecimals = (
  price?: string | number | null,
  symbol?: string,
  currencyMinorUnit?: number,
) => {
  if (price === null || price === undefined) return symbol ? `${symbol} 0.00` : '0.00';

  // Extract numeric value, allowing optional minus and decimals.
  const originalStr = String(price).trim().replace(/,/g, '');
  const numericMatch = originalStr.match(/-?\d+(?:\.\d+)?/);
  let numValue = Number(numericMatch?.[0] ?? '0');
  if (!Number.isFinite(numValue)) {
    numValue = 0;
  }

  // If minor unit is known from Woo totals, normalize reliably.
  if (typeof currencyMinorUnit === 'number' && currencyMinorUnit >= 0) {
    const numericStr = numericMatch?.[0] ?? '';
    const hasOnlyDigits = /^-?\d+$/.test(numericStr);
    const decimalPart = numericStr.includes('.') ? numericStr.split('.')[1] : '';
    const hasOnlyZeroDecimals = decimalPart.length > 0 && /^0+$/.test(decimalPart);
    const divisor = 10 ** currencyMinorUnit;

    if (divisor > 1 && (hasOnlyDigits || hasOnlyZeroDecimals)) {
      numValue = numValue / divisor;
    }
  } else {
    // Legacy fallback when minor unit isn't provided.
    if (!originalStr.includes('.') && Math.abs(numValue) >= 100) {
      numValue = numValue / 100;
    }
  }

  // Format with 2 decimal places
  const formatted = numValue.toFixed(2);

  // Add symbol if provided
  if (symbol) {
    return `${symbol} ${formatted}`;
  }
  
  return formatted;
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
    if (side === 'right') {
      return '';
    }
    return priceStr;
  }

  if ('right' === side) {
    return priceStr.substring(dashIndex + 1).trim();
  }

  return priceStr.substring(0, dashIndex).trim();
};

export const createCheckoutData = (order: ICheckoutDataProps) => ({
  billing_address: {
    first_name: order.firstName,
    last_name: order.lastName,
    address_1: order.address1,
    address_2: order.address2,
    city: order.city,
    country: order.country,
    state: order.state,
    postcode: order.postcode,
    email: order.email,
    phone: order.phone,
    company: order.company,
  },
  shipping_address: {
    first_name: order.firstName,
    last_name: order.lastName,
    address_1: order.address1,
    address_2: order.address2,
    city: order.city,
    country: order.country,
    state: order.state,
    postcode: order.postcode,
    phone: order.phone,
    company: order.company,
  },
  customer_note: '',
  payment_method: order.paymentMethod,
  payment_data: [],
  extensions: {},
});
