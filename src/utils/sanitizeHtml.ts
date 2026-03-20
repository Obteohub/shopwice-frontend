import { HTMLElement, parse } from 'node-html-parser';

const ALLOWED_TAGS = new Set([
  'a',
  'abbr',
  'b',
  'blockquote',
  'br',
  'code',
  'del',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);

const BLOCKED_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'base',
  'form',
  'input',
  'textarea',
  'select',
  'option',
  'button',
]);

const GLOBAL_ALLOWED_ATTRS = new Set([
  'class',
  'id',
  'title',
  'role',
  'aria-label',
  'aria-hidden',
]);

const TAG_ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding', 'srcset', 'sizes']),
  th: new Set(['colspan', 'rowspan', 'scope']),
  td: new Set(['colspan', 'rowspan']),
};

const URL_ATTRS = new Set(['href', 'src']);

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const isSafeUrl = (value: string): boolean => {
  const normalized = value.trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  if (!normalized) return false;

  if (
    normalized.startsWith('/') ||
    normalized.startsWith('#') ||
    normalized.startsWith('./') ||
    normalized.startsWith('../')
  ) {
    return true;
  }

  return /^(https?:|mailto:|tel:)/i.test(normalized);
};

const sanitizeSrcset = (value: string): string | null => {
  const candidates = value
    .split(',')
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const safeCandidates = candidates.filter((candidate) => {
    const [url] = candidate.split(/\s+/, 1);
    return Boolean(url && isSafeUrl(url));
  });

  return safeCandidates.length > 0 ? safeCandidates.join(', ') : null;
};

const normalizeMediaUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  try {
    const parsed = new URL(trimmed, 'https://shopwice.com');
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname;

    if (
      (host === 'shopwice.com' || host === 'www.shopwice.com') &&
      path.startsWith('/wp-content/uploads/')
    ) {
      parsed.hostname = 'cdn.shopwice.com';
      parsed.pathname = path.replace(/^\/wp-content\/uploads/, '');
      return parsed.toString();
    }

    return parsed.toString();
  } catch {
    return trimmed;
  }
};

const normalizeMediaSrcset = (value: string): string =>
  value
    .split(',')
    .map((candidate) => {
      const trimmed = candidate.trim();
      if (!trimmed) return '';

      const [url, descriptor] = trimmed.split(/\s+/, 2);
      const normalizedUrl = normalizeMediaUrl(url);
      return descriptor ? `${normalizedUrl} ${descriptor}` : normalizedUrl;
    })
    .filter(Boolean)
    .join(', ');

const sanitizeElement = (element: HTMLElement): void => {
  const tag = element.tagName.toLowerCase();

  if (BLOCKED_TAGS.has(tag) || !ALLOWED_TAGS.has(tag)) {
    element.remove();
    return;
  }

  const allowedTagAttrs = TAG_ALLOWED_ATTRS[tag] ?? new Set<string>();

  for (const [name, value] of Object.entries(element.attributes)) {
    const attr = name.toLowerCase();
    const attrValue = typeof value === 'string' ? value : '';

    if (attr.startsWith('on')) {
      element.removeAttribute(name);
      continue;
    }

    const isAllowed =
      GLOBAL_ALLOWED_ATTRS.has(attr) ||
      allowedTagAttrs.has(attr) ||
      attr.startsWith('data-') ||
      attr.startsWith('aria-');

    if (!isAllowed) {
      element.removeAttribute(name);
      continue;
    }

    if (URL_ATTRS.has(attr) && !isSafeUrl(attrValue)) {
      element.removeAttribute(name);
      continue;
    }

    if (tag === 'img' && attr === 'src') {
      element.setAttribute(name, normalizeMediaUrl(attrValue));
      if (!element.getAttribute('loading')) {
        element.setAttribute('loading', 'lazy');
      }
      if (!element.getAttribute('decoding')) {
        element.setAttribute('decoding', 'async');
      }
      continue;
    }

    if (attr === 'srcset') {
      const safeSrcset = sanitizeSrcset(normalizeMediaSrcset(attrValue));
      if (!safeSrcset) {
        element.removeAttribute(name);
      } else {
        element.setAttribute(name, safeSrcset);
      }
      continue;
    }

    if (attr === 'target' && attrValue === '_blank') {
      const currentRel = element.getAttribute('rel') || '';
      const relSet = new Set(
        currentRel
          .split(/\s+/)
          .map((part) => part.trim())
          .filter(Boolean),
      );
      relSet.add('noopener');
      relSet.add('noreferrer');
      element.setAttribute('rel', Array.from(relSet).join(' '));
    }
  }
};

export const sanitizeHtml = (input: unknown): string => {
  const html = typeof input === 'string' ? input : '';
  if (!html) return '';

  try {
    const root = parse(html, { comment: false });
    const elements = root.querySelectorAll('*');
    for (const element of elements) {
      sanitizeElement(element);
    }
    return root.toString();
  } catch {
    return escapeHtml(html);
  }
};
