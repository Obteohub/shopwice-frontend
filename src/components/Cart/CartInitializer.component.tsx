import { useEffect } from 'react';

// State
import { useCartStore } from '@/stores/cartStore';

// Store API
import { getCart } from '@/utils/wc-store-api/cartService';
import { formatStoreApiCartForStore } from '@/utils/functions/storeApiCartUtils';

/**
 * Non-rendering component responsible for initializing the cart state
 * by fetching data from WooCommerce and syncing it with the Zustand store.
 * This should be rendered once at the application root (_app.tsx).
 * @function CartInitializer
 * @returns {null} - This component does not render any UI
 */
const CartInitializer = () => {
  const { syncWithWooCommerce } = useCartStore();

  useEffect(() => {
    const loadCart = async () => {
      try {
        const cart = await getCart();
        const formatted = formatStoreApiCartForStore(cart);
        syncWithWooCommerce(formatted);
      } catch (error) {
        console.error('[CartInitializer] Failed to load Store API cart:', error);
      }
    };

    loadCart();
  }, [syncWithWooCommerce]);

  // This component does not render any UI
  return null;
};

export default CartInitializer;
