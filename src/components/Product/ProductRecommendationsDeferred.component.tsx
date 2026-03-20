import React, { useEffect, useMemo, useRef, useState } from 'react';
import AddToCart from './AddToCart.component';
import ProductCard from './ProductCard.component';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner.component';
import { useCartStore } from '@/stores/cartStore';
import { useAddToCartToastStore } from '@/stores/addToCartToastStore';
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';
import { transformAddToCartResponse } from '@/utils/cartTransformers';
import { postCartMutation, setCartResponseCache } from '@/utils/cartClient';
import { firstDisplayImageUrl, toSizedImageUrl } from '@/utils/image';
import { normalizeProduct } from '@/utils/productTransformer';

type Props = {
  productId?: number;
  boughtTogetherProducts: any[];
  boughtTogetherIds?: number[];
  crossSellProducts: any[];
  crossSellIds?: number[];
  upsell: any[];
  upsellIds?: number[];
  related: any[];
  relatedIds?: number[];
  showBoughtTogether?: boolean;
  showCrossSell?: boolean;
  showUpsell?: boolean;
  showRelated?: boolean;
  containerClassName?: string;
  primaryProduct?: any;
  primaryVariationId?: number | string;
  primaryVariationSelections?: Array<{ attribute: string; value: string }>;
  primaryDisabled?: boolean;
  compactMobile?: boolean;
  deferUntilVisible?: boolean;
};

type RecommendationSectionKey = 'boughtTogether' | 'crossSell' | 'upsell' | 'related';

type RecommendationSectionItems = Record<RecommendationSectionKey, any[]>;

const relationProductCache = new Map<number, any>();
// Deduplicate concurrent recommendation lookups across multiple mounted instances.
const relationProductRequestCache = new Map<number, Promise<void>>();
const recommendationSectionCache = new Map<string, RecommendationSectionItems>();
const recommendationSectionRequestCache = new Map<string, Promise<RecommendationSectionItems>>();

const createEmptyRecommendationSections = (): RecommendationSectionItems => ({
  boughtTogether: [],
  crossSell: [],
  upsell: [],
  related: [],
});

const hasRecommendationItems = (items: RecommendationSectionItems) =>
  Object.values(items).some((entry) => entry.length > 0);

const getProductKey = (item: any) => {
  const id = Number(item?.id ?? 0);
  if (Number.isFinite(id) && id > 0) return `id:${id}`;
  const slug = String(item?.slug ?? '').trim().toLowerCase();
  return slug ? `slug:${slug}` : '';
};

const dedupeProductList = (
  items: any[],
  options?: {
    excludeKeys?: Set<string>;
    limit?: number;
  },
) => {
  const limit = Number(options?.limit ?? 12);
  const excludeKeys = options?.excludeKeys ?? new Set<string>();
  const localSeen = new Set<string>();
  const output: any[] = [];

  for (const item of items) {
    const key = getProductKey(item);
    if (!key) continue;
    if (excludeKeys.has(key)) continue;
    if (localSeen.has(key)) continue;

    localSeen.add(key);
    output.push(item);
    if (output.length >= limit) break;
  }

  return output;
};

const toUniqueIds = (ids: number[] = [], excludeId?: number, limit = 12) => {
  const unique = new Set<number>();
  for (const raw of ids) {
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) continue;
    if (Number.isFinite(excludeId) && id === excludeId) continue;
    unique.add(id);
    if (unique.size >= limit) break;
  }
  return Array.from(unique);
};

const buildIdSignature = (ids: number[] = []) =>
  toUniqueIds(ids, undefined, Number.MAX_SAFE_INTEGER)
    .map((id) => String(id))
    .join(',');

const buildProductListSignature = (items: any[] = []) =>
  dedupeProductList(items, { limit: Number.MAX_SAFE_INTEGER })
    .map((item) => getProductKey(item))
    .filter(Boolean)
    .join(',');

const normalizeRecommendationItems = (items: any[] = []) =>
  items
    .map((item) => normalizeProduct(item) ?? item)
    .filter(Boolean);

const collectUniqueIds = (groups: number[][], excludeId?: number, limit = Number.MAX_SAFE_INTEGER) => {
  const unique = new Set<number>();

  for (const group of groups) {
    for (const raw of group) {
      const id = Number(raw);
      if (!Number.isFinite(id) || id <= 0) continue;
      if (Number.isFinite(excludeId) && id === excludeId) continue;
      if (unique.has(id)) continue;
      unique.add(id);
      if (unique.size >= limit) {
        return Array.from(unique);
      }
    }
  }

  return Array.from(unique);
};

