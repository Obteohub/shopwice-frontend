const INVALID_IMAGE_TOKENS = new Set([
  '',
  'null',
  'undefined',
  'false',
  '[object object]',
]);

const IMAGE_FILE_PATTERN = /\.(avif|webp|png|jpe?g|gif|svg)(\?|#|$)/i;
const BROKEN_WC_PLACEHOLDER_PATTERN = /woocommerce-placeholder\.png(\?|#|$)/i;
const FIXED_WC_PLACEHOLDER = 'woocommerce-placeholder.webp';
const PROXY_IMAGE_ROUTE = '/api/image-proxy';
const ORB_PRONE_IMAGE_HOSTS = new Set(['cdn.shopwice.com']);

const resolveDefaultProxyQuality = (width?: number | null) => {
  const normalizedWidth = Number(width);
  if (!Number.isFinite(normalizedWidth) || normalizedWidth <= 0) return 72;
  if (normalizedWidth <= 64) return 50;
  if (normalizedWidth <= 96) return 52;
  if (normalizedWidth <= 160) return 55;
  if (normalizedWidth <= 256) return 58;
  if (normalizedWidth <= 384) return 62;
  if (normalizedWidth <= 640) return 66;
  if (normalizedWidth <= 960) return 70;
  if (normalizedWidth <= 1440) return 74;
  return 78;
};

const normalizeOrigin = (value?: string) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed)
    ? trimmed.replace(/\/+$/, '')
    : `https://${trimmed.replace(/\/+$/, '')}`;
};

const getConfiguredMediaOrigin = () => {
  const wpOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_WP_API_URL);
  if (wpOrigin) return wpOrigin;

  const siteOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (siteOrigin) return siteOrigin;

  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeOrigin(window.location.origin);
  }

  return 'https://shopwice.com';
};

const looksLikeDomainOnly = (value: string) =>
  /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(value);

const looksLikeRelativeImagePath = (value: string) => {
  if (!value || value.startsWith('./') || value.startsWith('../')) {
    return false;
  }

  const normalizedPath = value.replace(/^\/+/, '');
  const isKnownMediaPath =
    normalizedPath.startsWith('wp-content/') ||
    normalizedPath.startsWith('uploads/') ||
    normalizedPath.startsWith('content/uploads/') ||
    normalizedPath.startsWith('media/') ||
    normalizedPath.startsWith('storage/');

  if (
    value.startsWith('/wp-content/') ||
    value.startsWith('/uploads/') ||
    value.startsWith('/content/uploads/') ||
    value.startsWith('/media/') ||
    value.startsWith('/storage/') ||
    isKnownMediaPath
  ) {
    return true;
  }

  if (value.startsWith('/')) {
    return false;
  }

  return IMAGE_FILE_PATTERN.test(value) && !value.includes('://');
};

const normalizeEncodedUrl = (value: string) => {
  // Undo accidental double-encoding of already percent-encoded bytes.
  const deDoubleEncoded = value.replace(/%25([0-9a-fA-F]{2})/g, '%$1');
  try {
    // decode -> encode keeps one valid encoding layer and handles unicode safely.
    return encodeURI(decodeURI(deDoubleEncoded));
  } catch {
    return encodeURI(deDoubleEncoded);
  }
};

