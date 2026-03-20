
import { useState, useEffect, useCallback, useRef } from 'react';

// Components
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner.component';
import CartItem from './CartItem.component';
import CartSummary from './CartSummary.component';
import EmptyCart from './EmptyCart.component';

// Utils & State
import { useCartStore } from '@/stores/cartStore';
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';
import { RestCartItem, transformCartResponse } from '@/utils/cartTransformers';
import {
  clearCartResponseCache,
  getCartFast,
  setCartResponseCache,
} from '@/utils/cartClient';


const CartContents = () => {
  const { clearWooCommerceSession, syncWithWooCommerce } = useCartStore();
  const debugCart = process.env.NEXT_PUBLIC_DEBUG_CART === 'true';
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingQuantityKeys, setPendingQuantityKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [cartData, setCartData] = useState<any>(null);
  const quantityTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingQuantitiesRef = useRef<Record<string, number>>({});

  const loadCart = useCallback(async (force = false) => {
    try {
      // 1. Fetch data
      const data: any = await getCartFast({
        force,
        maxAgeMs: force ? 0 : 15000,
        view: 'mini',
      });

      if (debugCart) {
        console.info('[CartContents] Loaded cart', {
          itemsCount: data?.items_count,
          total: data?.totals?.total_price,
        });
      }

      // 2. Sync with store (side effect)
      const transformed = transformCartResponse(data);
      syncWithWooCommerce(transformed);

      return data;
    } catch (err: any) {
      console.error('[CartContents] Error loading cart:', err);
      setError(err);
      throw err;
    }
  }, [debugCart, syncWithWooCommerce]);

  // Fetch cart data
  useEffect(() => {
    let mounted = true;

    const fetchCart = async () => {
      if (mounted) setLoading(true);
      try {
        const data = await loadCart(false);
        if (mounted) {
          setCartData(data);
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    }

    fetchCart();

    return () => {
      mounted = false;
    };
  }, [loadCart]);

  const cartItems: RestCartItem[] = Array.isArray(cartData?.items)
    ? cartData.items
    : [];

  const unwrapCartResponse = (response: any) => {
    if (response && typeof response === 'object' && response.cart) {
      return response.cart;
    }
    return response;
  };

  const setQuantityPending = (key: string, pending: boolean) => {
    setPendingQuantityKeys((prev) => {
      if (pending) {
        return prev.includes(key) ? prev : [...prev, key];
      }
      return prev.filter((k) => k !== key);
    });
  };

  const clearQuantityTimer = (key: string) => {
    const timer = quantityTimersRef.current[key];
    if (timer) {
      clearTimeout(timer);
      delete quantityTimersRef.current[key];
    }
    delete pendingQuantitiesRef.current[key];
    setQuantityPending(key, false);
  };

  useEffect(() => {
    return () => {
      Object.values(quantityTimersRef.current).forEach((timer) => clearTimeout(timer));
      quantityTimersRef.current = {};
      pendingQuantitiesRef.current = {};
    };
  }, []);

  const hasItems = cartItems.length > 0;

  const cartTotal = cartData?.totals?.total_price || '0';
  const cartSubtotal = cartData?.totals?.total_items || cartTotal;
  const totalProductsCount = cartData?.items_count || 0;
  const currencyMinorUnit = cartData?.totals?.currency_minor_unit ?? 2;

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleSessionReset = async () => {
    console.warn('[Cart] Resetting Session due to sync error...');
    clearCartResponseCache();
    clearWooCommerceSession();
    if (typeof window !== 'undefined') window.location.reload();
  };

  const handleUpdateQuantity = async (item: RestCartItem, newQty: number) => {
    if (newQty < 1) return;
    const itemKey = item.key;

    // Optimistic local update for snappier UI.
    setCartData((prev: any) => {
      if (!prev?.items || !Array.isArray(prev.items)) return prev;
      const oldItem = prev.items.find((entry: RestCartItem) => entry.key === itemKey);
      const unitPriceMinor = Number(oldItem?.prices?.price ?? 0);
      const oldLineTotalMinor = Number(oldItem?.totals?.line_total ?? unitPriceMinor * Number(oldItem?.quantity ?? 1));
      const newLineTotalMinor = unitPriceMinor * newQty;
      const delta = newLineTotalMinor - oldLineTotalMinor;

      const nextItems = prev.items.map((entry: RestCartItem) =>
        entry.key === itemKey
          ? {
              ...entry,
              quantity: newQty,
              totals: entry.totals
                ? { ...entry.totals, line_total: String(newLineTotalMinor), line_subtotal: String(newLineTotalMinor) }
                : entry.totals,
            }
          : entry,
      );
      const nextItemsCount = nextItems.reduce(
        (sum: number, entry: RestCartItem) => sum + Number(entry?.quantity || 0),
        0,
      );
      return {
        ...prev,
        items: nextItems,
        items_count: nextItemsCount,
        totals: prev.totals && delta !== 0 ? {
          ...prev.totals,
          total_items: String(Number(prev.totals.total_items ?? 0) + delta),
          total_price: String(Number(prev.totals.total_price ?? 0) + delta),
        } : prev.totals,
      };
    });

    pendingQuantitiesRef.current[itemKey] = newQty;
    setQuantityPending(itemKey, true);

    const existingTimer = quantityTimersRef.current[itemKey];
    if (existingTimer) clearTimeout(existingTimer);

    quantityTimersRef.current[itemKey] = setTimeout(async () => {
      const quantityToCommit = pendingQuantitiesRef.current[itemKey];
      delete pendingQuantitiesRef.current[itemKey];
      delete quantityTimersRef.current[itemKey];

      try {
        if (debugCart) {
          console.info('[Cart] Commit quantity', { key: itemKey, quantityToCommit });
        }
        const response: any = await api.post(ENDPOINTS.CART_UPDATE, {
          key: itemKey,
          quantity: quantityToCommit,
        }, {
          params: { view: 'mini' },
        });

        const nextCart = unwrapCartResponse(response);
        setCartResponseCache(nextCart);
        setCartData(nextCart);
        syncWithWooCommerce(transformCartResponse(nextCart));
      } catch (err: any) {
        console.error('[Cart] Update Error:', err);
        alert(`Error updating cart: ${err.message}`);
        try {
          const fresh = await loadCart(true);
          setCartData(fresh);
        } catch {
          // ignore fallback refresh errors
        }
      } finally {
        setQuantityPending(itemKey, false);
      }
    }, 250);
  };

  const handleRemoveItem = async (item: RestCartItem) => {
    if (!confirm('Remove this item?')) return;
    clearQuantityTimer(item.key);

    // Optimistic: remove item immediately so UI feels instant.
    const previousCart = cartData;
    setCartData((prev: any) => {
      if (!prev?.items) return prev;
      const nextItems = prev.items.filter((entry: RestCartItem) => entry.key !== item.key);
      const nextItemsCount = nextItems.reduce(
        (sum: number, entry: RestCartItem) => sum + Number(entry?.quantity || 0), 0,
      );
      // Also subtract this item's line total from cart totals
      const lineTotalMinor = Number(item?.totals?.line_total ?? 0);
      return {
        ...prev,
        items: nextItems,
        items_count: nextItemsCount,
        totals: prev.totals ? {
          ...prev.totals,
          total_items: String(Math.max(0, Number(prev.totals.total_items ?? 0) - lineTotalMinor)),
          total_price: String(Math.max(0, Number(prev.totals.total_price ?? 0) - lineTotalMinor)),
        } : prev.totals,
      };
    });
    setQuantityPending(item.key, true);

    try {
      if (debugCart) {
        console.info('[Cart] Remove item', { key: item.key });
      }
      const response: any = await api.post(ENDPOINTS.CART_REMOVE, {
        key: item.key
      }, {
        params: { view: 'mini' },
      });

      const nextCart = unwrapCartResponse(response);
      setCartResponseCache(nextCart);
      setCartData(nextCart);
      syncWithWooCommerce(transformCartResponse(nextCart));
    } catch (err: any) {
      console.error('[Cart] Remove Error:', err);
      setCartData(previousCart); // rollback optimistic removal
      alert(`Error removing item: ${err.message}`);
    } finally {
      setQuantityPending(item.key, false);
    }
  };

  const handleClearCart = async () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      setTimeout(() => setShowClearConfirm(false), 3000);
      return;
    }

    if (!cartItems.length) return;

    setIsUpdating(true);
    Object.keys(quantityTimersRef.current).forEach((key) => clearQuantityTimer(key));
    setShowClearConfirm(false);

    try {
      if (debugCart) {
        console.info('[Cart] Clear cart', { items: cartItems.length });
      }

      // Use single clear endpoint instead of N remove calls.
      const response: any = await api.del(ENDPOINTS.CART_CLEAR, {
        params: { view: 'mini' },
      });
      const nextCart = unwrapCartResponse(response);
      if (nextCart?.items) {
        setCartResponseCache(nextCart);
        setCartData(nextCart);
        syncWithWooCommerce(transformCartResponse(nextCart));
      } else {
        clearCartResponseCache();
        setCartData({
          items: [],
          items_count: 0,
          totals: { total_price: '0', total_items: '0', currency_minor_unit: 2 },
        });
        syncWithWooCommerce({ products: [], totalProductsCount: 0, totalProductsPrice: 0 });
      }
      setIsUpdating(false);
    } catch (err: any) {
      console.error('[Cart] Clear Error:', err);
      alert(`Error clearing cart: ${err.message}`);
      setIsUpdating(false);
    }
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

  const isSyncing = isUpdating || loading || pendingQuantityKeys.length > 0;

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
                loading={isUpdating || loading || pendingQuantityKeys.includes(item.key)}
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
              currencyMinorUnit={currencyMinorUnit}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartContents;
