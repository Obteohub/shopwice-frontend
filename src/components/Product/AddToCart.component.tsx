import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Button from '@/components/UI/Button.component';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner.component';
import { useCartStore } from '@/stores/cartStore';
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';
import { transformAddToCartResponse } from '@/utils/cartTransformers';
import { setCartResponseCache } from '@/utils/cartClient';

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
}

// Scoped to module but with a safer cleanup strategy
const pendingCartMutations = new Set<string>();

const AddToCart = ({
  product,
  variationId,
  variationSelections,
  fullWidth = false,
  buyNow = false,
  quantity = 1,
  disabled = false,
}: AddToCartProps) => {
  const router = useRouter();
  const debugCart = process.env.NEXT_PUBLIC_DEBUG_CART === 'true';
  const isMounted = useRef(true);

  const { syncWithWooCommerce, optimisticAddItem, rollbackOptimisticAdd } = useCartStore();

  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const parentProductId = product?.id;

  // Track mounted state to prevent state updates after unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Prefetch checkout page as early as possible when this is a Buy Now button
  useEffect(() => {
    if (buyNow) void router.prefetch('/checkout');
  }, [buyNow, router]);

  // Reset "ADDED!" label after 2 seconds (only for Add To Cart, not Buy Now)
  useEffect(() => {
    if (!isSuccess) return;
    const timer = setTimeout(() => {
      if (isMounted.current) setIsSuccess(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [isSuccess]);

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
      variationId !== undefined && variationId !== null
        ? Number(variationId)
        : undefined;
    const safeVariationId = Number.isFinite(numericVariationId)
      ? numericVariationId
      : undefined;

    // --- Optimistic update: update cart UI immediately ---
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
    if (variationId) {
      if (safeVariationId !== undefined) {
        payload.variation_id = safeVariationId;
      }
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

      const response = await api.post(ENDPOINTS.CART_ADD, payload);

      if (debugCart) console.info('[AddToCart] Response', response);

      setCartResponseCache(response);
      const transformed = transformAddToCartResponse(response);

      if (!transformed?.cart) throw new Error('Cart update failed.');

      // Confirm optimistic update with real server state
      syncWithWooCommerce(transformed.cart);

      if (debugCart) {
        console.info('[AddToCart] Cart synced', { items: transformed.cart?.products?.length ?? 0 });
      }

      if (buyNow) {
        // Navigate directly — skip the isSuccess→useEffect render cycle for maximum speed
        void router.push('/checkout');
        return;
      }

      if (isMounted.current) setIsSuccess(true);
    } catch (error: unknown) {
      // Rollback optimistic update on failure
      if (optimisticId) rollbackOptimisticAdd?.(optimisticId);

      const err = error as Record<string, any>;
      const status = err?.status ? ` (${err.status})` : '';
      const details = err?.data?.message || err?.data?.error || '';
      console.error('[AddToCart] Error:', error);

      if (isMounted.current) {
        setRequestError(
          `${err?.message || 'Add to cart failed.'}${status}${details ? ` - ${details}` : ''}`
        );
      }
    } finally {
      pendingCartMutations.delete(mutationKey);
      if (isMounted.current) setIsAdding(false);
    }
  }, [
    isAdding, disabled, parentProductId, variationId, variationSelections, quantity,
    buyNow, product, optimisticAddItem, rollbackOptimisticAdd,
    syncWithWooCommerce, debugCart,
  ]);

  // Only block on isAdding, not global cart loading
  const isButtonDisabled = disabled || isAdding || isSuccess;

  const handlePointerEnter = useCallback(() => {
    if (buyNow) void router.prefetch('/checkout');
  }, [buyNow, router]);

  return (
    <>
      <Button
        handleButtonClick={handleAddToCart}
        fullWidth={fullWidth}
        buttonDisabled={isButtonDisabled}
        className={buyNow ? 'bg-[#fa710f] hover:bg-[#fa710f] border-[#fa710f]' : ''}
        onPointerEnter={handlePointerEnter}
      >
        {isAdding ? (
          <LoadingSpinner />
        ) : isSuccess ? (
          'Added!'
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
