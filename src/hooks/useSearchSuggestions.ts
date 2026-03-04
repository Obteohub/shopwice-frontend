import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';

export interface SearchSuggestionOptions {
  debounceMs?: number;
  minChars?: number;
  perPage?: number;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  orderby?: string;
  order?: 'asc' | 'desc' | 'ASC' | 'DESC';
  revalidateOnCacheHit?: boolean;
}

const DEFAULT_DEBOUNCE_MS = 400;
const DEFAULT_MIN_CHARS = 3;
const DEFAULT_PER_PAGE = 8;
const CACHE_LIMIT = 50;

type Suggestion = any;

function normalizeSearchItems<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.items)) return payload.items as T[];
    if (Array.isArray(payload.data?.items)) return payload.data.items as T[];
    if (Array.isArray(payload.data)) return payload.data as T[];
    if (Array.isArray(payload.products)) return payload.products as T[];
    if (Array.isArray(payload.results)) return payload.results as T[];
    if (Array.isArray(payload.data?.results)) return payload.data.results as T[];
    if (Array.isArray(payload.data?.products)) return payload.data.products as T[];
  }
  return [];
}

function isAbortLikeError(err: any) {
  if (err?.name === 'AbortError') return true;
  if (err?.code === 'ERR_CANCELED') return true;
  if (typeof err?.message === 'string' && err.message.toLowerCase().includes('canceled')) return true;
  return false;
}

export function useSearchSuggestions<T = Suggestion>(
  term: string,
  options: SearchSuggestionOptions = {},
) {
  const {
    debounceMs = DEFAULT_DEBOUNCE_MS,
    minChars = DEFAULT_MIN_CHARS,
    perPage = DEFAULT_PER_PAGE,
    category,
    brand,
    minPrice,
    maxPrice,
    orderby,
    order,
    revalidateOnCacheHit = false,
  } = options;

  const [debouncedTerm, setDebouncedTerm] = useState(term);
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheRef = useRef<Map<string, T[]>>(new Map());
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const cacheKey = useMemo(() => {
    const normalized = (debouncedTerm ?? '').trim().toLowerCase();
    return [
      normalized,
      `pp=${perPage}`,
      `c=${category || ''}`,
      `b=${brand || ''}`,
      `min=${typeof minPrice === 'number' ? minPrice : ''}`,
      `max=${typeof maxPrice === 'number' ? maxPrice : ''}`,
      `ob=${orderby || ''}`,
      `o=${order || ''}`,
    ].join('::');
  }, [debouncedTerm, perPage, category, brand, minPrice, maxPrice, orderby, order]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(term), debounceMs);
    return () => clearTimeout(timer);
  }, [term, debounceMs]);

  useEffect(() => {
    const normalizedTerm = (debouncedTerm ?? '').trim();

    if (normalizedTerm.length < minChars) {
      abortRef.current?.abort();
      requestIdRef.current += 1;
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const requestId = ++requestIdRef.current;

    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setResults(cached);
      setError(null);
      if (!revalidateOnCacheHit) {
        setLoading(false);
        return;
      }
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(!cached);
    setError(null);

    (async () => {
      try {
        const data: any = await api.get(ENDPOINTS.SEARCH, {
          params: {
            q: normalizedTerm,
            page: 1,
            perPage,
            ...(category ? { category } : {}),
            ...(brand ? { brand } : {}),
            ...(typeof minPrice === 'number' ? { minPrice } : {}),
            ...(typeof maxPrice === 'number' ? { maxPrice } : {}),
            ...(orderby ? { orderby } : {}),
            ...(order ? { order } : {}),
          },
          signal: controller.signal,
        });

        if (requestIdRef.current !== requestId) return;

        const nextResults = normalizeSearchItems<T>(data);
        setResults(nextResults);
        cacheRef.current.set(cacheKey, nextResults);

        if (cacheRef.current.size > CACHE_LIMIT) {
          const oldestKey = cacheRef.current.keys().next().value;
          if (oldestKey) cacheRef.current.delete(oldestKey);
        }
      } catch (err: any) {
        if (requestIdRef.current !== requestId) return;
        if (isAbortLikeError(err)) return;
        setResults([]);
        setError('Search temporarily unavailable');
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [
    debouncedTerm,
    minChars,
    perPage,
    category,
    brand,
    minPrice,
    maxPrice,
    orderby,
    order,
    cacheKey,
    revalidateOnCacheHit,
  ]);

  const clearCache = () => cacheRef.current.clear();

  return { results, loading, error, clearCache };
}
