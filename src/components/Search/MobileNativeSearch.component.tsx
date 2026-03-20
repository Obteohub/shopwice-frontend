import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSearchSuggestions } from '@/hooks/useSearchSuggestions';
import { paddedPrice } from '../../utils/functions/functions';
import { firstValidImageUrl, toSizedImageUrl } from '@/utils/image';

const extractSlugFromUrl = (value: unknown) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const withoutQuery = raw.split('?')[0];
  const clean = withoutQuery.replace(/^https?:\/\/[^/]+/i, '').split('/').filter(Boolean);
  const productIndex = clean.findIndex((entry) => entry.toLowerCase() === 'product');
  if (productIndex >= 0 && clean[productIndex + 1]) return clean[productIndex + 1];
  return clean[clean.length - 1] || '';
};

const MobileNativeSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { results, loading, error } = useSearchSuggestions(searchTerm, {
    perPage: 8,
    debounceMs: 400,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as HTMLElement)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const closeSuggestions = () => setIsFocused(false);
    router.events.on('routeChangeStart', closeSuggestions);
    router.events.on('routeChangeComplete', closeSuggestions);
    return () => {
      router.events.off('routeChangeStart', closeSuggestions);
      router.events.off('routeChangeComplete', closeSuggestions);
    };
  }, [router.events]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (!q) return;
    setIsFocused(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div ref={wrapperRef} className="w-full relative" suppressHydrationWarning>
      <form onSubmit={handleSearchSubmit} className="relative flex w-full">
        <input
          type="text"
          placeholder="Search on shopwice"
          className="w-full rounded-full border border-gray-200 bg-gray-50 py-2 pl-4 pr-10 text-sm"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsFocused(true);
          }}
          onFocus={() => setIsFocused(true)}
        />
        <button
          type="submit"
          title="Search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-900"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </button>
      </form>

      {isFocused && searchTerm.trim().length > 2 && (
        <div className="absolute top-full left-0 mt-2 w-full rounded-xl border border-gray-100 bg-white shadow-xl z-[85] overflow-hidden">
          {loading && <div className="p-4 text-center text-gray-500 text-sm">Searching...</div>}

          {error && <div className="p-4 text-center text-red-500 text-sm">Search temporarily unavailable</div>}

          {!loading && !error && results.length === 0 && (
            <div className="p-4 text-center text-gray-500 text-sm">No products found.</div>
          )}

          {!loading && !error && results.length > 0 && (
            <ul className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
              {results.map((item: any, index: number) => {
                const source = item?.product && typeof item.product === 'object' ? item.product : item;
                const sold = Number(source?.unitsSold ?? source?.units_sold ?? 0);
                const rawHref = String(
                  source?.url || source?.href || source?.link || source?.permalink || source?.productUrl || '',
                ).trim();
                const slug = String(source?.slug || '').trim() || extractSlugFromUrl(rawHref);
                const href = rawHref || (slug ? `/product/${slug}/` : '');
                if (!href) return null;
                const productKey = source?.id ?? source?.variationId ?? source?.productId ?? source?.slug ?? `${source?.name || 'item'}-${index}`;
                return (
                  <li key={productKey}>
                    <Link href={href} onClick={() => setIsFocused(false)}>
                      <div className="flex items-center gap-4 p-3 hover:bg-gray-50 transition-colors">
                        {(() => {
                          const imageUrl = firstValidImageUrl(
                            source?.image,
                            source?.image?.sourceUrl,
                            source?.image?.src,
                            source?.image?.url,
                            source?.thumbnail,
                            source?.thumbnailUrl,
                            source?.images?.[0],
                            source?.images?.[0]?.sourceUrl,
                            source?.images?.[0]?.src,
                            source?.images?.[0]?.url,
                          );
                          return imageUrl ? (
                            <img
                              src={toSizedImageUrl(imageUrl, 80)}
                              alt={source?.title || source?.name || 'Product'}
                              className="h-10 w-10 rounded object-cover border border-gray-100"
                              width="40"
                              height="40"
                              loading="lazy"
                              decoding="async"
                              onError={(event) => {
                                event.currentTarget.src = '/product-placeholder.svg';
                              }}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-gray-100 border border-gray-100" />
                          );
                        })()}
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-gray-900 line-clamp-1">{source?.title || source?.name}</span>
                          {(source?.variantLabel || source?.variant_label) && (
                            <span className="text-[11px] text-gray-500 line-clamp-1">
                              {source?.variantLabel || source?.variant_label}
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            {source?.onSale ? (
                              <>
                                <span className="text-xs font-bold text-red-600">
                                  {paddedPrice(source?.salePrice ?? source?.price ?? '', 'GHS ')}
                                </span>
                                <span className="text-[10px] text-gray-400 line-through">
                                  {paddedPrice(source?.regularPrice ?? '', 'GHS ')}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs font-bold text-gray-900">
                                {paddedPrice(source?.price ?? '', 'GHS ')}
                              </span>
                            )}
                            {sold > 0 && (
                              <span className="text-[10px] text-orange-600 font-semibold">
                                {sold.toLocaleString()} sold
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default MobileNativeSearch;
