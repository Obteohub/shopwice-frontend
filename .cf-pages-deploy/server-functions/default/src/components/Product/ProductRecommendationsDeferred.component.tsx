import React, { useEffect, useMemo, useState } from 'react';
import AddToCart from './AddToCart.component';
import ProductCard from './ProductCard.component';
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';
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
};

const relationProductCache = new Map<number, any>();

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

const fetchProductsByIds = async (ids: number[], excludeId?: number, limit = 12) => {
  const selected = toUniqueIds(ids, excludeId, limit);
  if (selected.length === 0) return [];

  const missingIds = selected.filter((id) => !relationProductCache.has(id));

  if (missingIds.length > 0) {
    try {
      const include = missingIds.join(',');
      const raw = await api.get<any>(ENDPOINTS.PRODUCTS, {
        params: {
          include,
          per_page: Math.min(missingIds.length, limit),
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
    }
  }

  return selected
    .map((id) => relationProductCache.get(id) ?? null)
    .filter(Boolean)
    .filter((item: any) => Number(item?.id) !== Number(excludeId));
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
}) => {
  const [fetchedBoughtTogether, setFetchedBoughtTogether] = useState<any[]>([]);
  const [fetchedCrossSell, setFetchedCrossSell] = useState<any[]>([]);
  const [fetchedUpsell, setFetchedUpsell] = useState<any[]>([]);
  const [fetchedRelated, setFetchedRelated] = useState<any[]>([]);

  const boughtTogetherState = useMemo(
    () => (boughtTogetherProducts.length > 0 ? boughtTogetherProducts : fetchedBoughtTogether),
    [boughtTogetherProducts, fetchedBoughtTogether],
  );
  const crossSellState = useMemo(
    () => (crossSellProducts.length > 0 ? crossSellProducts : fetchedCrossSell),
    [crossSellProducts, fetchedCrossSell],
  );
  const upsellState = useMemo(
    () => (upsell.length > 0 ? upsell : fetchedUpsell),
    [upsell, fetchedUpsell],
  );
  const relatedState = useMemo(
    () => (related.length > 0 ? related : fetchedRelated),
    [related, fetchedRelated],
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
    let active = true;

    const run = async () => {
      const tasks: Array<Promise<void>> = [];

      if (
        boughtTogetherProducts.length === 0 &&
        fetchedBoughtTogether.length === 0 &&
        boughtTogetherIds.length > 0
      ) {
        tasks.push(
          fetchProductsByIds(boughtTogetherIds, productId, 12).then((items) => {
            if (active && items.length > 0) setFetchedBoughtTogether(items);
          }),
        );
      }

      if (
        crossSellProducts.length === 0 &&
        fetchedCrossSell.length === 0 &&
        crossSellIds.length > 0
      ) {
        tasks.push(
          fetchProductsByIds(crossSellIds, productId, 12).then((items) => {
            if (active && items.length > 0) setFetchedCrossSell(items);
          }),
        );
      }

      if (upsell.length === 0 && fetchedUpsell.length === 0 && upsellIds.length > 0) {
        tasks.push(
          fetchProductsByIds(upsellIds, productId, 12).then((items) => {
            if (active && items.length > 0) setFetchedUpsell(items);
          }),
        );
      }

      if (related.length === 0 && fetchedRelated.length === 0 && relatedIds.length > 0) {
        tasks.push(
          fetchProductsByIds(relatedIds, productId, 12).then((items) => {
            if (active && items.length > 0) setFetchedRelated(items);
          }),
        );
      }

      if (tasks.length > 0) {
        await Promise.allSettled(tasks);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [
    productId,
    boughtTogetherProducts.length,
    boughtTogetherIds,
    fetchedBoughtTogether.length,
    crossSellProducts.length,
    crossSellIds,
    fetchedCrossSell.length,
    upsell.length,
    upsellIds,
    fetchedUpsell.length,
    related.length,
    relatedIds,
    fetchedRelated.length,
  ]);

  const hasAnyRecommendations = useMemo(
    () =>
      dedupedSections.boughtTogether.length > 0 ||
      dedupedSections.crossSell.length > 0 ||
      dedupedSections.upsell.length > 0 ||
      dedupedSections.related.length > 0,
    [dedupedSections],
  );

  if (!hasAnyRecommendations) return null;

  return (
    <div className="w-full px-2 md:px-4">
      {dedupedSections.boughtTogether.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <h3 className="text-xl font-bold mb-4 text-gray-900">Frequently Bought Together</h3>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
            {dedupedSections.boughtTogether.map((p: any, idx: number) => (
              <div key={String(p?.id ?? `${idx}`)} className="w-[160px] md:w-[220px] shrink-0 snap-start">
                <ProductCard {...p} />
                <div className="mt-2">
                  <AddToCart product={p} fullWidth={true} quantity={1} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {dedupedSections.crossSell.length > 0 && (
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
      )}

      <div className="mt-6 pt-6 border-t border-gray-100 space-y-6">
        {dedupedSections.upsell.length > 0 && (
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

        {dedupedSections.related.length > 0 && (
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
