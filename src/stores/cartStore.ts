import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Image {
  sourceUrl?: string;
  srcSet?: string;
  title: string;
}

export interface Product {
  cartKey: string;
  name: string;
  qty: number;
  price: number;
  totalPrice: string;
  image: Image;
  productId: number;
  variationId?: number;
}

type OptimisticAddPayload = {
  productId: number;
  variationId?: number;
  quantity: number;
  product: any;
};

interface CartState {
  cart: {
    products: Product[];
    totalProductsCount: number;
    totalProductsPrice: number;
  } | null;
  isLoading: boolean;
  setCart: (cart: CartState['cart']) => void;
  updateCart: (newCart: NonNullable<CartState['cart']>) => void;
  syncWithWooCommerce: (cart: NonNullable<CartState['cart']>) => void;
  optimisticAddItem: (payload: OptimisticAddPayload) => string | null;
  rollbackOptimisticAdd: (optimisticKey: string) => void;
  clearWooCommerceSession: () => void;
}

const hasWindow = typeof window !== 'undefined';

const parseMoney = (value: unknown) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const persistCartSnapshot = (cart: CartState['cart']) => {
  if (!hasWindow) return;
  localStorage.setItem('woocommerce-cart', JSON.stringify(cart));
};

const recalcTotals = (products: Product[]) => ({
  totalProductsCount: products.reduce((sum, item) => sum + Number(item.qty || 0), 0),
  totalProductsPrice: products.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 0)), 0),
});

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cart: null,
      isLoading: false,
      setCart: (cart) => set({ cart }),
      updateCart: (newCart) => {
        set({ cart: newCart });
        persistCartSnapshot(newCart);
      },
      syncWithWooCommerce: (cart) => {
        set({ cart });
        persistCartSnapshot(cart);
      },
      optimisticAddItem: ({ productId, variationId, quantity, product }) => {
        const safeQty = Math.max(1, Number(quantity) || 1);
        const optimisticKey = `optimistic:${productId}:${variationId ?? 0}:${Date.now()}`;

        set((state) => {
          const currentProducts = Array.isArray(state.cart?.products)
            ? [...state.cart.products]
            : [];
          const existingIdx = currentProducts.findIndex(
            (item) =>
              Number(item.productId) === Number(productId) &&
              Number(item.variationId ?? 0) === Number(variationId ?? 0),
          );

          const unitPrice = parseMoney(
            product?.salePrice ?? product?.price ?? product?.regularPrice ?? 0,
          );

          if (existingIdx >= 0) {
            const existing = currentProducts[existingIdx];
            const nextQty = Number(existing.qty || 0) + safeQty;
            currentProducts[existingIdx] = {
              ...existing,
              qty: nextQty,
              totalPrice: String(unitPrice * nextQty),
            };
          } else {
            currentProducts.push({
              cartKey: optimisticKey,
              productId: Number(productId),
              variationId: variationId ? Number(variationId) : undefined,
              name: String(product?.name || 'Product'),
              qty: safeQty,
              price: unitPrice,
              totalPrice: String(unitPrice * safeQty),
              image: {
                title: String(product?.name || 'Product'),
                sourceUrl:
                  product?.image?.sourceUrl ||
                  product?.image?.src ||
                  product?.image?.url ||
                  '',
              },
            });
          }

          const totals = recalcTotals(currentProducts);
          const nextCart = {
            products: currentProducts,
            totalProductsCount: totals.totalProductsCount,
            totalProductsPrice: totals.totalProductsPrice,
          };
          persistCartSnapshot(nextCart);
          return { cart: nextCart };
        });

        return optimisticKey;
      },
      rollbackOptimisticAdd: (optimisticKey) => {
        if (!optimisticKey) return;
        set((state) => {
          const currentProducts = Array.isArray(state.cart?.products)
            ? state.cart.products
            : [];
          const nextProducts = currentProducts.filter((item) => item.cartKey !== optimisticKey);
          const totals = recalcTotals(nextProducts);
          const nextCart = {
            products: nextProducts,
            totalProductsCount: totals.totalProductsCount,
            totalProductsPrice: totals.totalProductsPrice,
          };
          persistCartSnapshot(nextCart);
          return { cart: nextCart };
        });
      },
      clearWooCommerceSession: () => {
        set({ cart: null });
        if (!hasWindow) return;
        localStorage.removeItem('woo-session');
        localStorage.removeItem('wc-session');
        localStorage.removeItem('wc-store-api-nonce');
        localStorage.removeItem('wc_store_api_nonce');
        localStorage.removeItem('wc-cart-token');
        localStorage.removeItem('woocommerce-cart');
        localStorage.removeItem('cart-store'); // Clear zustand persistent state
      },
    }),
    {
      name: 'cart-store',
      partialize: (state) => ({ cart: state.cart }),
    },
  ),
);
