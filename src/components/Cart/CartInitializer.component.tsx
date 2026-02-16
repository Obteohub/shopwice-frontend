import { useEffect } from 'react';

// State
import { useCartStore } from '@/stores/cartStore';

import client from '@/utils/apollo/ApolloClient';
import { GET_CART } from '@/utils/gql/GQL_QUERIES';
import { getFormattedCart } from '@/utils/functions/functions';

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
        const { data } = await client.query({
          query: GET_CART,
          fetchPolicy: 'network-only'
        });
        if (data?.cart) {
          const formatted = getFormattedCart({ cart: data.cart });
          syncWithWooCommerce(formatted);
        }
      } catch (error) {
        console.error('[CartInitializer] Failed to load cart:', error);
      }
    };

    loadCart();
  }, [syncWithWooCommerce]);

  // This component does not render any UI
  return null;
};

export default CartInitializer;
