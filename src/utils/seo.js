const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RANKMATH_TIMEOUT_MS = 8000;
const RANKMATH_FAILURE_CACHE_TTL_MS = 5 * 60 * 1000;
// Image probe runs in the background (non-blocking), so a longer timeout is acceptable.
const IMAGE_PROBE_TIMEOUT_MS = 15000;

const rankMathHeadCache = new Map();
const rankMathFailureCache = new Map();
const ogImageStatusCache = new Map();

const TRACKING_QUERY_KEYS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'msclkid',
  'dclid',
  'yclid',
  '_ga',
]);

const toStringValue = (value) => (typeof value === 'string' ? value.trim() : '');

const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

const getWpBaseUrl = () => trimTrailingSlash(toStringValue(process.env.NEXT_PUBLIC_WP_API_URL));

export const getSiteUrl = () => trimTrailingSlash(toStringValue(process.env.NEXT_PUBLIC_SITE_URL));

export const getDefaultOgImage = () => toStringValue(process.env.NEXT_PUBLIC_OG_DEFAULT_IMAGE);

export const getSiteName = () => toStringValue(process.env.NEXT_PUBLIC_SITE_NAME) || 'Shopwice';

const canUseServerCache = () => typeof window === 'undefined';

const getRankMathTimeoutMs = () => {
  const parsed = Number.parseInt(
    toStringValue(process.env.RANKMATH_TIMEOUT_MS || process.env.NEXT_PUBLIC_RANKMATH_TIMEOUT_MS),
    10,
  );
  if (Number.isFinite(parsed) && parsed >= 1000 && parsed <= 60000) {
    return parsed;
  }
  return DEFAULT_RANKMATH_TIMEOUT_MS;
};

const isCacheableSeoPath = (pathname) => {
  if (!pathname) return false;
  return (
    pathname.startsWith('/product/') ||
    pathname.startsWith('/product-category/') ||
    pathname.startsWith('/brand/') ||
    pathname.startsWith('/tag/') ||
    pathname.startsWith('/location/') ||
    pathname === '/shop' ||
    pathname === '/products'
  );
};

const readCachedHead = (cacheKey) => {
  const cached = rankMathHeadCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    rankMathHeadCache.delete(cacheKey);
    return null;
  }
  return cached.head;
};

const writeCachedHead = (cacheKey, head) => {
  if (!head) return;
  if (rankMathHeadCache.size > 1000) {
    rankMathHeadCache.clear();
  }
  rankMathHeadCache.set(cacheKey, {
    head,
    expiresAt: Date.now() + DAY_IN_MS,
  });
};

const hasRecentRankMathFailure = (cacheKey) => {
  const cached = rankMathFailureCache.get(cacheKey);
  if (!cached) return false;
  if (cached.expiresAt <= Date.now()) {
    rankMathFailureCache.delete(cacheKey);
    return false;
  }
  return true;
};

const writeRankMathFailure = (cacheKey) => {
  if (!cacheKey) return;
  if (rankMathFailureCache.size > 1000) {
    rankMathFailureCache.clear();
  }
  rankMathFailureCache.set(cacheKey, {
    expiresAt: Date.now() + RANKMATH_FAILURE_CACHE_TTL_MS,
  });
};

const clearRankMathFailure = (cacheKey) => {
  if (!cacheKey) return;
  rankMathFailureCache.delete(cacheKey);
};

