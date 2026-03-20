import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Button from '@/components/UI/Button.component';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner.component';
import { useCartStore } from '@/stores/cartStore';
import { useAddToCartToastStore } from '@/stores/addToCartToastStore';
import { ENDPOINTS } from '@/utils/endpoints';
import { transformAddToCartResponse } from '@/utils/cartTransformers';
import { postCartMutation, setCartResponseCache, ensureCartMutationHeaders } from '@/utils/cartClient';

export interface RestImage {
  src?: string;
  url?: string;
  sourceUrl?: string;
  alt?: string;
  altText?: string;
}

export interface RestVariation {
  id: number | string;
  name?: string;
  sku?: string;
  stockStatus?: string;
  stockQuantity?: number | null;
  purchasable?: boolean;
  onSale?: boolean;
  salePrice?: string;
  regularPrice?: string;
  price?: string;
  image?: RestImage | null;
}

export interface RestTaxonomyTerm {
  name: string;
  slug: string;
}

export interface RestProduct {
  id: number | string;
  slug?: string;
  name?: string;
  description?: string;
  shortDescription?: string;
  price?: string;
  regularPrice?: string;
  salePrice?: string;
  onSale?: boolean;
  sku?: string;
  stockStatus?: string;
  stockQuantity?: number | null;
  averageRating?: number;
  reviewCount?: number;
  image?: RestImage | null;
  images?: RestImage[];
  categories?: RestTaxonomyTerm[];
  brands?: RestTaxonomyTerm[];
  locations?: RestTaxonomyTerm[];
  variations?: RestVariation[];
}

export interface AddToCartProps {
  product: RestProduct;
  variationId?: number | string;
  variationSelections?: Array<{ attribute: string; value: string }>;
  fullWidth?: boolean;
  buyNow?: boolean;
  quantity?: number;
  disabled?: boolean;
  /** Renders as an outlined/secondary button instead of solid */
  secondary?: boolean;
}

const pendingCartMutations = new Set<string>();

