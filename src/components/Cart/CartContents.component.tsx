
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { v4 as uuidv4 } from 'uuid';

// Components
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner.component';
import CartItem from './CartItem.component';
import CartSummary from './CartSummary.component';
import EmptyCart from './EmptyCart.component';

// Utils & State
import { IProductRootObject, getFormattedCart } from '@/utils/functions/functions';
import { useCartStore } from '@/stores/cartStore';
import { GET_CART } from '@/utils/gql/GQL_QUERIES';
import { UPDATE_CART } from '@/utils/gql/GQL_MUTATIONS';

const CartContents = () => {
  const { clearWooCommerceSession, syncWithWooCommerce } = useCartStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // GraphQL Query
  const { data, loading, error, refetch } = useQuery(GET_CART, {
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    onCompleted: (data) => {
      console.log('[CartContents] Query Data:', data);
    },
    onError: (err) => {
      console.error('[CartContents] Query Error:', err);
    }
  });

  // GraphQL Mutation
  const [updateCart, { loading: mutationLoading }] = useMutation(UPDATE_CART, {
    onCompleted: (mutationData) => {
      // Sync store with updated cart data
      if (mutationData?.updateItemQuantities?.cart) {
        const formattedCart = getFormattedCart({ cart: mutationData.updateItemQuantities.cart });
        syncWithWooCommerce(formattedCart);
      }
      setIsUpdating(false);
    },
    onError: (err) => {
      console.error('[Cart] Mutation Error:', err);
      alert(`Error updating cart: ${err.message}`);
      setIsUpdating(false);
    }
  });

  // Derived Data
  const cartData = data?.cart;
  let cartItems: IProductRootObject[] = [];

  if (cartData?.contents?.nodes?.length > 0) {
    // Standard Schema
    cartItems = cartData.contents.nodes;
  } else if (cartData?.items?.length > 0) {
    // Simplified Schema Fallback
    console.log('[Cart] Using simplified items schema');
    cartItems = cartData.items.map((item: any) => ({
      key: item.key,
      quantity: item.quantity,
      total: item.line_total,
      subtotal: item.line_total,
      product: {
        node: {
          id: item.id,
          databaseId: parseInt(item.id, 10),
          name: item.name,
          slug: '', // Unavailable in simple schema
          type: 'simple',
          image: {
            sourceUrl: '/placeholder.png', // Unavailable in simple schema
            altText: item.name
          },
          price: item.price,
        }
      },
      // Map variations if available
      variation: item.variation ? {
        node: {
           name: Array.isArray(item.variation) ? item.variation.join(', ') : item.variation,
           price: item.price
        }
      } : null
    }));
  }

  const hasItems = cartItems.length > 0;
  
  const cartTotal = cartData?.total || '0';
  const cartSubtotal = cartData?.subtotal || cartTotal;
  const totalProductsCount = cartData?.itemCount || cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  // Sync on load
  useEffect(() => {
    if (cartData) {
      const formattedCart = getFormattedCart({ cart: cartData });
      syncWithWooCommerce(formattedCart);
    }
  }, [cartData, syncWithWooCommerce]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleSessionReset = async () => {
    console.warn('[Cart] Resetting Session due to sync error...');
    clearWooCommerceSession();
    if (typeof window !== 'undefined') window.location.reload();
  };

  const handleUpdateQuantity = (item: IProductRootObject, newQty: number) => {
    if (newQty < 1) return;
    setIsUpdating(true);
    
    updateCart({
      variables: {
        input: {
          clientMutationId: uuidv4(),
          items: [{ key: item.key, quantity: newQty }]
        }
      }
    });
  };

  const handleRemoveItem = (item: IProductRootObject) => {
    if (!confirm('Remove this item?')) return;
    setIsUpdating(true);
    
    updateCart({
      variables: {
        input: {
          clientMutationId: uuidv4(),
          items: [{ key: item.key, quantity: 0 }]
        }
      }
    });
  };

  const handleClearCart = () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      setTimeout(() => setShowClearConfirm(false), 3000);
      return;
    }

    if (!cartItems.length) return;

    setIsUpdating(true);
    setShowClearConfirm(false);

    const itemsToClear = cartItems.map(item => ({
      key: item.key,
      quantity: 0
    }));

    updateCart({
      variables: {
        input: {
          clientMutationId: uuidv4(),
          items: itemsToClear
        }
      }
    });
  };

  // -------------------------------------------------------------------------
  // Render Logic
  // -------------------------------------------------------------------------

  // Initial Load
  if (loading && !cartData) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner />
        <p className="text-gray-500 animate-pulse">Loading your cart...</p>
      </div>
    );
  }

  // Critical Error State
  if (error) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="bg-red-50 inline-block p-8 rounded-lg border border-red-100">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Cart Error</h2>
          <p className="text-gray-600 mb-6">{error.message}</p>
          <button
            onClick={handleSessionReset}
            className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-semibold"
          >
            Reset Application Session
          </button>
        </div>
      </div>
    );
  }

  // Empty State
  if (!hasItems) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Shopping Cart</h1>
        <EmptyCart />
      </div>
    );
  }

  const isSyncing = mutationLoading || isUpdating || (loading && !!cartData);

  return (
    <div className="container mx-auto px-4 py-8 relative">
      {/* Header */}
      <div className="flex flex-row justify-between items-end mb-8 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
          <p className="text-gray-500 text-sm mt-1">
            {totalProductsCount} {totalProductsCount === 1 ? 'item' : 'items'}
            {isSyncing && (
              <span className="ml-2 text-blue-500 animate-pulse font-medium">
                &bull; Syncing...
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleClearCart}
          className={`${showClearConfirm
              ? 'bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600'
              : 'text-red-500 hover:text-red-700 font-medium hover:underline'
            } text-sm transition-all focus:outline-none`}
          disabled={isSyncing}
        >
          {showClearConfirm ? 'Confirm Clear?' : 'Clear Cart'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Main list */}
        <div className="w-full lg:w-2/3 flex flex-col gap-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {cartItems.map((item) => (
              <CartItem
                key={item.key}
                item={item}
                onUpdateQuantity={(newQty) => handleUpdateQuantity(item, newQty)}
                onRemove={() => handleRemoveItem(item)}
                loading={isSyncing}
              />
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="w-full lg:w-1/3">
          <div className="sticky top-24">
            <CartSummary
              subtotal={cartSubtotal}
              total={cartTotal}
              totalProductsCount={totalProductsCount}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartContents;
