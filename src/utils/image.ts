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

  if (
    value.startsWith('/wp-content/') ||
    value.startsWith('/uploads/') ||
    value.startsWith('/content/uploads/') ||
    value.startsWith('/media/') ||
    value.startsWith('/storage/') ||
    value.startsWith('wp-content/') ||
    value.startsWith('uploads/') ||
    value.startsWith('content/uploads/') ||
    value.startsWith('media/') ||
    value.startsWith('storage/')
  ) {
    return true;
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

export const firstValidImageUrl = (...values: unknown[]): string => {
  for (const value of values) {
    const normalized = normalizeImageUrl(value);
    if (normalized) return normalized;
  }
  return '';
};
