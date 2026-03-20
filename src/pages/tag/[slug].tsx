import type { GetServerSideProps } from 'next';
import { getRequestPathname, loggedNotFound, loggedRedirect } from '@/utils/routeEventLogger';

const LegacyTagPage = () => null;

export default LegacyTagPage;

export const getServerSideProps: GetServerSideProps = async ({ params, query, req }) => {
  const slug = String(params?.slug || '').trim();
  const requestPath = getRequestPathname(req, `/tag/${slug || ''}`);
  if (!slug) {
    return loggedNotFound({
      req,
      pathname: requestPath,
      matchedRoute: '/tag/[slug]',
      reason: 'Missing legacy tag slug',
    });
  }

  const search = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry !== undefined) search.append(key, String(entry));
      });
      return;
    }
    if (value !== undefined) search.set(key, String(value));
  });

  const destination = `/collection/${slug}${search.toString() ? `?${search.toString()}` : ''}`;

  return loggedRedirect({
    req,
    pathname: requestPath,
    destination,
    permanent: true,
    matchedRoute: '/tag/[slug]',
    reason: 'Legacy tag route redirected to collection route',
  });
};