const ensureProductsCached = async (ids: number[], limit = 48) => {
  const selected = toUniqueIds(ids, undefined, limit);
  if (selected.length === 0) return;

  const pendingRequests = new Set<Promise<void>>();
  const idsToRequest: number[] = [];

  selected.forEach((id) => {
    if (relationProductCache.has(id)) return;

    const pending = relationProductRequestCache.get(id);
    if (pending) {
      pendingRequests.add(pending);
      return;
    }

    idsToRequest.push(id);
  });

  if (idsToRequest.length > 0) {
    const requestPromise = (async () => {
      try {
        const raw = await api.get<any>(ENDPOINTS.PRODUCTS, {
          params: {
            include: idsToRequest.join(','),
            per_page: idsToRequest.length,
            page: 1,
          },
          skipReviewEnrich: true,
        });

        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.products)
            ? raw.products
            : Array.isArray(raw?.data)
              ? raw.data
              : Array.isArray(raw?.results)
                ? raw.results
                : [];

        list.forEach((entry: any) => {
          const normalized = normalizeProduct(entry);
          const id = Number(normalized?.id);
          if (!normalized || !Number.isFinite(id) || id <= 0) return;
          relationProductCache.set(id, normalized);
        });
      } catch {
        // Keep partial cache results when include lookup fails.
      } finally {
        idsToRequest.forEach((id) => {
          if (relationProductRequestCache.get(id) === requestPromise) {
            relationProductRequestCache.delete(id);
          }
        });
      }
    })();

    idsToRequest.forEach((id) => {
      relationProductRequestCache.set(id, requestPromise);
    });
    pendingRequests.add(requestPromise);
  }

  if (pendingRequests.size > 0) {
    await Promise.allSettled(Array.from(pendingRequests));
  }
};

const getCachedProductsByIds = (ids: number[], excludeId?: number, limit = 12) =>
  toUniqueIds(ids, excludeId, limit)
    .map((id) => relationProductCache.get(id) ?? null)
    .filter(Boolean)
    .filter((item: any) => Number(item?.id) !== Number(excludeId));

const fetchRecommendationSections = async ({
  productId,
  boughtTogetherIds = [],
  crossSellIds = [],
  upsellIds = [],
  relatedIds = [],
}: {
  productId?: number;
  boughtTogetherIds?: number[];
  crossSellIds?: number[];
  upsellIds?: number[];
  relatedIds?: number[];
}): Promise<RecommendationSectionItems> => {
  const idsToFetch = collectUniqueIds(
    [boughtTogetherIds, crossSellIds, upsellIds, relatedIds],
    productId,
    48,
  );

  await ensureProductsCached(idsToFetch, 48);

  return {
    boughtTogether: getCachedProductsByIds(boughtTogetherIds, productId, 12),
    crossSell: getCachedProductsByIds(crossSellIds, productId, 12),
    upsell: getCachedProductsByIds(upsellIds, productId, 12),
    related: getCachedProductsByIds(relatedIds, productId, 12),
  };
};

const ensureRecommendationSections = async ({
  scope,
  productId,
  boughtTogetherIds = [],
  crossSellIds = [],
  upsellIds = [],
  relatedIds = [],
}: {
  scope: string;
  productId?: number;
  boughtTogetherIds?: number[];
  crossSellIds?: number[];
  upsellIds?: number[];
  relatedIds?: number[];
}) => {
  const cached = recommendationSectionCache.get(scope);
  if (cached) return cached;

  const pending = recommendationSectionRequestCache.get(scope);
  if (pending) return pending;

  const requestPromise = fetchRecommendationSections({
    productId,
    boughtTogetherIds,
    crossSellIds,
    upsellIds,
    relatedIds,
  })
    .then((items) => {
      recommendationSectionCache.set(scope, items);
      return items;
    })
    .finally(() => {
      if (recommendationSectionRequestCache.get(scope) === requestPromise) {
        recommendationSectionRequestCache.delete(scope);
      }
    });

  recommendationSectionRequestCache.set(scope, requestPromise);
  return requestPromise;
};

