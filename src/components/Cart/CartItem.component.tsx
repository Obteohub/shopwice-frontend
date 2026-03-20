
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { RestCartItem } from '@/utils/cartTransformers';
import { getSlugFromUrl } from '@/utils/functions/productUtils';
import { formatPriceWithDecimals } from '@/utils/functions/functions';
import QuantityControl from './QuantityControl.component';
import { toDisplayImageUrl } from '@/utils/image';

interface CartItemProps {
    item: RestCartItem;
    onUpdateQuantity: (newQty: number) => void;
    onRemove: () => void;
    loading: boolean;
}

const normalizeVariationParamKey = (rawKey?: string) => {
    const text = String(rawKey || '').trim().toLowerCase();
    if (!text) return '';

    if (text.startsWith('attribute_pa_')) {
        const suffix = text
            .slice('attribute_pa_'.length)
            .replace(/[+\s_]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
        return suffix ? `attribute_pa_${suffix}` : '';
    }

    if (text.startsWith('attribute_')) {
        const suffix = text
            .slice('attribute_'.length)
            .replace(/[+\s_]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
        return suffix ? `attribute_${suffix}` : '';
    }

    return text
        .replace(/[+\s]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
};

const normalizeVariationParamValue = (rawValue?: string) =>
    String(rawValue || '')
        .trim()
        .toLowerCase()
        .replace(/[+\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');

const buildVariationQuery = (variation?: Array<{ attribute: string; value: string }>) => {
    if (!Array.isArray(variation) || variation.length === 0) return '';
    const params = new URLSearchParams();
    variation.forEach((attr) => {
        const key = normalizeVariationParamKey(attr?.attribute);
        const value = normalizeVariationParamValue(attr?.value);
        if (!key || !value) return;
        params.set(key, value);
    });
    const query = params.toString();
    return query ? `?${query}` : '';
};

const toRelativeUrl = (value?: string) => {
    const text = String(value || '').trim();
    if (!text) return '';
    try {
        const parsed = new URL(text, 'http://local.shopwice');
        return `${parsed.pathname}${parsed.search}`;
    } catch {
        return '';
    }
};

const CartItem: React.FC<CartItemProps> = ({ item, onUpdateQuantity, onRemove, loading }) => {
    const { quantity } = item;
    const lineTotal = item.totals?.line_total || item.totals?.line_subtotal || '0';
    const currencyMinorUnit = item?.totals?.currency_minor_unit ?? item?.prices?.currency_minor_unit ?? 2;
    const imageUrl = toDisplayImageUrl(item.images?.[0]?.src);
    const explicitSlug = String(item.slug || '').trim();
    const permalinkSlug = getSlugFromUrl(item.permalink || '');
    // Prefer non-numeric slug: item.slug is sometimes just the numeric ID
    const isExplicitNumeric = /^\d+$/.test(explicitSlug);
    const resolvedSlug = (explicitSlug && !isExplicitNumeric) ? explicitSlug : permalinkSlug;
    const isNumericOnlySlug = /^\d+$/.test(resolvedSlug);
    const numericId = Number(item.id);
    const hasNumericId = Number.isFinite(numericId) && numericId > 0;
    const variationQuery = buildVariationQuery(item.variation);
    const relativePermalink = toRelativeUrl(item.permalink || '');
    const hasUsablePermalink = /^\/product\/[^/?#]+/i.test(relativePermalink)
        && !/^\/product\/\d+(?:[/?#]|$)/i.test(relativePermalink);
    const productHref = hasUsablePermalink
        ? relativePermalink
        : resolvedSlug && !isNumericOnlySlug
        ? `/product/${resolvedSlug}${variationQuery}`
        : hasNumericId
            ? `/product/${numericId}${variationQuery}`
            : '/products';
    const variationLabel = item.variation
        ? item.variation.map((attr) => `${attr.attribute}: ${attr.value}`).join(', ')
        : '';

    if (!item?.name) {
        return null;
    }

    return (
        <div className={`flex flex-row items-center p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-all gap-4 ${loading ? 'opacity-40 pointer-events-none grayscale-[0.5]' : ''}`}>
            {/* Image */}
            <div className="relative w-24 h-24 flex-shrink-0 bg-white border border-gray-200 rounded-md overflow-hidden">
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={item.name || 'Product Image'}
                        fill
                        className="object-contain p-2"
                        sizes="96px"
                    />
                ) : null}
            </div>

            {/* Info */}
            <div className="flex-grow flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <Link
                        href={productHref}
                        className="text-sm md:text-base font-medium text-gray-900 hover:text-blue-600 line-clamp-2 mb-1"
                    >
                        {item.name}
                    </Link>
                    {/* Optional: Show attributes here if variable product */}
                    {variationLabel && (
                        <div className="text-xs text-gray-500 space-y-1">
                            <span className="block">{variationLabel}</span>
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
                        <span className="block font-bold text-gray-900">{formatPriceWithDecimals(lineTotal, undefined, currencyMinorUnit)}</span>
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