const makeTimeoutSignal = (ms) => {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  return undefined;
};

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractTitleFromHead = (head) => {
  const match = String(head || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return toStringValue(match?.[1] || '');
};

const extractMetaContent = (head, key, attribute = 'name') => {
  const source = String(head || '');
  const escapedKey = escapeRegex(key);
  const escapedAttribute = escapeRegex(attribute);

  const patternA = new RegExp(
    `<meta[^>]*${escapedAttribute}\\s*=\\s*["']${escapedKey}["'][^>]*content\\s*=\\s*["']([^"']*)["'][^>]*>`,
    'i',
  );
  const patternB = new RegExp(
    `<meta[^>]*content\\s*=\\s*["']([^"']*)["'][^>]*${escapedAttribute}\\s*=\\s*["']${escapedKey}["'][^>]*>`,
    'i',
  );

  const first = source.match(patternA)?.[1];
  if (first) return toStringValue(first);
  const second = source.match(patternB)?.[1];
  return toStringValue(second || '');
};

const hasSchemaType = (head, expectedType) => {
  if (!head || !expectedType) return false;
  const escapedType = escapeRegex(expectedType);
  return new RegExp(`"@type"\\s*:\\s*(?:\\[\\s*)?["']${escapedType}["']`, 'i').test(head);
};

const toComparableTitle = (value) =>
  toStringValue(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const isGenericSiteTitle = (title) => {
  const normalizedTitle = toComparableTitle(title);
  if (!normalizedTitle) return true;

  const siteName = toComparableTitle(getSiteName());
  if (!siteName) return false;

  return (
    normalizedTitle === siteName ||
    normalizedTitle === `${siteName} ghana`
  );
};

const extractHeadSignals = (head) => {
  const title = extractTitleFromHead(head);
  const metaDescription = extractMetaContent(head, 'description', 'name');
  const robots = extractMetaContent(head, 'robots', 'name');

  return {
    title,
    metaDescription,
    robots,
    hasProductSchema: hasSchemaType(head, 'Product'),
    hasBreadcrumbSchema: hasSchemaType(head, 'BreadcrumbList'),
    hasWebPageSchema:
      hasSchemaType(head, 'WebPage') || hasSchemaType(head, 'ItemPage'),
    isGenericTitle: isGenericSiteTitle(title),
  };
};

const scoreHeadQuality = (head) => {
  if (!head) return -1;
  const signals = extractHeadSignals(head);

  let score = 0;
  if (signals.title && !signals.isGenericTitle) score += 2;
  if (signals.metaDescription.length >= 50) score += 2;
  if (signals.hasProductSchema) score += 4;
  if (signals.hasBreadcrumbSchema) score += 2;
  if (signals.hasWebPageSchema) score += 1;
  if (signals.robots) score += 1;

  return score;
};

const shouldTryBackendMirror = (pathname, head) => {
  if (!pathname) return false;
  if (!head) return true;

  const signals = extractHeadSignals(head);
  const isProductPath = pathname.startsWith('/product/');
  const isArchivePath =
    pathname.startsWith('/product-category/') ||
    pathname.startsWith('/brand/') ||
    pathname.startsWith('/tag/') ||
    pathname.startsWith('/location/') ||
    pathname === '/products' ||
    pathname === '/shop';

  if (isProductPath && !signals.hasProductSchema) return true;
  if (isArchivePath && !signals.hasBreadcrumbSchema && !signals.hasWebPageSchema) return true;
  if (signals.isGenericTitle && signals.metaDescription.length < 40) return true;

  return false;
};

const buildBackendMirrorUrl = (frontendUrl, wpBaseUrl) => {
  try {
    const frontend = new URL(frontendUrl);
    const wp = new URL(wpBaseUrl);
    const mirrored = new URL(`${frontend.pathname}${frontend.search}`, wp.origin);
    return mirrored.toString();
  } catch {
    return '';
  }
};

const normalizeRankMathTargetUrl = (frontendUrl) => {
  const siteUrl = getSiteUrl();
  if (!frontendUrl || !siteUrl) return frontendUrl;

  try {
    const input = new URL(frontendUrl);
    const site = new URL(siteUrl);
    const host = input.hostname.toLowerCase();
    const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '::1';

    if (!isLocalhost) {
      return frontendUrl;
    }

    return new URL(`${input.pathname}${input.search}`, site.origin).toString();
  } catch {
    return frontendUrl;
  }
};

const fetchRankMathHead = async ({ wpBaseUrl, targetUrl, shouldCache }) => {
  const requestUrl = `${wpBaseUrl}/wp-json/rankmath/v1/getHead?url=${encodeURIComponent(targetUrl)}`;
  let response;

  try {
    response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      redirect: 'follow',
      cache: shouldCache ? 'force-cache' : 'no-store',
      next: shouldCache ? { revalidate: 60 * 60 * 24 } : undefined,
      signal: makeTimeoutSignal(getRankMathTimeoutMs()),
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[SEO] RankMath getHead request failed for ${targetUrl}:`, error);
    }
    return null;
  }

  if (!response.ok) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[SEO] RankMath getHead failed with status ${response.status} for ${targetUrl}`);
    }
    return null;
  }

  const payload = await response.json().catch(() => null);
  return typeof payload?.head === 'string' ? payload.head : null;
};

export const buildFrontendUrl = (inputUrl) => {
  const raw = toStringValue(inputUrl);
  const siteUrl = getSiteUrl();

  if (!raw) return '';

  try {
    if (/^https?:\/\//i.test(raw)) {
      return new URL(raw).toString();
    }

    if (!siteUrl) return '';

    const base = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
    const relative = raw.startsWith('/') ? raw.slice(1) : raw;
    return new URL(relative, base).toString();
  } catch {
    return '';
  }
};