const getProductImage = (item: any) => {
  const image = item?.image;
  const firstGalleryImage = Array.isArray(item?.images) ? item.images[0] : null;
  const firstAltGalleryImage = Array.isArray(item?.galleryImages)
    ? item.galleryImages[0]
    : Array.isArray(item?.gallery_images)
      ? item.gallery_images[0]
      : null;
  const featuredImage =
    item?.featuredImage?.node ??
    item?.featuredImage ??
    item?.featured_image?.node ??
    item?.featured_image;

  return (
    firstDisplayImageUrl(
      typeof image === 'string' ? image : '',
      image?.sourceUrl,
      image?.src,
      image?.url,
      image?.source_url,
      image?.node?.sourceUrl,
      image?.node?.src,
      image?.node?.url,
      featuredImage?.sourceUrl,
      featuredImage?.src,
      featuredImage?.url,
      featuredImage?.source_url,
      featuredImage?.mediaItemUrl,
      item?.thumbnail,
      item?.thumbnailUrl,
      item?.image_url,
      item?.imageUrl,
      typeof firstGalleryImage === 'string' ? firstGalleryImage : '',
      firstGalleryImage?.sourceUrl,
      firstGalleryImage?.src,
      firstGalleryImage?.url,
      firstGalleryImage?.source_url,
      firstGalleryImage?.node?.sourceUrl,
      firstGalleryImage?.node?.src,
      firstGalleryImage?.node?.url,
      typeof firstAltGalleryImage === 'string' ? firstAltGalleryImage : '',
      firstAltGalleryImage?.sourceUrl,
      firstAltGalleryImage?.src,
      firstAltGalleryImage?.url,
      firstAltGalleryImage?.source_url,
      firstAltGalleryImage?.node?.sourceUrl,
      firstAltGalleryImage?.node?.src,
      firstAltGalleryImage?.node?.url,
    ) || '/product-placeholder.svg'
  );
};

