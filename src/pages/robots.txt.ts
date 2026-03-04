import type { GetServerSideProps } from 'next';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const RobotsTxt = () => null;

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const siteUrl = trimTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com');

  const robotsBody = [
    'User-agent: *',
    'Allow: /',
    '# If WordPress backend paths share this same domain, disallow only those backend paths there.',
    `Sitemap: ${siteUrl}/sitemap.xml`,
  ].join('\n');

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');
  res.end(robotsBody);

  return { props: {} };
};

export default RobotsTxt;

