
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { IProductRootObject } from '@/utils/functions/functions';
import QuantityControl from './QuantityControl.component';

interface CartItemProps {
    item: IProductRootObject;
    onUpdateQuantity: (newQty: number) => void;
    onRemove: () => void;
    loading: boolean;
}

const CartItem: React.FC<CartItemProps> = ({ item, onUpdateQuantity, onRemove, loading }) => {
    const { product, quantity, subtotal } = item;
    const { node } = product;

    // Guard clause for missing product node
    if (!node) {
        return null;
    }

    return (
        <div className={`flex flex-row items-center p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-all gap-4 ${loading ? 'opacity-40 pointer-events-none grayscale-[0.5]' : ''}`}>
            {/* Image */}
            <div className="relative w-24 h-24 flex-shrink-0 bg-white border border-gray-200 rounded-md overflow-hidden">
                <Image
                    src={node.image?.sourceUrl || '/placeholder.png'}
                    alt={node.name || 'Product Image'}
                    fill
                    className="object-contain p-2"
                    sizes="96px"
                />
            </div>

            {/* Info */}
            <div className="flex-grow flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <Link
                        href={`/product/${node.slug}`}
                        className="text-sm md:text-base font-medium text-gray-900 hover:text-blue-600 line-clamp-2 mb-1"
                    >
                        {node.name}
                    </Link>
                    {/* Optional: Show attributes here if variable product */}
                    {item.variation && (
                        <div className="text-xs text-gray-500 space-y-1">
                            {item.variation.node.attributes?.nodes.map(attr => (
                                <span key={attr.name} className="block">{attr.name}: {attr.value}</span>
                            ))}
                        </div>
                    )}
                    <button
                        onClick={onRemove}
                        disabled={loading}
                        className="text-sm text-red-500 hover:text-red-700 underline mt-2 md:hidden"
                    >
                        Remove
                    </button>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center">
                        <QuantityControl
                            quantity={quantity}
                            onDecrease={() => onUpdateQuantity(quantity - 1)}
                            onIncrease={() => onUpdateQuantity(quantity + 1)}
                            loading={loading}
                        />
                    </div>

                    <div className="min-w-[80px] text-right">
                        <span className="block font-bold text-gray-900">{subtotal}</span>
                    </div>

                    <button
                        onClick={onRemove}
                        disabled={loading}
                        className="hidden md:block p-2 text-gray-400 hover:text-red-600 transition-colors"
                        aria-label="Remove item"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CartItem;
