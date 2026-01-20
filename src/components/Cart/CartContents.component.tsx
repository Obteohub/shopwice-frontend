import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useRouter } from 'next/router';
import { v4 as uuidv4 } from 'uuid';

import { useCartStore } from '@/stores/cartStore';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner.component';
import CartItem from './CartItem.component';
import CartSummary from './CartSummary.component';
import EmptyCart from './EmptyCart.component';
import UpsellCarousel from './UpsellCarousel.component';

import {
  getFormattedCart,
  getUpdatedItems,
  IProductRootObject,
} from '@/utils/functions/functions';

import { GET_CART } from '@/utils/gql/GQL_QUERIES';
import { UPDATE_CART } from '@/utils/gql/GQL_MUTATIONS';

const CartContents = () => {
  const router = useRouter();
  const { clearWooCommerceSession, syncWithWooCommerce } = useCartStore();
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch Cart Query
  const { data, refetch, loading: isFetching, error } = useQuery(GET_CART, {
    notifyOnNetworkStatusChange: true,
  });

  useEffect(() => {
    if (data) {
      const updatedCart = getFormattedCart(data);
      if (!updatedCart && !data?.cart?.contents?.nodes?.length) {
        clearWooCommerceSession();
        return;
      }
      if (updatedCart) {
        syncWithWooCommerce(updatedCart);
      }
    }
  }, [data, clearWooCommerceSession, syncWithWooCommerce]);

  // Update Cart Mutation
  const [updateCart, { data: updateCartData }] = useMutation(UPDATE_CART, {
    refetchQueries: [{ query: GET_CART }],
    awaitRefetchQueries: true,
    onError: () => {
      setIsUpdating(false);
    }
  });

  useEffect(() => {
    if (updateCartData) {
      setIsUpdating(false);
    }
  }, [updateCartData]);

  // Effect to refetch on mount
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Handlers
  const handleUpdateQuantity = (item: IProductRootObject, newQty: number) => {
    if (newQty < 1) return;
    setIsUpdating(true);

    const updatedItems = getUpdatedItems(data.cart.contents.nodes, newQty, item.key);

    updateCart({
      variables: {
        input: {
          clientMutationId: uuidv4(),
          items: updatedItems,
        },
      },
    });
  };

  const handleRemoveItem = (item: IProductRootObject) => {
    setIsUpdating(true);
    // Setting quantity to 0 effectively removes it in some WC configs, 
    // or we might need `removeFromCart` mutation. 
    // Using `getUpdatedItems` with 0 usually works if the function supports it, 
    // otherwise we might need a specific remove logic. 
    // The previous code called `handleRemoveProductClick` which used `getUpdatedItems` with 0? 
    // Wait, the previous code called `getUpdatedItems(products, 0, cartKey)`? 
    // Let's verify `getUpdatedItems`. It sets quantity to newQty.
    // If WC API treats 0 as remove, we are good.
    // Actually, `handleRemoveProductClick` in the old code did exactly that.

    const updatedItems = getUpdatedItems(data.cart.contents.nodes, 0, item.key);
    updateCart({
      variables: {
        input: {
          clientMutationId: uuidv4(),
          items: updatedItems,
        },
      },
    });
  };

  const cartItems = data?.cart?.contents?.nodes || [];
  const cartTotal = data?.cart?.total || '0';
  const cartSubtotal = data?.cart?.subtotal || cartTotal;
  const totalProductsCount = data?.cart?.contents?.itemCount || cartItems.reduce((acc: number, item: any) => acc + item.quantity, 0);

  // Check if cart is empty
  if (!isFetching && cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyCart />
        {/* Show Bestsellers or Upsells even on empty cart? Maybe. */}
      </div>
    );
  }

  // Loading state (initial)
  if (isFetching && !data) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <LoadingSpinner />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative">
          <strong className="font-bold">Error loading cart: </strong>
          <span className="block sm:inline">{error.message}</span>
          <button onClick={() => refetch()} className="underline ml-2">Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-0 md:container md:mx-auto md:px-4 py-4 md:py-8">
      <h1 className="text-2xl md:text-3xl font-medium  mb-4 md:mb-4 px-4 md:px-0">Shopping Cart</h1>

      <div className="flex flex-col-reverse lg:flex-row gap-6 relative">
        {/* Left Column: Cart Items */}
        <div className="w-full lg:w-2/3">
          <div className="bg-white rounded-none md:rounded-lg shadow-sm border-t md:border border-gray-200 overflow-hidden">
            <div className="space-y-0 md:space-y-1">
              {cartItems.map((item: IProductRootObject) => (
                <CartItem
                  key={item.key}
                  item={item}
                  onUpdateQuantity={(qty) => handleUpdateQuantity(item, qty)}
                  onRemove={() => handleRemoveItem(item)}
                  loading={isUpdating}
                />
              ))}
            </div>
          </div>

          {/* Cross Sells / Upsells (Below items) */}
          <div className="mt-12">
            {/* We would fetch cross-sells here. For now passing empty or mock if data not available in cart query yet.
                    To do this properly, we should modify GET_CART to fetch cross-sell items or make a separate query.
                    For this iteration, I'll allow the component to render if we had data.
                */}
            <UpsellCarousel title="You might also like" products={[]} />
          </div>
        </div>

        {/* Right Column: Totals (Sticky) */}
        <div className="w-full lg:w-1/3 lg:sticky lg:top-24 h-fit">
          <CartSummary
            subtotal={cartSubtotal}
            total={cartTotal}
            totalProductsCount={totalProductsCount}
          />
          {/* Optional Trust Badges or banners below summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-600">
            <p className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <span>Free Shipping on orders over GH₵500</span>
            </p>
            <p className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              <span>30 Days Easy Returns</span>
            </p>
          </div>
        </div>
      </div>

      {isUpdating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/30 backdrop-blur-[1px]">
          <div className="bg-white p-4 rounded-full shadow-lg">
            <LoadingSpinner />
          </div>
        </div>
      )}
    </div>
  );
};

export default CartContents;
