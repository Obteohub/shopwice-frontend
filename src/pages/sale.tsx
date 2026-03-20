import type { GetServerSideProps, InferGetServerSidePropsType, NextPage } from 'next';
import Layout from '@/components/Layout/Layout.component';
import ProductList from '@/components/Product/ProductList.component';
import { api } from '@/utils/api';
import { applyCachePolicy } from '@/utils/cacheControl';
import { ENDPOINTS } from '@/utils/endpoints';
import type { Product } from '@/types/product';
import { getRequestPathname, loggedRedirect } from '@/utils/routeEventLogger';

const PER_PAGE = 24;

const parsePageParam = (raw: unknown): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 1;
  const page = Math.floor(parsed);
  return page > 0 ? page : 1;
};

const normalizeList = (payload: any): Product[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.products)) return payload.products;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.results)) return payload.results;
    if (Array.isArray(payload.items)) return payload.items;
  }
  return [];
};

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

type SalePageProps = {
  products: Product[];
  totalCount: number | null;
  page: number;
  pageInfo: {
    hasNextPage: boolean;
    endCursor: null;
  };
};

const SalePage: NextPage<SalePageProps> = ({
  products,
  totalCount,
  page,
  pageInfo,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  return (
    <Layout title="Sale — Products on Sale">
      <div className="w-full px-4 sm:px-6 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Products on Sale</h1>
          <p className="text-sm text-gray-500 mt-1">
            {typeof totalCount === 'number'
              ? `${totalCount.toLocaleString()} products on sale`
              : 'Special prices on selected products'}
          </p>
        </div>

        <ProductList
          products={products}
          pageInfo={pageInfo}
          totalCount={typeof totalCount === 'number' ? totalCount : undefined}
          initialPage={page}
          paginationEndpoint={ENDPOINTS.PRODUCTS}
          paginationPageParamKey="page"
          paginationPerPageParamKey="per_page"
          queryParams={{
            on_sale: true,
            include_totals: true,
          }}
        />
      </div>
    </Layout>
  );
};

export default SalePage;

export const getServerSideProps: GetServerSideProps<SalePageProps> = async ({
  res,
  query,
  req,
}) => {
  applyCachePolicy(res, 'mostSoldPage');

  const page = parsePageParam(query.page);
  const requestPath = getRequestPathname(req, `/sale${page > 1 ? `?page=${page}` : ''}`);

  try {
    const payload = await api.get<any>(ENDPOINTS.PRODUCTS, {
      params: {
        per_page: PER_PAGE,
        page,
        on_sale: true,
        include_totals: true,
      },
    });

    const products = normalizeList(payload);
    const totalCount =
      toFiniteNumber(payload?.totalCount) ??
      toFiniteNumber(payload?.total) ??
      toFiniteNumber(payload?.pagination?.total) ??
      toFiniteNumber(payload?.meta?.total) ??
      null;
    const totalPages =
      toFiniteNumber(payload?.totalPages) ??
      toFiniteNumber(payload?.pagination?.totalPages) ??
      (typeof totalCount === 'number' ? Math.max(1, Math.ceil(totalCount / PER_PAGE)) : null);

    if (typeof totalPages === 'number' && page > totalPages) {
      return loggedRedirect({
        req,
        pathname: requestPath,
        destination: totalPages <= 1 ? '/sale' : `/sale?page=${totalPages}`,
        permanent: false,
        matchedRoute: '/sale',
        reason: 'Requested page exceeded available sale pages',
      });
    }

    const hasNextPage = Boolean(
      payload?.hasNextPage ??
        payload?.pagination?.hasNextPage ??
        (typeof totalCount === 'number'
          ? page * PER_PAGE < totalCount
          : products.length >= PER_PAGE),
    );

    return {
      props: {
        products,
        totalCount,
        page,
        pageInfo: {
          hasNextPage,
          endCursor: null,
        },
      },
    };
  } catch {
    return {
      props: {
        products: [],
        totalCount: null,
        page: 1,
        pageInfo: {
          hasNextPage: false,
          endCursor: null,
        },
      },
    };
  }
};
