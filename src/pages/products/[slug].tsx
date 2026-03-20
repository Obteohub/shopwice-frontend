import type { GetServerSideProps, NextPage } from 'next';
import { applyCachePolicy } from '@/utils/cacheControl';
import { getRequestPathname, loggedNotFound, loggedRedirect } from '@/utils/routeEventLogger';

const LegacyProductsSlugRedirectPage: NextPage = () => null;

export const getServerSideProps: GetServerSideProps = async ({ params, query, res, req }) => {
  const slug = String(params?.slug ?? '').trim();
  const requestPath = getRequestPathname(req, `/products/${slug || ''}`);
  if (!slug) {
    return loggedNotFound({
      req,
      pathname: requestPath,
      matchedRoute: '/products/[slug]',
      reason: 'Missing legacy products slug',
    });
  }

  const nextParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (key === 'slug') return;
    if (Array.isArray(value)) {
      value
        .map((entry) => String(entry ?? '').trim())
        .filter(Boolean)
        .forEach((entry) => nextParams.append(key, entry));
      return;
    }
    const normalized = String(value ?? '').trim();
    if (normalized) nextParams.append(key, normalized);
  });
  const queryString = nextParams.toString();

  const destination = `/product/${encodeURIComponent(slug)}${queryString ? `?${queryString}` : ''}`;
  applyCachePolicy(res, 'noStore');

  return loggedRedirect({
    req,
    pathname: requestPath,
    destination,
    permanent: true,
    matchedRoute: '/products/[slug]',
    reason: 'Legacy products route redirected to product route',
  });
};

export default LegacyProductsSlugRedirectPage;
