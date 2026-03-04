import { api } from './api';
import { ENDPOINTS } from './endpoints';

const CART_CACHE_KEY = 'shopwice-cart-response-v1';

type CartView = 'mini' | 'full';

type CartCacheProfile = {
  view?: CartView;
  includeShippingRates?: boolean;
};

const DEFAULT_PROFILE: Required<CartCacheProfile> = {
  view: 'full',
  includeShippingRates: false,
};

const memoryCartByVariant: Record<string, { cart: any; ts: number }> = {};
const inflightCartByVariant = new Map<string, Promise<any>>();

const isBrowser = typeof window !== 'undefined';

const normalizeProfile = (profile?: CartCacheProfile): Required<CartCacheProfile> => ({
  view: profile?.view || DEFAULT_PROFILE.view,
  includeShippingRates: Boolean(profile?.includeShippingRates),
});

const makeVariantKey = (profile?: CartCacheProfile) => {
  const normalized = normalizeProfile(profile);
  return `${normalized.view}:${normalized.includeShippingRates ? 1 : 0}`;
};

const makeStorageKey = (profile?: CartCacheProfile) => `${CART_CACHE_KEY}:${makeVariantKey(profile)}`;

const extractCartPayload = (payload: any) => {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.cart && typeof payload.cart === 'object') return payload.cart;
  return payload;
};

const isCartResponse = (payload: any) =>
  !!payload && typeof payload === 'object' && Array.isArray(payload.items);

const persistCart = (cart: any, profile?: CartCacheProfile) => {
  if (!isBrowser || !isCartResponse(cart)) return;
  try {
    sessionStorage.setItem(
      makeStorageKey(profile),
      JSON.stringify({ ts: Date.now(), cart }),
    );
  } catch {
    // Ignore sessionStorage quota/privacy failures.
  }
};

const readPersistedCart = (profile?: CartCacheProfile) => {
  if (!isBrowser) return null;
  try {
    const raw = sessionStorage.getItem(makeStorageKey(profile));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isCartResponse(parsed?.cart)) return null;
    return { cart: parsed.cart, ts: Number(parsed.ts) || 0 };
  } catch {
    return null;
  }
};

const writeMemoryCache = (cart: any, profile?: CartCacheProfile) => {
  const key = makeVariantKey(profile);
  memoryCartByVariant[key] = { cart, ts: Date.now() };
};

const readMemoryCache = (profile?: CartCacheProfile) => {
  const key = makeVariantKey(profile);
  return memoryCartByVariant[key] || null;
};

const writeVariantCache = (cart: any, profile?: CartCacheProfile) => {
  writeMemoryCache(cart, profile);
  persistCart(cart, profile);
};

const getDefaultWriteProfiles = (cart: any): CartCacheProfile[] => {
  const profiles: CartCacheProfile[] = [
    { view: 'full', includeShippingRates: false },
    { view: 'mini', includeShippingRates: false },
  ];
  if (Array.isArray(cart?.shipping_rates) && cart.shipping_rates.length > 0) {
    profiles.push({ view: 'full', includeShippingRates: true });
  }
  return profiles;
};

export const getCachedCartResponse = (maxAgeMs = 8000, profile?: CartCacheProfile) => {
  const now = Date.now();

  const memoryCached = readMemoryCache(profile);
  if (isCartResponse(memoryCached?.cart) && now - memoryCached.ts <= maxAgeMs) {
    return memoryCached.cart;
  }

  const persisted = readPersistedCart(profile);
  if (persisted?.cart && now - persisted.ts <= maxAgeMs) {
    writeMemoryCache(persisted.cart, profile);
    return persisted.cart;
  }

  return null;
};

export const setCartResponseCache = (payload: any, profile?: CartCacheProfile) => {
  const cart = extractCartPayload(payload);
  if (!isCartResponse(cart)) return null;

  if (profile) {
    writeVariantCache(cart, profile);
    return cart;
  }

  // Backward-compatible default: warm both full + mini variants.
  const profiles = getDefaultWriteProfiles(cart);
  profiles.forEach((p) => writeVariantCache(cart, p));
  return cart;
};

export const clearCartResponseCache = (profile?: CartCacheProfile) => {
  if (profile) {
    const key = makeVariantKey(profile);
    delete memoryCartByVariant[key];
  } else {
    Object.keys(memoryCartByVariant).forEach((key) => {
      delete memoryCartByVariant[key];
    });
  }

  if (!isBrowser) return;
  try {
    if (profile) {
      sessionStorage.removeItem(makeStorageKey(profile));
      return;
    }
    const keysToDelete: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(`${CART_CACHE_KEY}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // Ignore sessionStorage failures.
  }
};

export const getCartFast = async ({
  force = false,
  maxAgeMs = 8000,
  view = 'full',
  includeShippingRates = false,
}: {
  force?: boolean;
  maxAgeMs?: number;
  view?: 'mini' | 'full';
  includeShippingRates?: boolean;
} = {}) => {
  const profile = { view, includeShippingRates };
  const variantKey = makeVariantKey(profile);

  if (!force) {
    const cached = getCachedCartResponse(maxAgeMs, profile);
    if (cached) return cached;
  }

  const inFlight = inflightCartByVariant.get(variantKey);
  if (inFlight) {
    return inFlight;
  }

  const requestPromise = api
    .get(ENDPOINTS.CART, {
      params: {
        ...(view ? { view } : {}),
        ...(includeShippingRates ? { include_shipping_rates: 1 } : {}),
      },
    })
    .then((response: any) => {
      const cached = setCartResponseCache(response, profile);
      return cached ?? extractCartPayload(response) ?? response;
    })
    .finally(() => {
      inflightCartByVariant.delete(variantKey);
    });

  inflightCartByVariant.set(variantKey, requestPromise);
  return requestPromise;
};
