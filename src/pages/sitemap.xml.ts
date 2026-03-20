import type { GetServerSideProps } from 'next';
import { getAbsoluteUrlFromRequest } from '@/utils/seoPage';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');
const xmlEscape = (value: string) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const SitemapXml = () => null;

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const wpBaseUrl = trimTrailingSlash(process.env.NEXT_PUBLIC_WP_API_URL || '');
  const shouldForceNoindex =
    String(process.env.NEXT_PUBLIC_SITE_NOINDEX || '').toLowerCase() === 'true';
  const localMobileVariationSitemap = getAbsoluteUrlFromRequest(req, '/sitemaps/mobile-phones-variants.xml');

  const entries: string[] = shouldForceNoindex ? [] : [localMobileVariationSitemap];
  if (!shouldForceNoindex && wpBaseUrl) {
    entries.push(`${wpBaseUrl}/sitemap_index.xml`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries.map((loc) => `  <sitemap><loc>${xmlEscape(loc)}</loc></sitemap>`).join('\n') +
    `\n</sitemapindex>`;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');
  res.end(xml);
  return { props: {} };
};

export default SitemapXml;