const toPriceNumber = (item: any) => {
  const raw =
    item?.salePrice ??
    item?.price ??
    item?.regularPrice ??
    item?.prices?.price ??
    item?.prices?.sale_price ??
    item?.prices?.regular_price ??
    '';
  const parsed = Number(String(raw ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const toPriceLabel = (item: any) => {
  const raw =
    item?.salePrice ??
    item?.price ??
    item?.regularPrice ??
    item?.prices?.price ??
    item?.prices?.sale_price ??
    item?.prices?.regular_price ??
    '';
  const text = String(raw ?? '').trim();
  if (!text) return 'GHS 0.00';
  if (/(ghs?|\u20B5)/i.test(text)) return text;
  const value = Number(text.replace(/[^0-9.]/g, ''));
  return `GHS ${Number.isFinite(value) ? value.toFixed(2) : '0.00'}`;
};

const normalizeVariationSelections = (items?: Array<{ attribute: string; value: string }>) =>
  Array.isArray(items)
    ? items
        .map((entry) => ({
          attribute: String(entry?.attribute ?? '').trim(),
          value: String(entry?.value ?? '').trim(),
        }))
        .filter((entry) => entry.attribute && entry.value)
    : [];

const FrequentlyBoughtTogetherBundle = ({
  productId,
  primaryProduct,
  primaryVariationId,
  primaryVariationSelections,
  primaryDisabled = false,
  bundleProducts,
  title = 'Frequently Bought Together',
  description = 'Select the extras you want, then add the full bundle with this product in one go.',
  compactMobile = false,
}: {
  productId?: number;
  primaryProduct?: any;
  primaryVariationId?: number | string;
  primaryVariationSelections?: Array<{ attribute: string; value: string }>;
  primaryDisabled?: boolean;
  bundleProducts: any[];
  title?: string;
  description?: string;
  compactMobile?: boolean;
}) => {
  const { syncWithWooCommerce } = useCartStore();
  const showToast = useAddToCartToastStore((state) => state.showToast);
  const [bundleSelection, setBundleSelection] = useState<{ scope: string; keys: Record<string, boolean> }>({
    scope: '',
    keys: {},
  });
  const [bundleError, setBundleError] = useState<string | null>(null);
  const [isBundleAdding, setIsBundleAdding] = useState(false);

  const bundleScopeKey = useMemo(
    () => `${String(Number(productId) || 0)}::${buildProductListSignature(bundleProducts)}`,
    [bundleProducts, productId],
  );

  const defaultBundleSelection = useMemo(
    () =>
      bundleProducts.reduce<Record<string, boolean>>((acc, item) => {
        const key = getProductKey(item);
        if (key) acc[key] = true;
        return acc;
      }, {}),
    [bundleProducts],
  );

  const selectedBundleMap =
    bundleSelection.scope === bundleScopeKey ? bundleSelection.keys : defaultBundleSelection;

  const selectedBundleProducts = useMemo(
    () =>
      bundleProducts.filter((item) => {
        const key = getProductKey(item);
        return key ? selectedBundleMap[key] !== false : false;
      }),
    [bundleProducts, selectedBundleMap],
  );

  const totalBundlePrice = useMemo(
    () =>
      toPriceNumber(primaryProduct) +
      selectedBundleProducts.reduce((sum, item) => sum + toPriceNumber(item), 0),
    [primaryProduct, selectedBundleProducts],
  );

  const selectedItemCount = 1 + selectedBundleProducts.length;

  const toggleBundleItem = (item: any) => {
    const key = getProductKey(item);
    if (!key) return;
    const nextKeys = {
      ...selectedBundleMap,
      [key]: !(selectedBundleMap[key] !== false),
    };
    setBundleSelection({ scope: bundleScopeKey, keys: nextKeys });
  };

  const handleAddBundle = async () => {
    if (isBundleAdding || !primaryProduct || primaryDisabled) {
      if (primaryDisabled) {
        setBundleError('Select the product options above before adding the bundle.');
      }
      return;
    }

    const selectedPrimaryProductId = Number(primaryProduct?.id ?? primaryProduct?.databaseId ?? productId ?? 0);
    if (!Number.isFinite(selectedPrimaryProductId) || selectedPrimaryProductId <= 0) {
      setBundleError('The main product is unavailable for bundle purchase.');
      return;
    }

    const queue = [
      {
        product: primaryProduct,
        productId: selectedPrimaryProductId,
        variationId: primaryVariationId,
        variationSelections: normalizeVariationSelections(primaryVariationSelections),
      },
      ...selectedBundleProducts.map((item) => ({
        product: item,
        productId: Number(item?.id ?? item?.databaseId ?? 0),
        variationId: undefined,
        variationSelections: [],
      })),
    ];

    setBundleError(null);
    setIsBundleAdding(true);

    try {
      let lastResponse: any = null;

      for (const entry of queue) {
        if (!Number.isFinite(entry.productId) || entry.productId <= 0) continue;
        const payload: Record<string, any> = {
          id: entry.productId,
          quantity: 1,
        };

        const numericVariationId =
          entry.variationId !== undefined && entry.variationId !== null
            ? Number(entry.variationId)
            : undefined;

        if (Number.isFinite(numericVariationId)) {
          payload.variation_id = numericVariationId;
        }

        if (entry.variationSelections.length > 0) {
          payload.variation = entry.variationSelections;
          payload.variation_attributes = entry.variationSelections;
        }

        lastResponse = await postCartMutation(ENDPOINTS.CART_ADD, payload, {
          view: 'mini',
        });
      }

      if (!lastResponse) {
        throw new Error('Bundle add failed.');
      }

      setCartResponseCache(lastResponse);
      const transformed = transformAddToCartResponse(lastResponse);
      if (!transformed?.cart) {
        throw new Error('Cart update failed.');
      }

      syncWithWooCommerce(transformed.cart);
      showToast({
        productName: `${selectedItemCount} items`,
        cartCount: Number(transformed.cart?.totalProductsCount || 0),
      });
    } catch (error: any) {
      setBundleError(String(error?.message || 'Unable to add the selected bundle to cart.'));
    } finally {
      setIsBundleAdding(false);
    }
  };

  if (!primaryProduct || bundleProducts.length === 0) return null;

  return (
    <div className={`mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm ${compactMobile ? 'p-3 md:p-4 lg:p-5' : 'p-4 md:p-5'}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className={`${compactMobile ? 'text-base lg:text-xl' : 'text-xl'} font-bold text-gray-900`}>{title}</h3>
          <p className={`mt-1 text-gray-500 ${compactMobile ? 'text-xs lg:text-sm' : 'text-sm'}`}>{description}</p>

          {compactMobile && (
            <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3 lg:hidden">
              <div className="flex items-center gap-3">
                <img
                  src={toSizedImageUrl(getProductImage(primaryProduct), 96)}
                  alt={String(primaryProduct?.name || 'Product')}
                  className="h-12 w-12 rounded-lg border border-gray-200 object-cover bg-white"
                  width="48"
                  height="48"
                  decoding="async"
                  onError={(event) => {
                    if (event.currentTarget.src.endsWith('/product-placeholder.svg')) return;
                    event.currentTarget.src = '/product-placeholder.svg';
                  }}
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700">Bundle with the right accessory </p>
                  <p className="mt-0.5 line-clamp-1 text-xs font-medium text-gray-900">
                    {primaryProduct?.name || 'Product'}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-blue-700">{toPriceLabel(primaryProduct)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 overflow-x-auto pb-2 hide-scrollbar">
            <div className="flex min-w-max items-start gap-3 pr-2 lg:gap-4">
              <div className={`${compactMobile ? 'hidden lg:flex' : 'flex'} w-[240px] shrink-0 items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3`}>
                <div className="mt-1 h-4 w-4 rounded border-2 border-blue-600 bg-blue-600 ring-2 ring-blue-100" />
                <img
                  src={toSizedImageUrl(getProductImage(primaryProduct), 128)}
                  alt={String(primaryProduct?.name || 'Product')}
                  className="h-16 w-16 rounded-lg border border-gray-200 object-cover bg-white"
                  width="64"
                  height="64"
                  decoding="async"
                  onError={(event) => {
                    if (event.currentTarget.src.endsWith('/product-placeholder.svg')) return;
                    event.currentTarget.src = '/product-placeholder.svg';
                  }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700">This item</p>
                  <p className="mt-1 line-clamp-2 text-xs font-medium text-gray-900">
                    {primaryProduct?.name || 'Product'}
                  </p>
                  <p className="mt-1 text-sm font-bold text-blue-700">{toPriceLabel(primaryProduct)}</p>
                </div>
              </div>

              {bundleProducts.map((item) => {
                const key = getProductKey(item);
                if (!key) return null;
                const selected = selectedBundleMap[key] !== false;
                return (
                  <React.Fragment key={key}>
                    <div className={`${compactMobile ? 'hidden lg:block' : 'block'} pt-8 text-2xl font-light text-gray-300`}>+</div>
                    <label className={`flex ${compactMobile ? 'w-[176px] lg:w-[240px]' : 'w-[240px]'} shrink-0 cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${selected ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'}`}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleBundleItem(item)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <img
                        src={toSizedImageUrl(getProductImage(item), compactMobile ? 112 : 128)}
                        alt={String(item?.name || 'Bundle item')}
                        className={`${compactMobile ? 'h-14 w-14 lg:h-16 lg:w-16' : 'h-16 w-16'} rounded-lg border border-gray-200 object-cover bg-white`}
                        width={compactMobile ? 56 : 64}
                        height={compactMobile ? 56 : 64}
                        decoding="async"
                        onError={(event) => {
                          if (event.currentTarget.src.endsWith('/product-placeholder.svg')) return;
                          event.currentTarget.src = '/product-placeholder.svg';
                        }}
                      />
                      <div className="min-w-0">
                        <p className={`line-clamp-2 text-gray-900 ${compactMobile ? 'text-[11px] lg:text-xs' : 'text-xs'} font-medium`}>
                          {item?.name || 'Bundle item'}
                        </p>
                        <p className={`${compactMobile ? 'mt-0.5 text-xs lg:text-sm' : 'mt-1 text-sm'} font-bold text-blue-700`}>{toPriceLabel(item)}</p>
                      </div>
                    </label>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        <div className={`w-full rounded-2xl border border-gray-200 bg-gray-50 ${compactMobile ? 'p-3 lg:p-4' : 'p-4'} lg:max-w-[280px]`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {compactMobile ? 'Bundle Total' : 'Bundle Summary'}
          </p>
          <p className={`mt-2 text-gray-600 ${compactMobile ? 'text-xs lg:text-sm' : 'text-sm'}`}>
            {compactMobile
              ? `${selectedBundleProducts.length} extra${selectedBundleProducts.length === 1 ? '' : 's'} selected + this product`
              : `${selectedItemCount} item${selectedItemCount === 1 ? '' : 's'} selected`}
          </p>
          <p className={`mt-2 font-bold text-gray-900 ${compactMobile ? 'text-xl lg:text-2xl' : 'text-2xl'}`}>
            GHS {totalBundlePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <button
            type="button"
            onClick={handleAddBundle}
            disabled={isBundleAdding || primaryDisabled}
            className={`mt-4 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 ${compactMobile ? 'py-2.5 text-xs lg:py-3 lg:text-sm' : 'py-3 text-sm'} font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300`}
          >
            {isBundleAdding ? <LoadingSpinner color="white" size="sm" /> : `${compactMobile ? 'Add extras with product' : 'Add selected to cart'}`}
          </button>
          {primaryDisabled && (
            <p className="mt-2 text-xs text-amber-700">
              Choose your product variation above to include this item in the bundle.
            </p>
          )}
          {bundleError && (
            <p className="mt-2 text-xs text-red-600">{bundleError}</p>
          )}
        </div>
      </div>
    </div>
  );
};

const ProductRecommendationsDeferred: React.FC<Props> = ({
  productId,
  boughtTogetherProducts,
  boughtTogetherIds = [],
  crossSellProducts,
  crossSellIds = [],
  upsell,
  upsellIds = [],
  related,
  relatedIds = [],
  showBoughtTogether = true,
  showCrossSell = true,
  showUpsell = true,
  showRelated = true,
  containerClassName = 'w-full px-2 md:px-4',
  primaryProduct,
  primaryVariationId,
  primaryVariationSelections,
  primaryDisabled = false,
  compactMobile = false,
  deferUntilVisible = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const normalizedBoughtTogetherProducts = useMemo(
    () => normalizeRecommendationItems(boughtTogetherProducts),
    [boughtTogetherProducts],
  );
  const normalizedCrossSellProducts = useMemo(
    () => normalizeRecommendationItems(crossSellProducts),
    [crossSellProducts],
  );
  const normalizedUpsellProducts = useMemo(
    () => normalizeRecommendationItems(upsell),
    [upsell],
  );
  const normalizedRelatedProducts = useMemo(
    () => normalizeRecommendationItems(related),
    [related],
  );

  const recommendationScopeKey = [
    String(Number(productId) || 0),
    buildIdSignature(boughtTogetherIds),
    buildIdSignature(crossSellIds),
    buildIdSignature(upsellIds),
    buildIdSignature(relatedIds),
    buildProductListSignature(normalizedBoughtTogetherProducts),
    buildProductListSignature(normalizedCrossSellProducts),
    buildProductListSignature(normalizedUpsellProducts),
    buildProductListSignature(normalizedRelatedProducts),
  ].join('|');

  const shouldFetchBoughtTogether =
    normalizedBoughtTogetherProducts.length === 0 && boughtTogetherIds.length > 0;
  const shouldFetchCrossSell =
    normalizedCrossSellProducts.length === 0 && crossSellIds.length > 0;
  const shouldFetchUpsell = normalizedUpsellProducts.length === 0 && upsellIds.length > 0;
  const shouldFetchRelated = normalizedRelatedProducts.length === 0 && relatedIds.length > 0;
  const hasRemoteIdsToFetch =
    shouldFetchBoughtTogether ||
    shouldFetchCrossSell ||
    shouldFetchUpsell ||
    shouldFetchRelated;

  const [fetchedSections, setFetchedSections] = useState<{ scope: string; items: RecommendationSectionItems }>(() => {
    const cached = recommendationSectionCache.get(recommendationScopeKey);
    return cached
      ? { scope: recommendationScopeKey, items: cached }
      : {
          scope: '',
          items: createEmptyRecommendationSections(),
        };
  });
  const [isReadyToFetch, setIsReadyToFetch] = useState(!deferUntilVisible);

  useEffect(() => {
    const cached = recommendationSectionCache.get(recommendationScopeKey);
    if (cached) {
      setFetchedSections({ scope: recommendationScopeKey, items: cached });
      return;
    }

    setFetchedSections((current) =>
      current.scope === recommendationScopeKey
        ? current
        : {
            scope: '',
            items: createEmptyRecommendationSections(),
          },
    );
  }, [recommendationScopeKey]);

  const boughtTogetherState = useMemo(
    () => (
      normalizedBoughtTogetherProducts.length > 0
        ? normalizedBoughtTogetherProducts
        : (fetchedSections.scope === recommendationScopeKey ? fetchedSections.items.boughtTogether : [])
    ),
    [normalizedBoughtTogetherProducts, fetchedSections.items.boughtTogether, fetchedSections.scope, recommendationScopeKey],
  );
  const crossSellState = useMemo(
    () => (
      normalizedCrossSellProducts.length > 0
        ? normalizedCrossSellProducts
        : (fetchedSections.scope === recommendationScopeKey ? fetchedSections.items.crossSell : [])
    ),
    [normalizedCrossSellProducts, fetchedSections.items.crossSell, fetchedSections.scope, recommendationScopeKey],
  );
  const upsellState = useMemo(
    () => (
      normalizedUpsellProducts.length > 0
        ? normalizedUpsellProducts
        : (fetchedSections.scope === recommendationScopeKey ? fetchedSections.items.upsell : [])
    ),
    [fetchedSections.items.upsell, fetchedSections.scope, normalizedUpsellProducts, recommendationScopeKey],
  );
  const relatedState = useMemo(
    () => (
      normalizedRelatedProducts.length > 0
        ? normalizedRelatedProducts
        : (fetchedSections.scope === recommendationScopeKey ? fetchedSections.items.related : [])
    ),
    [fetchedSections.items.related, fetchedSections.scope, normalizedRelatedProducts, recommendationScopeKey],
  );
  const dedupedSections = useMemo(() => {
    const rootProductKey =
      Number.isFinite(Number(productId)) && Number(productId) > 0
        ? `id:${Number(productId)}`
        : '';
    const consumedKeys = new Set<string>();
    if (rootProductKey) consumedKeys.add(rootProductKey);

    const boughtTogether = dedupeProductList(boughtTogetherState, {
      excludeKeys: consumedKeys,
      limit: 12,
    });
    boughtTogether.forEach((entry) => {
      const key = getProductKey(entry);
      if (key) consumedKeys.add(key);
    });

    const crossSell = dedupeProductList(crossSellState, {
      excludeKeys: consumedKeys,
      limit: 12,
    });
    crossSell.forEach((entry) => {
      const key = getProductKey(entry);
      if (key) consumedKeys.add(key);
    });

    const upsell = dedupeProductList(upsellState, {
      excludeKeys: consumedKeys,
      limit: 12,
    });
    upsell.forEach((entry) => {
      const key = getProductKey(entry);
      if (key) consumedKeys.add(key);
    });

    const related = dedupeProductList(relatedState, {
      excludeKeys: consumedKeys,
      limit: 12,
    });

    return { boughtTogether, crossSell, upsell, related };
  }, [productId, boughtTogetherState, crossSellState, upsellState, relatedState]);

  useEffect(() => {
    if (!deferUntilVisible) {
      setIsReadyToFetch(true);
      return;
    }

    const node = containerRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setIsReadyToFetch(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0);
        if (visible) {
          setIsReadyToFetch(true);
          observer.disconnect();
        }
      },
      { rootMargin: '900px 0px' },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [deferUntilVisible]);

  useEffect(() => {
    if (!deferUntilVisible) return;
    if (!hasRemoteIdsToFetch) return;
    if (recommendationSectionCache.has(recommendationScopeKey)) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    const prefetch = () => {
      void ensureRecommendationSections({
        scope: recommendationScopeKey,
        productId,
        boughtTogetherIds: shouldFetchBoughtTogether ? boughtTogetherIds : [],
        crossSellIds: shouldFetchCrossSell ? crossSellIds : [],
        upsellIds: shouldFetchUpsell ? upsellIds : [],
        relatedIds: shouldFetchRelated ? relatedIds : [],
      }).then((items) => {
        if (!cancelled) {
          setFetchedSections({ scope: recommendationScopeKey, items });
        }
      });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(prefetch, { timeout: 1800 });
    } else {
      timeoutId = setTimeout(prefetch, 1200);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    deferUntilVisible,
    hasRemoteIdsToFetch,
    recommendationScopeKey,
    productId,
    shouldFetchBoughtTogether,
    boughtTogetherIds,
    shouldFetchCrossSell,
    crossSellIds,
    shouldFetchUpsell,
    upsellIds,
    shouldFetchRelated,
    relatedIds,
  ]);

  useEffect(() => {
    let active = true;

    if (!isReadyToFetch) return;

    const run = async () => {
      const sectionIds = {
        boughtTogether: shouldFetchBoughtTogether ? boughtTogetherIds : [],
        crossSell: shouldFetchCrossSell ? crossSellIds : [],
        upsell: shouldFetchUpsell ? upsellIds : [],
        related: shouldFetchRelated ? relatedIds : [],
      };

      const shouldFetch = Object.values(sectionIds).some((ids) => ids.length > 0);
      if (!shouldFetch) return;

      const items = await ensureRecommendationSections({
        scope: recommendationScopeKey,
        productId,
        boughtTogetherIds: sectionIds.boughtTogether,
        crossSellIds: sectionIds.crossSell,
        upsellIds: sectionIds.upsell,
        relatedIds: sectionIds.related,
      });

      if (active) {
        setFetchedSections({
          scope: recommendationScopeKey,
          items,
        });
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [
    isReadyToFetch,
    productId,
    recommendationScopeKey,
    shouldFetchBoughtTogether,
    boughtTogetherIds,
    shouldFetchCrossSell,
    crossSellIds,
    shouldFetchUpsell,
    upsellIds,
    shouldFetchRelated,
    relatedIds,
  ]);

  const hasAnyRecommendations = useMemo(
    () =>
      (showBoughtTogether && dedupedSections.boughtTogether.length > 0) ||
      (showCrossSell && dedupedSections.crossSell.length > 0) ||
      (showUpsell && dedupedSections.upsell.length > 0) ||
      (showRelated && dedupedSections.related.length > 0),
    [dedupedSections, showBoughtTogether, showCrossSell, showRelated, showUpsell],
  );

  const hasPotentialRecommendations =
    normalizedBoughtTogetherProducts.length > 0 ||
    normalizedCrossSellProducts.length > 0 ||
    normalizedUpsellProducts.length > 0 ||
    normalizedRelatedProducts.length > 0 ||
    boughtTogetherIds.length > 0 ||
    crossSellIds.length > 0 ||
    upsellIds.length > 0 ||
    relatedIds.length > 0;

  if (!hasPotentialRecommendations) return null;

  if (!isReadyToFetch) {
    return <div ref={containerRef} className={containerClassName} aria-hidden="true" />;
  }

  if (!hasAnyRecommendations) return <div ref={containerRef} className={containerClassName} aria-hidden="true" />;

  return (
    <div ref={containerRef} className={containerClassName}>
      {showBoughtTogether && dedupedSections.boughtTogether.length > 0 && (
        <FrequentlyBoughtTogetherBundle
          productId={productId}
          primaryProduct={primaryProduct}
          primaryVariationId={primaryVariationId}
          primaryVariationSelections={primaryVariationSelections}
          primaryDisabled={primaryDisabled}
          bundleProducts={dedupedSections.boughtTogether}
          compactMobile={compactMobile}
        />
      )}

      {showCrossSell && dedupedSections.crossSell.length > 0 && (
        primaryProduct ? (
          <FrequentlyBoughtTogetherBundle
            productId={productId}
            primaryProduct={primaryProduct}
            primaryVariationId={primaryVariationId}
            primaryVariationSelections={primaryVariationSelections}
            primaryDisabled={primaryDisabled}
            bundleProducts={dedupedSections.crossSell}
            title="Bundle with this product"
            description="Choose the add-ons you want and add them together with the product above."
            compactMobile={compactMobile}
          />
        ) : (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h3 className="text-xl font-bold mb-4 text-gray-900">Cross-Sell Recommendations</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
              {dedupedSections.crossSell.map((p: any, idx: number) => (
                <div key={String(p?.id ?? `${idx}`)} className="w-[160px] md:w-[220px] shrink-0 snap-start">
                  <ProductCard {...p} />
                  <div className="mt-2">
                    <AddToCart product={p} fullWidth={true} quantity={1} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {(showUpsell && dedupedSections.upsell.length > 0) || (showRelated && dedupedSections.related.length > 0) ? (
        <div className="mt-6 pt-6 border-t border-gray-100 space-y-6">
        {showUpsell && dedupedSections.upsell.length > 0 && (
          <div>
            <h3 className="text-xl font-bold mb-4 text-gray-900">You May Also Like</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
              {dedupedSections.upsell.map((p: any, idx: number) => (
                <div key={String(p?.id ?? `${idx}`)} className="w-[160px] md:w-[220px] shrink-0 snap-start">
                  <ProductCard {...p} />
                </div>
              ))}
            </div>
          </div>
        )}

        {showRelated && dedupedSections.related.length > 0 && (
          <div>
            <h3 className="text-xl font-bold mb-4 text-gray-900">Related Products</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
              {dedupedSections.related.map((p: any, idx: number) => (
                <div key={String(p?.id ?? `${idx}`)} className="w-[160px] md:w-[220px] shrink-0 snap-start">
                  <ProductCard {...p} />
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      ) : null}

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default ProductRecommendationsDeferred;
