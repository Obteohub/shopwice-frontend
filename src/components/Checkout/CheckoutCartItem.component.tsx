import React from 'react';
import Image from 'next/image';
import { RestCartItem } from '@/utils/cartTransformers';
import { formatPriceWithDecimals } from '@/utils/functions/functions';
import { toDisplayImageUrl } from '@/utils/image';

interface CheckoutCartItemProps {
    item: RestCartItem;
}

const CheckoutCartItem: React.FC<CheckoutCartItemProps> = ({ item }) => {
    const { quantity } = item;
    const displayPrice = item.totals?.line_subtotal || item.totals?.line_total || 'GHS 0.00';
    const displayName = item.name;
    const displayImage = toDisplayImageUrl(item.images?.[0]?.src);
    const variationLabel = item.variation
        ? item.variation.map((attr) => attr.value).join(', ')
        : '';

    return (
        <div className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-0">
            <div className="relative w-16 h-16 flex-shrink-0 bg-gray-50 rounded overflow-hidden border border-gray-100">
                {displayImage ? (
                    <Image
                        src={displayImage}
                        alt={displayName}
                        fill
                        sizes="64px"
                        className="object-cover"
                    />
                ) : null}
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-gray-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {quantity}
                </div>
            </div>
            <div className="flex-grow">
                <p className="text-sm font-medium text-gray-900 line-clamp-2">{displayName}</p>
                {variationLabel && (
                    <p className="text-xs text-gray-500">
                        {variationLabel}
                    </p>
                )}
            </div>
            <div className="text-sm font-medium text-gray-900">
                {formatPriceWithDecimals(displayPrice)}
            </div>
        </div>
    );
};

export default CheckoutCartItem;