/**
 * Fetches raw RankMath SEO head HTML for a frontend URL.
 * @param {string} frontendPageUrl
 * @returns {Promise<string | null>}
 */
export async function getRankMathSEO(frontendPageUrl) {
  const frontendUrl = buildFrontendUrl(frontendPageUrl);
  const wpBaseUrl = getWpBaseUrl();

  if (!frontendUrl || !wpBaseUrl) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[SEO] Missing NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_WP_API_URL');
    }
    return null;
  }

  let pathname = '';
  try {
    pathname = new URL(frontendUrl).pathname;
  } catch {
    return null;
  }

  const shouldCache = canUseServerCache() && isCacheableSeoPath(pathname);
  const rankMathTargetUrl = normalizeRankMathTargetUrl(frontendUrl);
  const cacheKey = rankMathTargetUrl || frontendUrl;

  if (shouldCache) {
    const cached = readCachedHead(cacheKey);
    if (cached) return cached;
    if (hasRecentRankMathFailure(cacheKey)) return null;
  }

  const frontendHead = await fetchRankMathHead({
    wpBaseUrl,
    targetUrl: rankMathTargetUrl,
    shouldCache,
  });

  let selectedHead = frontendHead;
  const backendMirrorUrl = buildBackendMirrorUrl(rankMathTargetUrl, wpBaseUrl);
  const canTryBackendMirror = backendMirrorUrl && backendMirrorUrl !== rankMathTargetUrl;

  if (canTryBackendMirror && shouldTryBackendMirror(pathname, frontendHead)) {
    const backendHead = await fetchRankMathHead({
      wpBaseUrl,
      targetUrl: backendMirrorUrl,
      shouldCache,
    });

    if (scoreHeadQuality(backendHead) > scoreHeadQuality(frontendHead)) {
      selectedHead = backendHead;
    }
  }

  if (shouldCache && selectedHead) {
    clearRankMathFailure(cacheKey);
    writeCachedHead(cacheKey, selectedHead);
  } else if (shouldCache) {
    writeRankMathFailure(cacheKey);
  }

  return selectedHead;
}

export const stripHtml = (value) =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const buildFallbackDescription = (value, maxLength = 155) => {
  const clean = stripHtml(value);
  if (!clean) return '';
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 3).trim()}...`;
};

export const stripTrackingParams = (inputUrl) => {
  const raw = toStringValue(inputUrl);
  if (!raw) return raw;

  try {
    const parsed = new URL(raw);
    const keys = Array.from(parsed.searchParams.keys());
    for (const key of keys) {
      if (TRACKING_QUERY_KEYS.has(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      }
    }
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return raw;
  }
};

const readOgImageCache = (url) => {
  const cached = ogImageStatusCache.get(url);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    ogImageStatusCache.delete(url);
    return null;
  }
  return cached.valid;
};

const writeOgImageCache = (url, valid) => {
  if (ogImageStatusCache.size > 2000) {
    ogImageStatusCache.clear();
  }
  ogImageStatusCache.set(url, {
    valid,
    expiresAt: Date.now() + DAY_IN_MS,
  });
};

const checkImageWithMethod = async (url, method) => {
  const response = await fetch(url, {
    method,
    redirect: 'follow',
    cache: 'force-cache',
    next: { revalidate: 60 * 60 * 24 },
    signal: makeTimeoutSignal(IMAGE_PROBE_TIMEOUT_MS),
  });

  if (!response.ok) return false;

  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  return contentType.includes('image/');
};

export async function resolveSeoOgImage(imageUrl) {
  const fallback = getDefaultOgImage();
  const candidate = stripTrackingParams(toStringValue(imageUrl));

  if (!candidate) return fallback || null;

  // Do not add network overhead in the browser.
  if (typeof window !== 'undefined') {
    return candidate;
  }

  const cachedValid = readOgImageCache(candidate);
  if (cachedValid !== null) {
    return cachedValid ? candidate : fallback || null;
  }

  // Cache miss: return the candidate URL optimistically (trust our own CDN/WooCommerce images)
  // and probe in the background to warm the cache for the next request.
  void (async () => {
    try {
      let valid = await checkImageWithMethod(candidate, 'HEAD');
      if (!valid) {
        valid = await checkImageWithMethod(candidate, 'GET');
      }
      writeOgImageCache(candidate, valid);
    } catch {
      writeOgImageCache(candidate, false);
    }
  })();

  return candidate;
}
