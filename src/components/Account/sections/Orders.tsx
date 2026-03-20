import { useState, useMemo, type MouseEvent } from 'react';
import { useRouter } from 'next/router';
import { useOrders, Order } from '../hooks/useOrders';
import OrdersSkeleton from '../skeletons/OrdersSkeleton';
import Image from 'next/image';
import Link from 'next/link';
import Button from '../../UI/Button.component';
import LoadingSpinner from '../../LoadingSpinner/LoadingSpinner.component';
import { toDisplayImageUrl, toSizedImageUrl } from '@/utils/image';

const StatusBadge = ({ status }: { status: string }) => {
    const statusMap: Record<string, { label: string; color: string }> = {
        pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
        processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700' },
        completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
        cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
        failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
        on_hold: { label: 'On Hold', color: 'bg-orange-100 text-orange-700' },
    };

    const safeStatus = String(status || '').toLowerCase();
    const { label, color } = statusMap[safeStatus] || { label: status, color: 'bg-gray-100 text-gray-700' };

    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${color}`}>
            {label}
        </span>
    );
};

const OrderCard = ({ order }: { order: Order }) => {
    const [isReordering, setIsReordering] = useState(false);
    const orderItems = Array.isArray(order?.line_items) ? order.line_items : [];
    const safeStatus = String(order?.status || 'unknown');
    const safeDate = order?.date_created ? new Date(order.date_created) : null;
    const router = useRouter();

    const openOrderDetails = () => {
        router.push(`/my-account/orders/${order.id}`);
    };

    const handleCardClick = (e: MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        const isInteractive = !!target.closest('a,button,input,textarea,select');
        if (isInteractive) return;
        openOrderDetails();
    };

    const handleReorder = async () => {
        setIsReordering(true);
        try {
            alert(`Reordering items from #${order.order_number}...`);
            window.location.href = '/checkout';
        } finally {
            setIsReordering(false);
        }
    };

    return (
        <div
            className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-white cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label={`Open order #${order.order_number} details`}
            onClick={handleCardClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openOrderDetails();
                }
            }}
        >
            <div className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">Order #{order.order_number}</span>
                            <StatusBadge status={safeStatus} />
                        </div>
                        <p className="text-xs text-gray-500">
                            Placed on {safeDate && !Number.isNaN(safeDate.getTime())
                                ? safeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : 'Unknown date'}
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="block text-sm font-bold text-gray-900">{order.total}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex -space-x-4 overflow-hidden">
                        {orderItems.slice(0, 3).map((item, idx) => {
                            const imageSrc = toDisplayImageUrl(item.image?.src);
                            return (
                                <div
                                    key={item.id}
                                    className="inline-block relative h-12 w-12 rounded-lg border-2 border-white bg-gray-50 overflow-hidden shadow-sm"
                                    style={{ zIndex: 10 - idx }}
                                >
                                    {imageSrc ? (
                                        <Image
                                            src={toSizedImageUrl(imageSrc, 96)}
                                            alt={item.name}
                                            fill
                                            sizes="48px"
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                                            N/A
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {orderItems.length > 3 && (
                            <div className="inline-block relative h-12 w-12 rounded-lg border-2 border-white bg-gray-100 flex items-center justify-center z-0 text-[10px] font-bold text-gray-600 shadow-sm">
                                +{orderItems.length - 3}
                            </div>
                        )}
                    </div>

                    <div className="flex-grow"></div>

                    {safeStatus.toLowerCase() === 'completed' && (
                        <Button
                            variant="primary"
                            className="px-4 py-2 text-xs"
                            handleButtonClick={handleReorder}
                            buttonDisabled={isReordering}
                        >
                            {isReordering ? <LoadingSpinner size="sm" color="white" /> : 'Buy It Again'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

const Orders = () => {
    const { orders, isLoading, isError } = useOrders();
    const [filter, setFilter] = useState('all');

    const filteredOrders = useMemo(() => {
        if (filter === 'all') return orders;
        return orders.filter(o => {
            const status = String(o?.status || '').toLowerCase();
            if (filter === 'active') return ['pending', 'processing', 'on-hold'].includes(status.replace(' ', '-'));
            return status === filter;
        });
    }, [orders, filter]);

    if (isLoading) return <OrdersSkeleton />;

    if (isError) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500 mb-4">Failed to load orders. Please try again later.</p>
                <Button handleButtonClick={() => window.location.reload()}>Retry</Button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <h2 className="text-2xl font-bold text-gray-900">My Orders</h2>

                <div className="flex p-1 bg-gray-100 rounded-lg w-fit">
                    {['all', 'active', 'completed', 'cancelled'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${filter === tab
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
                        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Nothing to show</h3>
                    <p className="text-gray-500 mt-2 mb-8 max-w-sm text-sm">
                        We couldn&apos;t find any {filter !== 'all' ? filter : ''} orders.
                    </p>
                    <Link href="/" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                        Start Shopping
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredOrders.map((order) => (
                        <OrderCard key={order.id} order={order} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Orders;
