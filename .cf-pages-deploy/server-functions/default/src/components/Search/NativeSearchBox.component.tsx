import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchSuggestions } from '@/hooks/useSearchSuggestions';
import { paddedPrice } from '../../utils/functions/functions';
import { normalizeImageUrl } from '@/utils/image';

const SuggestionImage = ({
  src,
  alt,
}: {
  src?: string;
  alt: string;
}) => {
  const resolvedSrc = normalizeImageUrl(src);
  if (!resolvedSrc) return null;

  return <Image src={resolvedSrc} alt={alt} fill className="object-cover" sizes="48px" />;
};

const extractSlugFromUrl = (value: unknown) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const withoutQuery = raw.split('?')[0];
  const clean = withoutQuery
    .replace(/^https?:\/\/[^/]+/i, '')
    .split('/')
    .filter(Boolean);
  const productIndex = clean.findIndex((part) => part.toLowerCase() === 'product');
  if (productIndex >= 0 && clean[productIndex + 1]) return clean[productIndex + 1];
  return clean[clean.length - 1] || '';
};

const NativeSearchBox = () => {
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
    <div ref={wrapperRef} className="w-full relative">
      <form onSubmit={handleSearchSubmit} className="relative flex w-full">
        <input
          type="text"
          placeholder="Search for products..."
          className="w-full rounded-full border border-gray-200 bg-gray-50 py-3 pl-6 pr-12 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
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
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-orange-500 p-2 text-gray-100 hover:bg-orange-600 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-5 w-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </button>
      </form>

      {isFocused && searchTerm.trim().length > 2 && (
        <div className="absolute top-full left-0 mt-2 w-full rounded-xl border border-gray-100 bg-white shadow-xl z-[75] overflow-hidden">
          {loading && <div className="p-4 text-center text-gray-500 text-sm">Searching...</div>}

          {error && <div className="p-4 text-center text-red-500 text-xs">Search temporarily unavailable</div>}

          {!loading && !error && results.length === 0 && (
            <div className="p-4 text-center text-gray-500 text-sm">No products found.</div>
          )}

          {!loading && !error && results.length > 0 && (
            <ul className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
              {results.map((product: any, index: number) => {
                const source =
                  product?.product && typeof product.product === 'object'
                    ? product.product
                    : product;
                const imageUrl =
                  normalizeImageUrl(source.image?.sourceUrl) ||
                  normalizeImageUrl(source.image?.src) ||
                  normalizeImageUrl(source.image?.url) ||
                  normalizeImageUrl(source.image?.source_url) ||
                  '';
                const sold = Number(source.unitsSold ?? source.units_sold ?? 0);
                const productKey =
                  source.id ??
                  source.variationId ??
                  source.productId ??
                  source.databaseId ??
                  source.slug ??
                  `${source.name}-${index}`;
                const rawHref = String(
                  source?.url ||
                  source?.href ||
                  source?.link ||
                  source?.permalink ||
                  '',
                ).trim();
                const slugFromData =
                  String(source?.slug || '').trim() ||
                  extractSlugFromUrl(rawHref);
                const fallbackHref = slugFromData ? `/product/${slugFromData}/` : '';
                const href = rawHref || fallbackHref;
                if (!href) return null;
                return (
                  <li key={productKey}>
                    <Link href={href} onClick={() => setIsFocused(false)}>
                      <div className="flex items-center gap-4 p-3 hover:bg-gray-50 transition-colors">
                        <div className="h-12 w-12 flex-shrink-0 relative rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                          <SuggestionImage
                            src={imageUrl}
                            alt={source.title || source.name || 'Product'}
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-gray-900 line-clamp-1">{source.title || source.name}</span>
                          {source?.variantLabel && (
                            <span className="text-[11px] font-semibold text-gray-600 line-clamp-1">
                              Variant: {source.variantLabel}
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            {source.onSale ? (
                              <>
                                <span className="text-xs font-bold text-red-600">
                                  {paddedPrice(source.salePrice ?? source.price ?? '', 'GHS ')}
                                </span>
                                <span className="text-[10px] text-gray-400 line-through">
                                  {paddedPrice(source.regularPrice ?? '', 'GHS ')}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs font-bold text-gray-900">
                                {paddedPrice(source.price ?? '', 'GHS ')}
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

export default NativeSearchBox;