const AddToCart = ({
  product,
  variationId,
  variationSelections,
  fullWidth = false,
  buyNow = false,
  quantity = 1,
  disabled = false,
  secondary = false,
}: AddToCartProps) => {
  const router = useRouter();
  const debugCart = process.env.NEXT_PUBLIC_DEBUG_CART === 'true';
  const isMounted = useRef(true);

  const { syncWithWooCommerce, optimisticAddItem, rollbackOptimisticAdd } = useCartStore();
  const showGlobalToast = useAddToCartToastStore((state) => state.showToast);

  const [requestError, setRequestError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const parentProductId = product?.id ?? (product as any)?.databaseId;

  useEffect(() => {
    isMounted.current = true;
    // Pre-warm the WooCommerce session token on mount so the first add-to-cart
    // doesn't pay the extra blocking GET /api/cart round-trip.
    void ensureCartMutationHeaders();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleAddToCart = useCallback(async () => {
    if (isAdding || disabled) return;

    const numericProductId = Number(parentProductId);
    if (!parentProductId || !Number.isFinite(numericProductId)) {
      setRequestError('Invalid product.');
      return;
    }

    const normalizedVariationSelections = Array.isArray(variationSelections)
      ? variationSelections
          .map((entry) => ({
            attribute: String(entry?.attribute ?? '').trim(),
            value: String(entry?.value ?? '').trim(),
          }))
          .filter((entry) => entry.attribute && entry.value)
      : [];

    const variationSignature = normalizedVariationSelections
      .map((entry) => `${entry.attribute}:${entry.value}`)
      .join('|');
    const mutationKey = `${buyNow ? 'buy' : 'add'}:${numericProductId}:${String(variationId ?? 0)}:${variationSignature}`;
    if (pendingCartMutations.has(mutationKey)) return;

    pendingCartMutations.add(mutationKey);
    if (isMounted.current) {
      setIsAdding(true);
      setRequestError(null);
    }

    const numericVariationId =
      variationId !== undefined && variationId !== null ? Number(variationId) : undefined;
    const safeVariationId = Number.isFinite(numericVariationId)
      ? numericVariationId
      : undefined;

    const optimisticId = optimisticAddItem?.({
      productId: numericProductId,
      variationId: safeVariationId,
      quantity: Number(quantity),
      product,
    });

    const payload: Record<string, any> = {
      id: numericProductId,
      quantity: Number(quantity),
    };
    if (variationId && safeVariationId !== undefined) {
      payload.variation_id = safeVariationId;
    }
    if (normalizedVariationSelections.length > 0) {
      payload.variation = normalizedVariationSelections;
      payload.variation_attributes = normalizedVariationSelections;
    }

    try {
      if (debugCart) {
        console.info('[AddToCart] Start', {
          productId: numericProductId,
          variationId,
          variationSelections: normalizedVariationSelections,
          quantity,
          buyNow,
        });
      }

      const response = await postCartMutation(ENDPOINTS.CART_ADD, payload, {
        view: 'mini',
      });

      if (debugCart) console.info('[AddToCart] Response', response);

      // For buy-now: navigate immediately and sync the store in the background.
      // The checkout page fetches its own cart state, so there's no need to
      // block the redirect on the local store update.
      if (buyNow) {
        void router.push('/checkout');
        setCartResponseCache(response);
        const transformed = transformAddToCartResponse(response);
        if (transformed?.cart) syncWithWooCommerce(transformed.cart);
        return;
      }

      setCartResponseCache(response);
      const transformed = transformAddToCartResponse(response);

      if (!transformed?.cart) throw new Error('Cart update failed.');

      syncWithWooCommerce(transformed.cart);

      if (debugCart) {
        console.info('[AddToCart] Cart synced', {
          items: transformed.cart?.products?.length ?? 0,
        });
      }

      showGlobalToast({
        productName: String(product?.name || 'Item'),
        cartCount: Number(transformed.cart?.totalProductsCount || 0),
      });
    } catch (error: unknown) {
      if (optimisticId) rollbackOptimisticAdd?.(optimisticId);

      const err = error as Record<string, any>;
      const status = err?.status ? ` (${err.status})` : '';
      const details = err?.data?.message || err?.data?.error || '';
      console.error('[AddToCart] Error:', error);

      if (isMounted.current) {
        setRequestError(
          `${err?.message || 'Add to cart failed.'}${status}${details ? ` - ${details}` : ''}`,
        );
      }
    } finally {
      pendingCartMutations.delete(mutationKey);
      if (isMounted.current) setIsAdding(false);
    }
  }, [
    isAdding,
    disabled,
    parentProductId,
    variationId,
    variationSelections,
    quantity,
    buyNow,
    product,
    optimisticAddItem,
    rollbackOptimisticAdd,
    syncWithWooCommerce,
    debugCart,
    router,
    showGlobalToast,
  ]);

  const isButtonDisabled = disabled || isAdding;

  const handlePointerEnter = useCallback(() => {
    if (!buyNow) return;
    void router.prefetch('/checkout');
    // Pre-warm the WooCommerce session token so ensureCartMutationHeaders
    // won't need to fire an extra blocking GET when the user clicks.
    void ensureCartMutationHeaders();
  }, [buyNow, router]);

  return (
    <>
      <Button
        handleButtonClick={handleAddToCart}
        fullWidth={fullWidth}
        buttonDisabled={isButtonDisabled}
        className={
          buyNow
            ? '!bg-[#fa710f] hover:!bg-[#e0670d] !border-[#fa710f] hover:!border-[#e0670d] !text-white'
            : secondary
              ? '!bg-white hover:!bg-blue-50 !border-blue-600 hover:!border-blue-600 !text-blue-600'
              : '!bg-blue-600 hover:!bg-blue-700 !border-blue-600 hover:!border-blue-700 !text-white'
        }
        onPointerEnter={handlePointerEnter}
      >
        {isAdding ? (
          <LoadingSpinner />
        ) : buyNow ? (
          'BUY NOW'
        ) : (
          'ADD TO CART'
        )}
      </Button>

      {requestError && (
        <div className="mt-1 text-sm text-red-500" role="alert">
          {requestError}
        </div>
      )}
    </>
  );
};

export default AddToCart;
