import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import type { NextPage } from 'next';
import Layout from '@/components/Layout/Layout.component';
import withAuth from '@/components/User/withAuth.component';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner.component';
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';
import { toDisplayImageUrl, toSizedImageUrl } from '@/utils/image';

type OrderItem = {
  id: number | string;
  name: string;
  quantity: number;
  price: string;
  image?: { src: string };
};

type OrderDetails = {
  id: number | string;
  order_number: string;
  status: string;
  date_created: string;
  total: string;
  line_items: OrderItem[];
  tracking_link?: string | null;
  [key: string]: any;
};

const statusClassMap: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
  on_hold: 'bg-orange-100 text-orange-700',
};

const toPriceString = (raw: any): string => {
  if (raw === null || raw === undefined) return '0.00';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number') return raw.toFixed(2);
  return String(raw);
};

const normalizeItem = (item: any, index: number): OrderItem => {
  const imageSrcRaw =
    item?.image?.src ||
    item?.image?.sourceUrl ||
    item?.image ||
    item?.images?.[0]?.src ||
    item?.images?.[0]?.sourceUrl ||
    item?.thumbnail ||
    undefined;
  const imageSrc = toDisplayImageUrl(imageSrcRaw);

  return {
    id: item?.id ?? item?.product_id ?? item?.productId ?? `item-${index}`,
    name: item?.name || item?.product_name || item?.productTitle || `Item ${index + 1}`,
    quantity: Number(item?.quantity ?? item?.qty ?? 1) || 1,
    price: toPriceString(item?.price ?? item?.total ?? item?.line_total ?? item?.subtotal ?? '0.00'),
    image: imageSrc ? { src: imageSrc } : undefined,
  };
};

const normalizeOrder = (raw: any): OrderDetails => {
  const rawItems = Array.isArray(raw?.line_items)
    ? raw.line_items
    : Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw?.products)
        ? raw.products
        : [];

  return {
    ...raw,
    id: raw?.id ?? raw?.order_id ?? raw?.order_number ?? '',
    order_number: String(raw?.order_number ?? raw?.number ?? raw?.id ?? ''),
    status: String(raw?.status ?? 'unknown'),
    date_created: String(raw?.date_created ?? raw?.created_at ?? ''),
    total: toPriceString(raw?.total ?? raw?.totals?.total_price ?? raw?.amount_total ?? '0.00'),
    line_items: rawItems.map(normalizeItem),
    tracking_link: raw?.tracking_link ?? raw?.tracking?.url ?? null,
  };
};

const OrderDetailsPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let mounted = true;

    const loadOrder = async () => {
      setLoading(true);
      setError(null);

      try {
        const direct: any = await api.get(`${ENDPOINTS.AUTH.ORDERS}/${id}`);
        const normalized: OrderDetails = normalizeOrder(Array.isArray(direct) ? direct[0] : direct);

        if (mounted && normalized && normalized.id) {
          setOrder(normalized);
          setLoading(false);
          return;
        }
      } catch {
        // Fallback to list endpoint below.
      }

      try {
        const orders: any = await api.get(ENDPOINTS.AUTH.ORDERS);
        const list = Array.isArray(orders) ? orders : [];
        const found = list.find((o: any) => String(o?.id) === String(id) || String(o?.order_number) === String(id));

        if (!found) {
          throw new Error('Order not found.');
        }

        if (mounted) {
          setOrder(normalizeOrder(found));
          setLoading(false);
        }
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || 'Failed to load order.');
          setLoading(false);
        }
      }
    };

    loadOrder();

    return () => {
      mounted = false;
    };
  }, [id]);

  const safeStatus = String(order?.status || 'unknown').toLowerCase();
  const statusClass = statusClassMap[safeStatus] || 'bg-gray-100 text-gray-700';

  const createdDate = useMemo(() => {
    if (!order?.date_created) return 'Unknown date';
    const d = new Date(order.date_created);
    if (Number.isNaN(d.getTime())) return 'Unknown date';
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, [order?.date_created]);

  return (
    <Layout title="Order Details" fullWidth={true}>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Link href="/my-account?tab=orders" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              Back to Orders
            </Link>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner />
            </div>
          )}

          {!loading && error && (
            <div className="bg-white border border-red-100 rounded-xl p-6">
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          )}

          {!loading && !error && order && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-100 rounded-xl p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Order #{order.order_number || order.id}</h1>
                    <p className="text-sm text-gray-500 mt-1">Placed on {createdDate}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusClass}`}>
                      {order.status || 'Unknown'}
                    </span>
                    <span className="text-xl font-bold text-gray-900">{order.total}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-6 md:p-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="rounded-lg border border-gray-100 p-4">
                    <p className="text-gray-500 mb-1">Order ID</p>
                    <p className="font-semibold text-gray-900">{order.id}</p>
                  </div>
                  <div className="rounded-lg border border-gray-100 p-4">
                    <p className="text-gray-500 mb-1">Items</p>
                    <p className="font-semibold text-gray-900">{order.line_items.length}</p>
                  </div>
                  <div className="rounded-lg border border-gray-100 p-4">
                    <p className="text-gray-500 mb-1">Total</p>
                    <p className="font-semibold text-gray-900">{order.total}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-6 md:p-8">
                <h2 className="text-lg font-bold text-gray-900 mb-5">Items</h2>

                <div className="space-y-4">
                  {order.line_items.length === 0 && (
                    <p className="text-sm text-gray-500">No items available for this order.</p>
                  )}

                  {order.line_items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4 last:border-b-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                          {item.image?.src ? (
                            <Image src={toSizedImageUrl(item.image.src, 112)} alt={item.name} fill sizes="56px" className="object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-[10px] text-gray-400">N/A</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{item.name}</p>
                          <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{item.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {order.tracking_link && (
                <div className="bg-white border border-gray-100 rounded-xl p-6 md:p-8">
                  <h2 className="text-lg font-bold text-gray-900 mb-3">Tracking</h2>
                  <a
                    href={order.tracking_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700"
                  >
                    Open tracking link
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default withAuth(OrderDetailsPage);