export const normalizeImageUrl = (value: unknown): string => {
  if (typeof value !== 'string') return '';

  let url = value.trim().replace(/^['"]|['"]$/g, '');
  if (!url) return '';

  const lowered = url.toLowerCase();
  if (INVALID_IMAGE_TOKENS.has(lowered)) return '';

  if (/^data:image\//i.test(url) || /^blob:/i.test(url)) {
    return url;
  }

  url = url.replace(/\\/g, '/');

  if (url.startsWith('//')) {
    url = `https:${url}`;
  }

  if (/^http:\/\//i.test(url)) {
    url = url.replace(/^http:\/\//i, 'https://');
  }

  if (BROKEN_WC_PLACEHOLDER_PATTERN.test(url)) {
    url = url.replace(BROKEN_WC_PLACEHOLDER_PATTERN, `${FIXED_WC_PLACEHOLDER}$1`);
  }

  if (looksLikeDomainOnly(url)) {
    url = `https://${url}`;
  }

  if (looksLikeRelativeImagePath(url)) {
    url = `${getConfiguredMediaOrigin()}/${url.replace(/^\/+/, '')}`;
  }

  if (/^https?:\/\//i.test(url)) {
    return normalizeEncodedUrl(url);
  }

  if (url.startsWith('/')) {
    if (looksLikeRelativeImagePath(url)) {
      return normalizeEncodedUrl(`${getConfiguredMediaOrigin()}${url}`);
    }
    return normalizeEncodedUrl(url);
  }

  return '';
};

const shouldProxyDisplayImage = (value: string) => {
  if (!value || value.startsWith(PROXY_IMAGE_ROUTE)) return false;
  if (!/^https?:\/\//i.test(value)) return false;

  try {
    const parsed = new URL(value);
    return ORB_PRONE_IMAGE_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
};

const extractProxyTargetUrl = (value: string) => {
  if (!value || !value.startsWith(PROXY_IMAGE_ROUTE)) return '';

  try {
    const parsed = new URL(value, 'https://shopwice.com');
    return normalizeImageUrl(parsed.searchParams.get('url') || '');
  } catch {
    return '';
  }
};

type ProxyImageOptions = {
  width?: number;
  quality?: number;
  format?: 'auto' | 'avif' | 'webp' | 'png' | 'jpeg';
};

const buildProxyImageUrl = (value: string, options?: ProxyImageOptions) => {
  const params = new URLSearchParams();
  params.set('url', value);

  const width = Number(options?.width);
  if (Number.isFinite(width) && width > 0) {
    params.set('w', String(Math.round(width)));
  }

  const quality = Number(options?.quality);
  if (Number.isFinite(quality) && quality > 0) {
    params.set('q', String(Math.round(quality)));
  }

  if (options?.format) {
    params.set('f', options.format);
  }

  return `${PROXY_IMAGE_ROUTE}?${params.toString()}`;
};

export const toDisplayImageUrl = (value: unknown): string => {
  const normalized = normalizeImageUrl(value);
  if (!normalized) return '';
  if (!shouldProxyDisplayImage(normalized)) return normalized;
  return buildProxyImageUrl(normalized, {
    quality: resolveDefaultProxyQuality(),
    format: 'auto',
  });
};

export const toOptimizedImageUrl = (
  value: unknown,
  options?: ProxyImageOptions,
): string => {
  const raw = typeof value === 'string' ? value : '';
  const normalized = extractProxyTargetUrl(raw) || normalizeImageUrl(value);
  if (!normalized) return '';

  if (!shouldProxyDisplayImage(normalized)) {
    return raw.startsWith(PROXY_IMAGE_ROUTE) ? normalized : normalized;
  }

  return buildProxyImageUrl(normalized, {
    width: options?.width,
    quality: options?.quality ?? resolveDefaultProxyQuality(options?.width),
    format: options?.format || 'auto',
  });
};

export const toSizedImageUrl = (
  value: unknown,
  width: number,
  options?: Omit<ProxyImageOptions, 'width'>,
): string =>
  toOptimizedImageUrl(value, {
    width,
    quality: options?.quality,
    format: options?.format,
  });

export const firstValidImageUrl = (...values: unknown[]): string => {
  for (const value of values) {
    const normalized = normalizeImageUrl(value);
    if (normalized) return normalized;
  }
  return '';
};

export const firstDisplayImageUrl = (...values: unknown[]): string => {
  for (const value of values) {
    const normalized = toDisplayImageUrl(value);
    if (normalized) return normalized;
  }
  return '';
};
