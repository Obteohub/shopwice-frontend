import type { GetServerSideProps, NextPage } from 'next';

const LegacyProductsSlugRedirectPage: NextPage = () => null;

export const getServerSideProps: GetServerSideProps = async ({ params, query, res }) => {
  const slug = String(params?.slug ?? '').trim();
  if (!slug) {
    return { notFound: true };
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
  res.setHeader('Cache-Control', 'no-store');

  return {
    redirect: {
      destination,
      permanent: true,
    },
  };
};

export default LegacyProductsSlugRedirectPage;
