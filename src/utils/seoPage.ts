import type { IncomingMessage } from 'http';
import {
  buildFallbackDescription,
  buildFrontendUrl,
  getRankMathSEO,
  getSiteName,
  resolveSeoOgImage,
} from '@/utils/seo';
import { parseSeoHead } from '@/utils/parseSeoHead';

export type SeoDataShape = {
  title?: string | null;
  metaDescription?: string | null;
  canonical?: string | null;
  fallbackCanonical?: string | null;
  robots?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  ogUrl?: string | null;
  ogType?: string | null;
  twitterCard?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  twitterImage?: string | null;
  prev?: string | null;
  next?: string | null;
  jsonLd?: Record<string, any>[];
  isPaginated?: boolean;
};

const toStringValue = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const toPositiveInteger = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return fallback;
};

const buildArchiveFallbackDescription = ({
  title,
  description,
  siteName,
}: {
  title: string;
  description?: string | null;
  siteName: string;
}) => {
  const fromDescription = buildFallbackDescription(description || '', 155);
  if (fromDescription) return fromDescription;

  const normalizedTitle = toStringValue(title) || 'products';
  return buildFallbackDescription(
    `Explore ${normalizedTitle} on ${siteName}. Shop available products, compare prices, and buy online.`,
    155,
  );
};

const shouldNoindexThinArchives = () =>
  String(process.env.SEO_NOINDEX_THIN_ARCHIVES ?? 'true').toLowerCase() !== 'false';

const thinArchiveThreshold = () => toPositiveInteger(process.env.SEO_THIN_ARCHIVE_THRESHOLD, 3);

const buildPaginationUrl = (currentUrl: string, page: number) => {
  try {
    const parsed = new URL(currentUrl);
    if (page <= 1) {
      parsed.searchParams.delete('page');
    } else {
      parsed.searchParams.set('page', String(page));
    }
    return parsed.toString();
  } catch {
    return currentUrl;
  }
};

const compactSeoOverrides = (value: Partial<SeoDataShape> | null | undefined) => {
  if (!value || typeof value !== 'object') return {};

  const output: Partial<SeoDataShape> = {};

  Object.entries(value).forEach(([key, entry]) => {
    if (entry === null || entry === undefined) return;
    if (typeof entry === 'string' && !entry.trim()) return;
    (output as Record<string, unknown>)[key] = entry;
  });

  return output;
};

const normalizeMetaValue = (value: unknown) => toStringValue(value).toLowerCase();

const isNotFoundLikeTitle = (value: unknown) => {
  const normalized = normalizeMetaValue(value);
  return (
    normalized.includes('page not found') ||
    normalized === '404' ||
    normalized.startsWith('404 ')
  );
};

const hasNoindexNofollow = (value: unknown) => {
  const normalized = normalizeMetaValue(value);
  return normalized.includes('noindex') && normalized.includes('nofollow');
};

const shouldDiscardArchiveSeoOverrides = (
  parsed: Partial<SeoDataShape> | null | undefined,
) => {
  if (!parsed || typeof parsed !== 'object') return false;

  return (
    isNotFoundLikeTitle(parsed.title) ||
    isNotFoundLikeTitle(parsed.ogTitle) ||
    isNotFoundLikeTitle(parsed.twitterTitle)
  );
};

export const getAbsoluteUrlFromRequest = (req: IncomingMessage, pathname: string) => {
  const host = String(req?.headers?.host || '').trim();
  const safePathname = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const hostWithoutPort = host.split(':')[0].trim().toLowerCase();
  const isLocalHost =
    hostWithoutPort === 'localhost' ||
    hostWithoutPort === '127.0.0.1' ||
    hostWithoutPort === '0.0.0.0';

  const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim();
  const protocol =
    forwardedProto ||
    (isLocalHost ? 'http' : 'https');

  if (process.env.NODE_ENV !== 'production' && host && isLocalHost) {
    return `${protocol}://${host}${safePathname}`;
  }

  const fromEnv = buildFrontendUrl(pathname);
  if (fromEnv) return fromEnv;

  if (!host) return '';

  return `${protocol}://${host}${safePathname}`;
};

type BuildArchiveSeoInput = {
  pageUrl: string;
  title: string;
  description?: string | null;
  currentPage?: number;
  hasNextPage?: boolean;
  productCount?: number;
  skipRankMath?: boolean;
  allowThinArchiveNoindex?: boolean;
  rankMathUrlOverride?: string;
};

export const buildArchiveSeoData = async ({
  pageUrl,
  title,
  description,
  currentPage = 1,
  hasNextPage = false,
  productCount = 0,
  skipRankMath = false,
  allowThinArchiveNoindex = true,
  rankMathUrlOverride,
}: BuildArchiveSeoInput): Promise<SeoDataShape> => {
  const siteName = getSiteName();
  const fallbackDescription = buildArchiveFallbackDescription({
    title,
    description,
    siteName,
  });

  const fallbackSeo: SeoDataShape = {
    title: `${title} | ${siteName}`,
    metaDescription: fallbackDescription,
    canonical: pageUrl,
    fallbackCanonical: pageUrl,
    robots: 'index, follow',
    ogTitle: `${title} | ${siteName}`,
    ogDescription: fallbackDescription,
    ogUrl: pageUrl,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: `${title} | ${siteName}`,
    twitterDescription: fallbackDescription,
    isPaginated: currentPage > 1,
    jsonLd: [],
  };

  const rankMathTargetUrl = toStringValue(rankMathUrlOverride) || pageUrl;
  const rankMathHead = skipRankMath ? null : await getRankMathSEO(rankMathTargetUrl);
  const parsed = skipRankMath ? null : await parseSeoHead(rankMathHead);
  const safeParsed = shouldDiscardArchiveSeoOverrides(parsed) ? null : parsed;

  if (!skipRankMath && !rankMathHead) {
    console.warn(`[SEO] RankMath SEO unavailable for archive URL ${rankMathTargetUrl}; using fallback metadata.`);
  }
  if (!skipRankMath && parsed && !safeParsed) {
    console.warn(`[SEO] RankMath returned invalid archive metadata for ${rankMathTargetUrl}; using fallback metadata.`);
  }

  const seoData: SeoDataShape = {
    ...fallbackSeo,
    ...compactSeoOverrides(safeParsed),
    canonical: safeParsed?.canonical || pageUrl,
    fallbackCanonical: pageUrl,
    isPaginated: currentPage > 1,
    jsonLd: Array.isArray(safeParsed?.jsonLd) ? safeParsed.jsonLd : [],
  };

  if (hasNoindexNofollow(safeParsed?.robots) && currentPage <= 1) {
    seoData.robots = fallbackSeo.robots;
  }

  if (!seoData.prev && currentPage > 1) {
    seoData.prev = buildPaginationUrl(pageUrl, currentPage - 1);
  }

  if (!seoData.next && hasNextPage) {
    seoData.next = buildPaginationUrl(pageUrl, currentPage + 1);
  }

  if (currentPage > 1) {
    seoData.robots = 'noindex, follow';
  }

  if (allowThinArchiveNoindex && shouldNoindexThinArchives() && productCount < thinArchiveThreshold()) {
    seoData.robots = 'noindex, follow';
  }

  seoData.ogImage = await resolveSeoOgImage(seoData.ogImage);
  seoData.twitterImage =
    toStringValue(seoData.twitterImage) ||
    toStringValue(seoData.ogImage) ||
    toStringValue(process.env.NEXT_PUBLIC_OG_DEFAULT_IMAGE) ||
    null;

  return seoData;
};

export const parsePageParam = (queryValue: unknown) => toPositiveInteger(queryValue, 1);

