import type { Cart } from '@/utils/wc-store-api/cartService';
import type { IProductRootObject } from '@/utils/functions/functions';

export const formatStoreApiMoney = (amountMinor: string | number | undefined, totals: Cart['totals']) => {
  if (amountMinor === undefined || amountMinor === null) return '';
  const minorUnit = totals?.currency_minor_unit ?? 2;
  const amount = Number(amountMinor) / Math.pow(10, minorUnit);
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: minorUnit,
    maximumFractionDigits: minorUnit,
  });
  const prefix = totals?.currency_prefix || totals?.currency_symbol || '';
  const suffix = totals?.currency_suffix || '';
  return `${prefix}${formatted}${suffix}`.trim();
};

const getQuantityValue = (quantity: any) => {
  if (typeof quantity === 'number') return quantity;
  if (typeof quantity?.value === 'number') return quantity.value;
  if (typeof quantity === 'string') return Number(quantity) || 0;
  return 0;
};

const safeSlugFromPermalink = (permalink?: string) => {
  if (!permalink) return '';
  try {
    const url = new URL(permalink);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  } catch {
    return permalink.split('/').filter(Boolean).pop() || '';
  }
};

export const formatStoreApiCartForStore = (cart: Cart | null) => {
  if (!cart) {
    return {
      products: [],
      totalProductsCount: 0,
      totalProductsPrice: 0,
    };
  }

  const products = (cart.items || []).map((item) => {
    const qty = getQuantityValue(item.quantity);
    const priceMinor = item.prices?.price ?? '0';
    const minorUnit = item.prices?.currency_minor_unit ?? cart.totals?.currency_minor_unit ?? 2;
    const price = Number(priceMinor) / Math.pow(10, minorUnit);

    return {
      cartKey: item.key,
      productId: item.id,
      name: item.name,
      qty,
      price,
      totalPrice: formatStoreApiMoney(item.totals?.line_total, cart.totals),
      image: {
        sourceUrl: item.images?.[0]?.src,
        srcSet: item.images?.[0]?.srcset,
        title: item.images?.[0]?.name || item.name,
      },
    };
  });

  const totalProductsCount = products.reduce((sum, p) => sum + (p.qty || 0), 0);
  const totalProductsPrice = Number(cart.totals?.total_price || 0) / Math.pow(10, cart.totals?.currency_minor_unit ?? 2);

  return {
    products,
    totalProductsCount,
    totalProductsPrice,
  };
};

export const mapStoreApiCartToItems = (cart: Cart | null): IProductRootObject[] => {
  if (!cart || !cart.items) return [];

  return cart.items.map((item) => {
    const qty = getQuantityValue(item.quantity);
    const slug = safeSlugFromPermalink(item.permalink);

    return {
      __typename: 'CartItem',
      key: item.key,
      product: {
        __typename: 'CartProduct',
        node: {
          __typename: 'Product',
          id: String(item.id),
          databaseId: item.id,
          name: item.name,
          description: item.description || '',
          stockStatus: 'IN_STOCK',
          type: 'SIMPLE',
          onSale: false,
          slug,
          averageRating: 0,
          reviewCount: 0,
          image: {
            __typename: 'MediaItem',
            id: String(item.images?.[0]?.id || item.id),
            sourceUrl: item.images?.[0]?.src,
            srcSet: item.images?.[0]?.srcset,
            altText: item.images?.[0]?.alt || '',
            title: item.images?.[0]?.name || item.name,
          },
          galleryImages: {
            __typename: 'MediaItemConnection',
            nodes: [],
          },
          productId: item.id,
          totalSales: 0,
        },
      },
      variation: item.variation && Array.isArray(item.variation) && item.variation.length > 0 ? {
        __typename: 'ProductVariation',
        node: {
          __typename: 'ProductVariation',
          id: String(item.id),
          databaseId: item.id,
          name: item.name,
          description: item.description || '',
          type: 'VARIATION',
          onSale: false,
          price: '',
          regularPrice: '',
          salePrice: '',
          image: {
            __typename: 'MediaItem',
            id: String(item.images?.[0]?.id || item.id),
            sourceUrl: item.images?.[0]?.src,
            srcSet: item.images?.[0]?.srcset,
            altText: item.images?.[0]?.alt || '',
            title: item.images?.[0]?.name || item.name,
          },
          attributes: {
            nodes: item.variation.map((v) => ({
              id: `${item.id}-${v.attribute}`,
              name: v.attribute,
              value: v.value,
            })),
          },
        },
      } : undefined,
      quantity: qty,
      total: formatStoreApiMoney(item.totals?.line_total, cart.totals),
      subtotal: formatStoreApiMoney(item.totals?.line_subtotal, cart.totals),
    };
  });
};
