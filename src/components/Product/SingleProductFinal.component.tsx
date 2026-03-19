// Imports - Layout Refined
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

// Utils
import { paddedPrice } from '@/utils/functions/functions';

// Components
import AddToCart from './AddToCart.component';
import Breadcrumbs from '@/components/UI/Breadcrumbs.component';
import StarRating from '@/components/UI/StarRating.component';
import ProductGallery from './ProductGalleryVertical.component';
import Accordion from '../UI/Accordion.component';
import { sanitizeHtml } from '@/utils/sanitizeHtml';
import DeliveryInfo from './DeliveryInfo.component';
import PaymentInfo from './PaymentInfo.component';
import ProductLocationDisplay from './ProductLocationDisplay.component';
import ProductActions from './ProductActions.component';
import ProductReviews from './ProductReviews.component';
import ProductRecommendationsDeferred from './ProductRecommendationsDeferred.component';
import RefurbishBoxContent from './RefurbishBoxContent.component';
import {
    buildVariationLabel,
    readAttributeQueryParams,
    resolveSelectedVariation,
} from '@/utils/mobileVariationSeo';

import { WHATSAPP_NUMBER } from '@/components/UI/WhatsAppButton.component';

// Dynamic Imports for Performance
const ComparePriceModal = dynamic(() => import('./ComparePriceModal.component'), { ssr: false });
const WhatIsRefurbishedModal = dynamic(() => import('./WhatIsRefurbishedModal.component'), { ssr: false });
const NotifyRestockModal = dynamic(() => import('./NotifyRestockModal.component'), { ssr: false });

import QuantityControl from '@/components/Cart/QuantityControl.component';

const SingleProductFinal = ({
    product,
    isRefurbished = false,
    initialSelectedVariationId,
    variationUrlMap,
    isMobilePhoneProduct = false,
    siteName = 'Shopwice',
}: {
    product: any;
    loading?: boolean;
    isRefurbished?: boolean;
    initialSelectedVariationId?: number | string | null;
    variationUrlMap?: Record<string, string>;
    isMobilePhoneProduct?: boolean;
    siteName?: string;
}) => {

    const router = useRouter();
    const [userSelectedVariation, setUserSelectedVariation] = useState<number | string | undefined>(undefined);
    const [quantity, setQuantity] = useState<number>(1);
    const [isShortDescriptionExpanded, setIsShortDescriptionExpanded] = useState(false);
    const [showCompareModal, setShowCompareModal] = useState(false);
    const [showWhatIsRefurbishedModal, setShowWhatIsRefurbishedModal] = useState(false);
    const [desktopActiveTab, setDesktopActiveTab] = useState<'description' | 'specs' | 'additional' | 'reviews' | 'shipping'>('description');
    const [showNotifyModal, setShowNotifyModal] = useState(false);
    const [notifyVariationLabel, setNotifyVariationLabel] = useState('');
    const mobileReviewsRef = useRef<HTMLDivElement>(null);
    const desktopReviewsRef = useRef<HTMLDivElement>(null);

    const placeholderFallBack = 'https://via.placeholder.com/600';

    let { description, shortDescription, image, name, onSale, price, regularPrice, salePrice, productCategories, productBrand, averageRating, reviewCount, galleryImages, reviews, attributes, sku, stockStatus, stockQuantity, totalSales, metaData, productLocation } =
        product;

    const categoryNodes = Array.isArray(product?.categories)
        ? product.categories
        : (Array.isArray(productCategories) ? productCategories : []);
    const brandNodes = Array.isArray(product?.brands)
        ? product.brands
        : (Array.isArray(productBrand) ? productBrand : []);
    const tagNodes = Array.isArray(product?.tags)
        ? product.tags
        : [];
    const locationNodes = Array.isArray(product?.locations)
        ? product.locations
        : (Array.isArray(productLocation) ? productLocation : []);
    const attributeNodes = Array.isArray(product?.attributes)
        ? product.attributes
        : (Array.isArray(attributes) ? attributes : []);
    const reviewNodes = Array.isArray(product?.reviews)
        ? product.reviews
        : (Array.isArray(reviews) ? reviews : []);
    const variationNodes = Array.isArray(product?.variations) ? product.variations : [];
    const crossSellItems = Array.isArray(product?.crossSell)
        ? product.crossSell
        : (Array.isArray(product?.crossSells) ? product.crossSells : []);
    const upsellItems = Array.isArray(product?.upsell)
        ? product.upsell
        : (Array.isArray(product?.upsells) ? product.upsells : []);
    const relatedItems = Array.isArray(product?.related) ? product.related : [];
    const boughtTogetherItems = Array.isArray(product?.boughtTogether) ? product.boughtTogether : [];
    const boughtTogetherIds = Array.isArray(product?.boughtTogetherIds) ? product.boughtTogetherIds : [];
    const crossSellIds = Array.isArray(product?.crossSellIds) ? product.crossSellIds : [];
    const upsellIds = Array.isArray(product?.upsellIds) ? product.upsellIds : [];
    const relatedIds = Array.isArray(product?.relatedIds) ? product.relatedIds : [];



    // Add padding/empty character after currency symbol here
    if (price) {
        price = paddedPrice(price, 'GHS');
    }
    if (regularPrice) {
        regularPrice = paddedPrice(regularPrice, 'GHS');
    }
    if (salePrice) {
        salePrice = paddedPrice(salePrice, 'GHS');
    }

    // Determine Box Content
    const boxContentAttr = attributeNodes.find((attr: any) =>
        ['what\'s in the box', 'box content', 'in the box', 'package contains'].includes(
            (attr.name || '').toLowerCase()
        )
    );

    let boxContentText: string | null = null;
    if (boxContentAttr && boxContentAttr.options) {
        boxContentText = Array.isArray(boxContentAttr.options)
            ? boxContentAttr.options.join(', ')
            : String(boxContentAttr.options);
    } else if (isRefurbished) {
        boxContentText = "Device, Compatible Essential Accessories (Generic Box)";
    }

    const showRefurbishedBadge = !!isRefurbished;
    const showWarrantyBadge = !!isRefurbished;

    const scrollToReviews = () => {
        setDesktopActiveTab('reviews');
        const isDesktopViewport = typeof window !== 'undefined' && window.innerWidth >= 1024;
        const target = isDesktopViewport ? desktopReviewsRef.current : mobileReviewsRef.current;
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const normalizeVariationId = (value: unknown) => String(value ?? '').trim();
    const getVariationId = (node: any) => node?.id ?? node?.variation_id ?? node?.databaseId;
    const normalizeStock = (value: unknown) =>
        String(value ?? '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/_/g, '');
    const parseManageStock = (value: unknown): boolean | undefined => {
        if (typeof value === 'boolean') return value;
        const normalized = String(value ?? '').trim().toLowerCase();
        if (!normalized) return undefined;
        if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
        if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
        return undefined;
    };
    const isVariationOutOfStock = (node: any) => {
        const status = normalizeStock(node?.stockStatus ?? node?.stock_status);
        if (status === 'outofstock' || status === 'out') return true;
        if (status === 'instock' || status === 'in') return false;
        const manageStock = parseManageStock(node?.manageStock ?? node?.manage_stock);
        if (manageStock === false) return false;
        const rawQty = node?.stockQuantity ?? node?.stock_quantity;
        const qty = Number(rawQty);
        if (rawQty !== '' && rawQty !== null && rawQty !== undefined && Number.isFinite(qty) && qty <= 0) {
            return true;
        }
        return false;
    };
    const isVariableProduct = variationNodes.length > 0;
    const resolvedVariationUrlMap = useMemo(() => {
        const source =
            variationUrlMap && typeof variationUrlMap === 'object'
                ? variationUrlMap
                : {};
        return Object.entries(source).reduce<Record<string, string>>((acc, [key, value]) => {
            const normalizedId = normalizeVariationId(key);
            const normalizedUrl = String(value || '').trim();
            if (normalizedId && normalizedUrl) acc[normalizedId] = normalizedUrl;
            return acc;
        }, {});
    }, [variationUrlMap]);
    const firstAvailableVariation = variationNodes.find((node: any) => !isVariationOutOfStock(node));
    const firstVariationId = getVariationId(firstAvailableVariation ?? variationNodes[0]);
    const queryAttributes = readAttributeQueryParams(
        (router.query || {}) as Record<string, string | string[] | undefined>,
    );
    const selectedVariationFromUrl = resolveSelectedVariation(product, variationNodes, queryAttributes);
    const hasVariationParamsInUrl = Object.keys(queryAttributes).some((key) => key.startsWith('attribute_'));
    const selectedFromUrlId = selectedVariationFromUrl ? getVariationId(selectedVariationFromUrl) : undefined;
    const userSelectedMatch = variationNodes.some(
        (node: any) => normalizeVariationId(getVariationId(node)) === normalizeVariationId(userSelectedVariation),
    );
    const selectedVariationId = (
        selectedFromUrlId ??
        (userSelectedMatch ? userSelectedVariation : undefined) ??
        initialSelectedVariationId ??
        firstVariationId
    );
    const isSyntheticVariationId = (id: unknown) =>
        typeof id === 'string' && id.startsWith('synthetic-');
    const isSelectionMissing = isVariableProduct && (
        selectedVariationId === undefined ||
        selectedVariationId === null ||
        String(selectedVariationId).trim() === '' ||
        isSyntheticVariationId(selectedVariationId)
    );

    const selectedVariationNode = variationNodes.find(
        (node: any) => normalizeVariationId(getVariationId(node)) === normalizeVariationId(selectedVariationId),
    );
    const selectedVariationOutOfStock = Boolean(selectedVariationNode && isVariationOutOfStock(selectedVariationNode));
    const currentVariationLabel = buildVariationLabel(selectedVariationNode);
    const shouldShowVariantTitle = Boolean(
        isMobilePhoneProduct &&
        hasVariationParamsInUrl &&
        selectedVariationFromUrl &&
        currentVariationLabel,
    );
    const dynamicProductName = shouldShowVariantTitle ? `${name} - ${currentVariationLabel}` : name;
    const dynamicPageTitle = dynamicProductName ? `${dynamicProductName} | ${siteName}` : siteName;

    const handleVariationSelect = (variationId: number | string) => {
        const normalizedId = normalizeVariationId(variationId);
        if (!normalizedId) return;
        setUserSelectedVariation(variationId);
        if (!isMobilePhoneProduct) return;

        const targetUrl = resolvedVariationUrlMap[normalizedId];
        if (!targetUrl) return;
        const currentPath = String(router.asPath || '').split('#')[0];
        if (currentPath === targetUrl) return;
        void router.replace(targetUrl, undefined, { shallow: true, scroll: false });
    };

    const currentStockQuantity = selectedVariationNode
        ? selectedVariationNode.stockQuantity
        : stockQuantity;

    const currentStockStatus = selectedVariationNode
        ? selectedVariationNode.stockStatus
        : stockStatus;

    const currentSku = selectedVariationNode && selectedVariationNode.sku
        ? selectedVariationNode.sku
        : sku;

    const currentImage = selectedVariationNode && selectedVariationNode.image && selectedVariationNode.image.sourceUrl
        ? selectedVariationNode.image
        : image;

    const currentFormattedStockStatus = currentStockStatus?.replace(/_/g, ' ').toLowerCase();
    const addToCartDisabled = Boolean(isSelectionMissing || selectedVariationOutOfStock);

    const CURRENCY_SYMBOL = 'GHS';
    const asText = (value: unknown) => String(value ?? '').trim();
    const normalizeAttrKey = (value: unknown) =>
        asText(value)
            .toLowerCase()
            .replace(/^attribute_/, '')
            .replace(/^pa_/, '')
            .replace(/[_\s]+/g, '-');
    const normalizeValueKey = (value: unknown) =>
        asText(value)
            .toLowerCase()
            .replace(/[_\s]+/g, '')
            .replace(/-/g, '');
    const parseMoneyValue = (value: unknown) => {
        const parsed = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
        return Number.isFinite(parsed) ? parsed : undefined;
    };
    const toCurrency = (value: unknown) => {
        const text = asText(value);
        if (!text) return '';
        if (/(ghs?|\u20B5)/i.test(text)) return text;
        return paddedPrice(text, CURRENCY_SYMBOL);
    };

    const currentFinalPrice = toCurrency(
        selectedVariationNode?.price ??
        (onSale ? salePrice : price) ??
        price,
    );
    const currentRegularPrice = toCurrency(selectedVariationNode?.regularPrice ?? regularPrice);
    const finalPriceValue = parseMoneyValue(currentFinalPrice);
    const regularPriceValue = parseMoneyValue(currentRegularPrice);
    const computedSavings = (
        regularPriceValue !== undefined &&
        finalPriceValue !== undefined &&
        regularPriceValue > finalPriceValue
    )
        ? (regularPriceValue - finalPriceValue)
        : 0;
    const computedSavingsPercentage = (
        regularPriceValue && computedSavings > 0
            ? Math.round((computedSavings / regularPriceValue) * 100)
            : 0
    );

    const currentStatusNormalized = normalizeStock(currentStockStatus);
    const currentManageStock = parseManageStock(
        selectedVariationNode?.manageStock ??
        selectedVariationNode?.manage_stock ??
        product?.manageStock ??
        product?.manage_stock,
    );
    const rawCurrentStockQty = currentStockQuantity;
    const resolvedStockQty = (
        rawCurrentStockQty !== '' &&
        rawCurrentStockQty !== null &&
        rawCurrentStockQty !== undefined
    )
        ? Number(rawCurrentStockQty)
        : NaN;
    const hasStockQty = Number.isFinite(resolvedStockQty);
    const shouldUseQtyForAvailability = currentManageStock !== false && hasStockQty;
    const isOutOfStockNow = (
        currentStatusNormalized === 'outofstock' ||
        currentStatusNormalized === 'out'
    )
        ? true
        : (
            currentStatusNormalized === 'instock' ||
            currentStatusNormalized === 'in'
        )
            ? false
            : shouldUseQtyForAvailability
                ? resolvedStockQty <= 0
                : false;
    const lowStock = shouldUseQtyForAvailability && resolvedStockQty > 0 && resolvedStockQty < 5;
    const stockStatusMessage = isOutOfStockNow
        ? 'Out of Stock'
        : lowStock
            ? `Low Stock - Only ${resolvedStockQty} left`
            : 'In Stock';
    const salesCount = Number(totalSales);
    const formattedSalesCount = Number.isFinite(salesCount) && salesCount > 0
        ? salesCount.toLocaleString()
        : '';

    const formatVariationAttributeLabel = (key: string) => {
        const normalized = normalizeAttrKey(key);
        return normalized
            .split('-')
            .filter(Boolean)
            .map((part) => {
                const upper = part.toUpperCase();
                if (['RAM', 'ROM', 'SSD', 'HDD', 'CPU', 'GPU', 'USB', 'NFC', 'SIM', 'OS'].includes(upper)) {
                    return upper;
                }
                return part.charAt(0).toUpperCase() + part.slice(1);
            })
            .join(' ');
    };

    const variationAttributeLabelMap = useMemo(() => {
        const labels: Record<string, string> = {};
        attributeNodes.forEach((attr: any) => {
            const key = normalizeAttrKey(attr?.slug ?? attr?.name);
            const label = asText(attr?.name);
            if (!key) return;
            labels[key] = label || formatVariationAttributeLabel(key);
        });
        return labels;
    }, [attributeNodes]);

    const variationAttributeOrder = useMemo(() => {
        const order = attributeNodes
            .map((attr: any) => normalizeAttrKey(attr?.slug ?? attr?.name))
            .filter((key: string) => Boolean(key));
        return Array.from(new Set<string>(order));
    }, [attributeNodes]);

    const variationRecords = useMemo(() => {
        return variationNodes
            .map((node: any) => {
                const id = getVariationId(node);
                const normalizedId = normalizeVariationId(id);
                if (!normalizedId) return null;
                const attributesList = Array.isArray(node?.attributes) ? node.attributes : [];
                const attributeValues: Record<string, string> = {};
                attributesList.forEach((entry: any) => {
                    const key = normalizeAttrKey(entry?.name ?? entry?.attribute ?? entry?.slug ?? entry?.key);
                    const value = asText(entry?.option ?? entry?.value ?? entry?.name);
                    if (!key || !value) return;
                    attributeValues[key] = value;
                });
                return {
                    id,
                    normalizedId,
                    node,
                    isOutOfStock: isVariationOutOfStock(node),
                    attributeValues,
                };
            })
            .filter(Boolean) as Array<{
            id: number | string;
            normalizedId: string;
            node: any;
            isOutOfStock: boolean;
            attributeValues: Record<string, string>;
        }>;
    }, [variationNodes]);

    const selectedAttributeValues = useMemo(() => {
        const values: Record<string, string> = {};
        if (!selectedVariationNode) return values;
        const attributesList = Array.isArray(selectedVariationNode?.attributes)
            ? selectedVariationNode.attributes
            : [];
        attributesList.forEach((entry: any) => {
            const key = normalizeAttrKey(entry?.name ?? entry?.attribute ?? entry?.slug ?? entry?.key);
            const value = asText(entry?.option ?? entry?.value ?? entry?.name);
            if (!key || !value) return;
            values[key] = value;
        });
        return values;
    }, [selectedVariationNode]);

    const variationAttributeGroups = useMemo(() => {
        const groups: Record<string, { key: string; label: string; options: Array<{ value: string; key: string }>; seen: Set<string> }> = {};
        variationRecords.forEach((record) => {
            Object.entries(record.attributeValues).forEach(([attrKey, value]) => {
                if (!value) return;
                const key = normalizeValueKey(value);
                if (!key) return;
                if (!groups[attrKey]) {
                    groups[attrKey] = {
                        key: attrKey,
                        label: variationAttributeLabelMap[attrKey] || formatVariationAttributeLabel(attrKey),
                        options: [],
                        seen: new Set<string>(),
                    };
                }
                if (groups[attrKey].seen.has(key)) return;
                groups[attrKey].seen.add(key);
                groups[attrKey].options.push({ value, key });
            });
        });
        const groupedKeys = Object.keys(groups);
        const orderedKeys = [
            ...variationAttributeOrder.filter((key) => groupedKeys.includes(key)),
            ...groupedKeys.filter((key) => !variationAttributeOrder.includes(key)),
        ];
        return orderedKeys.map((key) => ({
            key,
            label: groups[key].label,
            options: groups[key].options,
        }));
    }, [variationRecords, variationAttributeLabelMap, variationAttributeOrder]);

    const matchesAttributeSelection = (
        record: { attributeValues: Record<string, string> },
        selections: Record<string, string>,
    ) => {
        return Object.entries(selections).every(([attrKey, wanted]) => {
            if (!wanted) return true;
            const recordValue = record.attributeValues[attrKey];
            return normalizeValueKey(recordValue) === normalizeValueKey(wanted);
        });
    };

    const getPreferredVariationForSelection = (selections: Record<string, string>) => {
        const matches = variationRecords.filter((record) => matchesAttributeSelection(record, selections));
        if (!matches.length) return null;
        return matches.find((record) => !record.isOutOfStock) ?? matches[0];
    };

    const isVariationOptionDisabled = (attrKey: string, value: string) => {
        const nextSelection: Record<string, string> = {
            ...selectedAttributeValues,
            [attrKey]: value,
        };
        const preferred = getPreferredVariationForSelection(nextSelection);
        return !preferred || preferred.isOutOfStock;
    };

    const handleVariationOptionSelect = (attrKey: string, value: string) => {
        const nextSelection: Record<string, string> = {
            ...selectedAttributeValues,
            [attrKey]: value,
        };
        const preferred = getPreferredVariationForSelection(nextSelection);
        if (!preferred) return;
        handleVariationSelect(preferred.id);
    };

    const selectedVariationSummary = variationAttributeGroups
        .map((group) => selectedAttributeValues[group.key])
        .filter(Boolean)
        .join(' / ');

    const selectedVariationSelections = (() => {
        if (!selectedVariationNode || !Array.isArray(selectedVariationNode?.attributes)) return [];
        return selectedVariationNode.attributes
            .map((entry: any) => ({
                attribute: asText(entry?.name ?? entry?.attribute ?? entry?.slug ?? entry?.key),
                value: asText(entry?.option ?? entry?.value ?? entry?.name),
            }))
            .filter((entry: { attribute: string; value: string }) => entry.attribute && entry.value);
    })();

    const toArchiveSlug = (value: unknown) =>
        String(value ?? '')
            .trim()
            .toLowerCase()
            .replace(/&/g, ' and ')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

    const renderAttributeOptions = (attr: any) => {
        const options = Array.isArray(attr?.options) ? attr.options : [];
        const archiveBase = toArchiveSlug(attr?.archiveBaseSlug ?? attr?.slug ?? attr?.name);
        const archiveTermLookup =
            attr?.archiveTermLookup && typeof attr.archiveTermLookup === 'object'
                ? attr.archiveTermLookup
                : {};
        const canLinkOptions = Boolean(attr?.hasArchives && archiveBase);

        return options.map((option: string, index: number) => {
            const label = String(option || '').trim();
            const optionKey = toArchiveSlug(option);
            const resolvedOptionSlug = archiveTermLookup[optionKey] || '';

            if (!label) return null;

            return (
                <span key={`${archiveBase || 'attribute'}-${resolvedOptionSlug || optionKey || index}`}>
                    {index > 0 && ', '}
                    {canLinkOptions && resolvedOptionSlug ? (
                        <Link href={`/${archiveBase}/${resolvedOptionSlug}`} className="text-blue-600 hover:underline">
                            {label}
                        </Link>
                    ) : (
                        label
                    )}
                </span>
            );
        });
    };

    const renderLinkedTerms = (
        terms: any[],
        hrefBuilder: (term: any) => string,
        keyPrefix: string,
    ) => (
        <>
            {terms.map((term: any, index: number) => (
                <span key={`${keyPrefix}-${term?.slug || term?.name || index}`}>
                    {index > 0 && ', '}
                    <Link href={hrefBuilder(term)} className="text-blue-600 hover:underline">
                        {term?.name}
                    </Link>
                </span>
            ))}
        </>
    );

    const desktopGalleryImages = (() => {
        const baseGallery = Array.isArray(galleryImages) ? galleryImages : [];
        if (selectedVariationNode?.image?.sourceUrl) {
            return [selectedVariationNode.image, ...baseGallery];
        }
        return baseGallery;
    })();
    const bundlePrimaryProduct = {
        ...product,
        name: dynamicProductName || product?.name,
        image: currentImage || product?.image,
        price: currentFinalPrice || product?.price,
        regularPrice: currentRegularPrice || product?.regularPrice,
        salePrice: selectedVariationNode?.salePrice ?? product?.salePrice,
    };

    return (
        <section className="bg-white pb-28 lg:pb-8">
            <style jsx>{`
                @keyframes price-pop {
                    0%   { background-color: rgba(254, 240, 138, 0.55); border-radius: 6px; }
                    100% { background-color: transparent; }
                }
                .price-pop {
                    animation: price-pop 0.75s ease-out forwards;
                }
            `}</style>
            <Head>
                <title>{dynamicPageTitle}</title>
            </Head>
            <div className="w-full max-w-none mx-auto px-2 md:px-4 pt-1 pb-4 text-black">

                {/* Row 1: Breadcrumbs */}
                <div className="mb-2 md:mb-3">
                    <Breadcrumbs categories={categoryNodes} productName={name} />
                </div>

                {/* Desktop Hero Only */}
                <div className="hidden lg:grid lg:grid-cols-[minmax(0,35fr)_minmax(0,45fr)_minmax(0,20fr)] lg:gap-8">
                    {/* Column 1: Gallery */}
                    <div className="w-full min-w-0">
                        <div className="relative lg:sticky lg:top-24 bg-white p-3 shadow-sm transition-all duration-300">
                            <ProductGallery
                                key={`desktop-gallery-${normalizeVariationId(selectedVariationId)}`}
                                mainImage={currentImage || { sourceUrl: placeholderFallBack }}
                                galleryImages={desktopGalleryImages}
                            />
                            <div className="absolute bottom-4 right-4 z-[40]">
                                <ProductActions
                                    productName={name}
                                    productUrl={`/product/${product.slug}`}
                                    productId={product.databaseId}
                                    orientation="col"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Product Decision Area */}
                    <div className="w-full min-w-0">
                        <div className="space-y-4 bg-white p-5 shadow-sm">
                            <div className="space-y-2">
                                <h1 className="text-3xl font-bold leading-tight text-gray-900">
                                    {dynamicProductName}
                                </h1>
                                {isRefurbished && (
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center rounded-full border border-emerald-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                                            Refurbished - Excellent Condition
                                        </span>
                                        <button
                                            onClick={() => setShowWhatIsRefurbishedModal(true)}
                                            className="text-xs font-semibold text-gray-600 underline hover:text-blue-700"
                                        >
                                            Learn more
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3 text-sm">
                                {brandNodes?.[0] && (
                                    <div className="inline-flex items-center gap-1 text-sm">
                                        <span className="text-gray-600">Brand:</span>
                                        <Link
                                            href={`/brand/${brandNodes[0].slug}`}
                                            className="font-semibold text-blue-600 hover:underline"
                                        >
                                            {brandNodes[0].name}
                                        </Link>
                                    </div>
                                )}
                                {(reviewCount > 0 || formattedSalesCount) && (
                                    <button
                                        type="button"
                                        onClick={scrollToReviews}
                                        className="inline-flex items-center gap-2 hover:opacity-80"
                                    >
                                        <StarRating rating={averageRating || 0} size={15} />
                                        {reviewCount > 0 && (
                                            <span className="font-medium text-gray-600">
                                                {reviewCount} Verified {reviewCount === 1 ? 'Review' : 'Reviews'}
                                            </span>
                                        )}
                                        {formattedSalesCount && (
                                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-400">
                                                <span aria-hidden="true">{String.fromCodePoint(0x1f525)}</span>
                                                <span>Sold: {formattedSalesCount} units</span>
                                            </span>
                                        )}
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2 price-pop" key={`desktop-price-${normalizeVariationId(selectedVariationId)}`}>
                                <div className="flex items-end gap-3" suppressHydrationWarning>
                                    <p className="text-4xl font-bold text-gray-900">
                                        {currentFinalPrice || price}
                                    </p>
                                    {computedSavings > 0 && currentRegularPrice && (
                                        <p className="mb-1 text-lg text-gray-400 line-through">{currentRegularPrice}</p>
                                    )}
                                </div>
                                {computedSavings > 0 && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1 text-sm font-bold text-white">
                                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7"/></svg>
                                            {computedSavingsPercentage}% OFF
                                        </span>
                                        <span className="text-sm font-semibold text-green-700">
                                            You save {CURRENCY_SYMBOL} {computedSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {isVariableProduct && variationAttributeGroups.length > 0 && (
                                <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                                    {variationAttributeGroups.map((group) => {
                                        const options = group.options;
                                        if (!options || options.length === 0) return null;
                                        return (
                                            <div key={`variation-group-${group.key}`} className="space-y-2">
                                                <p className="text-xs font-bold uppercase tracking-wide text-gray-600">{group.label}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {options.map((option) => {
                                                        const isSelected = normalizeValueKey(selectedAttributeValues[group.key]) === option.key;
                                                        const isDisabled = isVariationOptionDisabled(group.key, option.value);
                                                        return (
                                                            <div key={`${group.key}-${option.key}`} className="flex flex-col items-center gap-0.5">
                                                                <button
                                                                    type="button"
                                                                    disabled={isDisabled}
                                                                    onClick={() => handleVariationOptionSelect(group.key, option.value)}
                                                                    className={`rounded-md border px-3 py-2 text-xs font-semibold transition-all duration-200 ${isSelected
                                                                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                                        : isDisabled
                                                                            ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 line-through'
                                                                            : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                                                                        }`}
                                                                >
                                                                    {option.value}
                                                                </button>
                                                                {isDisabled && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setNotifyVariationLabel(`${group.label}: ${option.value}`);
                                                                            setShowNotifyModal(true);
                                                                        }}
                                                                        className="text-[10px] font-semibold text-blue-600 hover:underline"
                                                                    >
                                                                        Notify me
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="space-y-1">
                                <p className={`text-sm font-bold ${isOutOfStockNow ? 'text-red-600' : lowStock ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {stockStatusMessage}
                                </p>
                            </div>

                            <div className="rounded-md border border-gray-200 bg-white p-3 space-y-3">
                                <DeliveryInfo />
                                <div className="border-t border-gray-100 pt-3">
                                    <PaymentInfo />
                                </div>
                            </div>

                            {boxContentText && (
                                <RefurbishBoxContent
                                    boxContentText={boxContentText}
                                    isRefurbished={isRefurbished}
                                />
                            )}

                            {shortDescription && (
                                <div className="rounded-md border border-gray-200 bg-white p-3">
                                    <div
                                        className="text-sm leading-relaxed text-gray-600"
                                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(shortDescription) }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Column 3: Sticky Buy Box */}
                    <div className="w-full min-w-0">
                        <div className="sticky top-24 bg-white p-4 shadow-md">
                            <div className="space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Selected</p>
                                <p className="text-sm font-bold text-gray-900" key={`desktop-summary-${normalizeVariationId(selectedVariationId)}`}>
                                    {selectedVariationSummary || currentVariationLabel || 'Default configuration'}
                                </p>

                                <div className="space-y-1">
                                    <p className="text-3xl font-bold text-gray-900" suppressHydrationWarning>
                                        {currentFinalPrice || price}
                                    </p>
                                    {computedSavings > 0 && (
                                        <div className="text-xs">
                                            <p className="font-semibold text-blue-700">
                                                Save {CURRENCY_SYMBOL}{computedSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({computedSavingsPercentage}% off)
                                            </p>
                                            {currentRegularPrice && (
                                                <p className="text-gray-400 line-through">{currentRegularPrice}</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <p className={`text-xs font-semibold ${isOutOfStockNow ? 'text-red-600' : lowStock ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {stockStatusMessage}
                                </p>

                                <div>
                                    <QuantityControl
                                        quantity={quantity}
                                        onIncrease={() => setQuantity((prev) => prev + 1)}
                                        onDecrease={() => setQuantity((prev) => Math.max(1, prev - 1))}
                                    />
                                </div>

                                {isSelectionMissing && (
                                    <p className="text-xs font-semibold text-red-600">Please select required options</p>
                                )}
                                {!isSelectionMissing && selectedVariationOutOfStock && (
                                    <p className="text-xs font-semibold text-red-600">Out of Stock</p>
                                )}

                                <div className="space-y-2">
                                    {isVariableProduct ? (
                                        <>
                                            <AddToCart
                                                product={product}
                                                variationId={selectedVariationId}
                                                variationSelections={selectedVariationSelections}
                                                fullWidth={true}
                                                buyNow={true}
                                                disabled={addToCartDisabled}
                                                quantity={quantity}
                                            />
                                            <AddToCart
                                                product={product}
                                                variationId={selectedVariationId}
                                                variationSelections={selectedVariationSelections}
                                                fullWidth={true}
                                                disabled={addToCartDisabled}
                                                quantity={quantity}
                                                secondary={true}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <AddToCart product={product} fullWidth={true} buyNow={true} quantity={quantity} key={`desktop-buy-${quantity}`} />
                                            <AddToCart product={product} fullWidth={true} quantity={quantity} key={`desktop-cart-${quantity}`} secondary={true} />
                                        </>
                                    )}
                                </div>

                                <div className="border-t border-gray-100 pt-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { icon: <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, label: 'Authentic' },
                                            { icon: <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>, label: 'Secure Pay' },
                                            { icon: <svg className="h-4 w-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>, label: 'Fast Delivery' },
                                            { icon: <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>, label: 'Warranty' },
                                        ].map(({ icon, label }) => (
                                            <div key={label} className="flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
                                                {icon}
                                                <span className="text-xs font-medium text-gray-700">{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Desktop inline WhatsApp */}
                                <a
                                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi, I'm interested in "${dynamicProductName}" and have a question. Can you help?`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 rounded-lg border border-[#25D366] py-2 text-sm font-semibold text-[#128C7E] transition-colors hover:bg-[#25D366]/10"
                                >
                                    <svg viewBox="0 0 32 32" className="h-4 w-4 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M16.001 2C8.268 2 2 8.268 2 16c0 2.48.648 4.809 1.78 6.832L2 30l7.355-1.754A13.94 13.94 0 0 0 16.001 30C23.732 30 30 23.732 30 16S23.732 2 16.001 2zm0 25.455a11.42 11.42 0 0 1-5.824-1.594l-.418-.247-4.362 1.04 1.077-4.24-.272-.434A11.388 11.388 0 0 1 4.546 16c0-6.317 5.139-11.455 11.455-11.455S27.456 9.683 27.456 16 22.317 27.455 16.001 27.455zm6.285-8.57c-.344-.172-2.037-1.004-2.352-1.119-.316-.114-.547-.172-.777.173-.23.343-.892 1.119-1.092 1.35-.202.23-.402.258-.746.086-.344-.172-1.452-.535-2.767-1.707-1.022-.912-1.713-2.037-1.913-2.381-.2-.344-.021-.53.15-.702.155-.154.344-.402.516-.603.17-.2.228-.344.342-.573.115-.23.057-.431-.028-.603-.086-.172-.777-1.876-1.065-2.568-.28-.672-.564-.581-.778-.592l-.662-.011c-.23 0-.603.086-.919.431s-1.206 1.178-1.206 2.873 1.234 3.332 1.406 3.562c.172.23 2.427 3.706 5.88 5.197.822.355 1.464.567 1.964.726.825.262 1.577.225 2.17.137.662-.099 2.037-.832 2.323-1.634.287-.803.287-1.49.2-1.634-.086-.143-.315-.229-.66-.401z"/>
                                    </svg>
                                    Ask on WhatsApp
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Row 2: Main Grid (Gallery Left / Details Right) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:hidden">

                    {/* Left Column: Gallery & Images - lg:col-span-3 (30%) */}
                    <div className="lg:col-span-3 w-full flex flex-col gap-8">
                        <div className="relative group overflow-hidden bg-gray-50">
                            <ProductGallery key="vertical-gallery" mainImage={currentImage || { sourceUrl: placeholderFallBack }} galleryImages={galleryImages} />
                            <div className="absolute bottom-4 right-4 z-[50]">
                                <ProductActions productName={name} productUrl={`/product/${product.slug}`} productId={product.databaseId} orientation="col" />
                            </div>
                        </div>

                        {/* Accordions (Desktop Placement) */}
                        <div className="hidden lg:block space-y-4">
                            {description && (
                                <Accordion title="Product Details" defaultOpen={false}>
                                    <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: description }} />
                                </Accordion>
                            )}
                            {attributeNodes.length > 0 && (
                                <Accordion title="Specifications">
                                    <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <tbody className="divide-y divide-gray-200">
                                                {attributeNodes.map((attr: any, index: number) => (
                                                    <tr key={index} className="bg-white">
                                                        <td className="px-4 py-2 text-sm font-medium text-gray-900 w-1/3 bg-gray-50">
                                                            {attr.name}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-gray-500">
                                                            {renderAttributeOptions(attr)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Accordion>
                            )}
                            <div className="scroll-mt-24">
                                <Accordion title={`Reviews (${reviewCount || 0})`}>
                                    <ProductReviews reviews={reviewNodes} />
                                </Accordion>
                            </div>
                            {(categoryNodes.length > 0 || tagNodes.length > 0 || locationNodes.length > 0 || currentSku || (Array.isArray(metaData) && metaData.length > 0)) && (
                                <Accordion title="More Information">
                                    <div className="flex flex-col gap-2">
                                        {currentSku && (
                                            <p><span className="font-semibold text-gray-900">SKU:</span> {currentSku}</p>
                                        )}
                                        {typeof totalSales === 'number' && (
                                            <p className="inline-flex items-center gap-1.5"><span aria-hidden="true">{String.fromCodePoint(0x1f525)}</span><span className="text-gray-400"><span className="text-gray-400">Units Sold:</span> {totalSales}</span></p>
                                        )}
                                        {brandNodes?.[0] && (
                                            <p>
                                                <span className="font-semibold text-gray-900">Brand: </span>
                                                <Link href={`/brand/${brandNodes[0].slug}`} className="text-blue-600 hover:underline">
                                                    {brandNodes[0].name}
                                                </Link>
                                            </p>
                                        )}
                                        {locationNodes.length > 0 && (
                                            <p>
                                                <span className="font-semibold text-gray-900">Locations: </span>
                                                {renderLinkedTerms(locationNodes, (location) => `/location/${location.slug}`, 'desktop-info-location')}
                                            </p>
                                        )}
                                        {tagNodes.length > 0 && (
                                            <p>
                                                <span className="font-semibold text-gray-900">Tags: </span>
                                                {renderLinkedTerms(tagNodes, (tag) => `/collection/${tag.slug}`, 'desktop-info-tag')}
                                            </p>
                                        )}
                                        {categoryNodes.length > 0 && (
                                            <p>
                                                <span className="font-semibold text-gray-900">Categories: </span>
                                                {renderLinkedTerms(categoryNodes, (cat) => `/product-category/${cat.slug}`, 'desktop-info-category')}
                                            </p>
                                        )}
                                        {Array.isArray(metaData) && metaData.length > 0 && (
                                            <div className="pt-2 border-t border-gray-100">
                                                <p className="font-semibold text-gray-900">Product Meta</p>
                                                <div className="text-sm text-gray-500 space-y-1 mt-1">
                                                    {metaData
                                                        .filter((m: any) => m?.key && !String(m.key).startsWith('_'))
                                                        .slice(0, 6)
                                                        .map((m: any, index: number) => (
                                                            <p key={`${m.key}-${index}`}>
                                                                <span className="font-medium text-gray-700">{m.key}:</span> {String(m.value)}
                                                            </p>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Accordion>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-7 w-full">
                        <div className="lg:sticky lg:top-24 flex flex-col gap-4">
                            {/* Header Info */}
                            <div className="flex flex-col gap-2" suppressHydrationWarning>
                                <div className="flex justify-start items-center gap-4">
                                    {brandNodes?.[0] && (
                                        <Link href={`/brand/${brandNodes[0].slug}`} className="text-xs font-bold text-blue-600 font-medium tracking-wider hover:underline">
                                            {brandNodes[0].name}
                                        </Link>
                                    )}
                                    {(reviewCount > 0 || formattedSalesCount) && (
                                        <div
                                            className="flex items-center gap-1 cursor-pointer hover:opacity-75 transition-opacity"
                                            onClick={scrollToReviews}
                                        >
                                            <StarRating rating={averageRating || 0} size={14} />
                                            {reviewCount > 0 && (
                                                <span className="text-xs text-gray-500 font-medium ml-1">
                                                    {reviewCount} Verified {reviewCount === 1 ? 'Review' : 'Reviews'}
                                                </span>
                                            )}
                                            {formattedSalesCount && (
                                                <span className="ml-1 inline-flex items-center gap-1 text-xs text-gray-400">
                                                    <span aria-hidden="true">{String.fromCodePoint(0x1f525)}</span>
                                                    <span>Sold: {formattedSalesCount}</span>
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <h1 className="text-md md:text-xl font-bold text-gray-900 leading-tight">
                                    {dynamicProductName}
                                </h1>

                                {currentSku && (
                                    <p className="text-xs text-gray-500 font-mono mt-1">
                                        SKU: <span className="text-gray-700">{currentSku}</span>
                                    </p>
                                )}

                                {showRefurbishedBadge ? (
                                    <div className="flex items-center gap-2 mt-2" suppressHydrationWarning>
                                        <div className="inline-flex items-center gap-1.5 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                            <p className="text-xs text-green-700 font-bold uppercase tracking-wide">Refurbished - Fresh In Box</p>
                                        </div>
                                        <button
                                            onClick={() => setShowWhatIsRefurbishedModal(true)}
                                            className="text-xs text-gray-500 underline hover:text-blue-600 cursor-pointer"
                                        >
                                            learn more?
                                        </button>
                                    </div>
                                ) : null}
                            </div>

                            {/* Info Grid: Short Description (70%) and Info/Refurb Perks (30%) */}
                            <div className="grid grid-cols-1 md:grid-cols-10 gap-4 my-1">
                                {/* Short Description - 70% */}
                                <div className="md:col-span-7">
                                    {boxContentText && (
                                        <RefurbishBoxContent
                                            boxContentText={boxContentText}
                                            isRefurbished={isRefurbished}
                                        />
                                    )}
                                </div>
                                {/* Unified Trust & Logistics Section */}
                                <div className="md:col-span-3">
                                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-2">
                                        <ProductLocationDisplay />
                                        <div className="border-t border-gray-100 pt-2">
                                            <DeliveryInfo />
                                        </div>
                                        <div className="border-t border-gray-100 pt-2">
                                            <PaymentInfo />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Card */}
                            <div className="bg-white border border-gray-200 rounded-xl p-3 md:p-4 shadow-sm">
                                <div className="flex flex-col gap-3">
                                    {/* Price Section */}
                                    <div className="price-pop rounded-lg" suppressHydrationWarning>
                                        <div className="flex items-end gap-3 flex-wrap">
                                            <div className="flex flex-col">
                                                {isRefurbished && (
                                                    <span className="text-[10px] uppercase font-bold text-blue-700 mb-0.5">Refurbished Price</span>
                                                )}
                                                <p className="text-3xl font-bold leading-none text-gray-900">
                                                    {currentFinalPrice || price}
                                                </p>
                                            </div>
                                            {computedSavings > 0 && currentRegularPrice && (
                                                <div className="flex flex-col pb-0.5">
                                                    {isRefurbished && (
                                                        <span className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Brand New Price</span>
                                                    )}
                                                    <p className="text-lg text-gray-400 line-through leading-none">
                                                        {currentRegularPrice}
                                                    </p>
                                                </div>
                                            )}
                                            {computedSavings > 0 && computedSavingsPercentage > 0 && (
                                                <span className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1 text-sm font-bold text-white mb-0.5">
                                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7"/></svg>
                                                    {computedSavingsPercentage}% OFF
                                                </span>
                                            )}
                                        </div>
                                        {computedSavings > 0 && (
                                            <p className="text-xs font-bold text-green-700 mt-1">
                                                You save {CURRENCY_SYMBOL} {computedSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        )}
                                        {isRefurbished && (
                                            <button
                                                onClick={() => setShowCompareModal(true)}
                                                className="text-xs font-semibold text-gray-600 underline mt-1.5 hover:text-blue-800 text-left"
                                            >
                                                Compare with Brand New
                                            </button>
                                        )}
                                    </div>

                                    {/* Variations */}
                                    {isVariableProduct && variationAttributeGroups.length > 0 && (
                                        <div className="space-y-3">
                                            <label className="block text-sm font-semibold text-gray-900">
                                                Select Options
                                            </label>
                                            {variationAttributeGroups.map((group) => (
                                                <div key={`mobile-variation-group-${group.key}`} className="space-y-2">
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{group.label}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {group.options.map((option) => {
                                                            const isSelected = normalizeValueKey(selectedAttributeValues[group.key]) === option.key;
                                                            const isDisabled = isVariationOptionDisabled(group.key, option.value);
                                                            const nextSelection: Record<string, string> = {
                                                                ...selectedAttributeValues,
                                                                [group.key]: option.value,
                                                            };
                                                            const preferred = getPreferredVariationForSelection(nextSelection);
                                                            const preferredVariationId = preferred?.id;
                                                            const variationHref = preferredVariationId
                                                                ? (resolvedVariationUrlMap[normalizeVariationId(preferredVariationId)] || `/product/${product.slug}/`)
                                                                : `/product/${product.slug}/`;
                                                            const optionClassName = `
                                                                px-3 py-2 rounded-lg border text-sm font-medium transition-all
                                                                ${isSelected && !isDisabled
                                                                    ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                                                                    : isDisabled
                                                                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60 line-through'
                                                                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                                                                }
                                                            `;

                                                            const notifyBtn = isDisabled ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setNotifyVariationLabel(`${group.label}: ${option.value}`);
                                                                        setShowNotifyModal(true);
                                                                    }}
                                                                    className="block text-[10px] font-semibold text-blue-600 hover:underline mt-0.5 text-center"
                                                                >
                                                                    Notify me
                                                                </button>
                                                            ) : null;

                                                            if (isMobilePhoneProduct) {
                                                                return (
                                                                    <div key={`${group.key}-${option.key}`} className="flex flex-col items-center">
                                                                        <Link
                                                                            href={variationHref}
                                                                            aria-disabled={isDisabled}
                                                                            onClick={(event) => {
                                                                                event.preventDefault();
                                                                                if (isDisabled || !preferredVariationId) return;
                                                                                handleVariationSelect(preferredVariationId);
                                                                            }}
                                                                            className={optionClassName}
                                                                        >
                                                                            {option.value}
                                                                        </Link>
                                                                        {notifyBtn}
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <div key={`${group.key}-${option.key}`} className="flex flex-col items-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (isDisabled || !preferredVariationId) return;
                                                                            handleVariationSelect(preferredVariationId);
                                                                        }}
                                                                        disabled={isDisabled}
                                                                        className={optionClassName}
                                                                    >
                                                                        {option.value}
                                                                    </button>
                                                                    {notifyBtn}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Quantity & Stock */}
                                    <div className="flex items-center gap-4">
                                        <QuantityControl
                                            quantity={quantity}
                                            onIncrease={() => setQuantity(prev => prev + 1)}
                                            onDecrease={() => setQuantity(prev => Math.max(1, prev - 1))}
                                        />
                                        {(() => {
                                            const showEmergencyStock = lowStock;
                                            return (
                                                <div className="flex flex-col text-xs">
                                                    {shouldUseQtyForAvailability ? (
                                                        <span className={`font-medium ${resolvedStockQty <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                            {resolvedStockQty <= 0 ? 'Out of Stock' : `${resolvedStockQty} in stock`}
                                                        </span>
                                                    ) : (
                                                        <span className="font-medium text-green-600 capitalize">{currentFormattedStockStatus || 'In Stock'}</span>
                                                    )}
                                                    {showEmergencyStock && (
                                                        <span className="text-red-500 font-bold animate-pulse">Low Stock!</span>
                                                    )}
                                                </div>
                                            )
                                        })()}
                                    </div>



                                    {isSelectionMissing && (
                                        <p className="text-xs text-red-600 mt-2">
                                            Please select a variation to add this item to cart.
                                        </p>
                                    )}
                                    {!isSelectionMissing && selectedVariationOutOfStock && (
                                        <p className="text-xs text-red-600 mt-2">
                                            Out of Stock
                                        </p>
                                    )}

                                    {/* Buttons — BUY NOW primary, ADD TO CART secondary */}
                                    <div className="flex flex-col gap-2 pt-2">
                                        {isVariableProduct ? (
                                            <>
                                                <AddToCart
                                                    product={product}
                                                    variationId={selectedVariationId}
                                                    variationSelections={selectedVariationSelections}
                                                    fullWidth={true}
                                                    buyNow={true}
                                                    disabled={addToCartDisabled}
                                                    quantity={quantity}
                                                />
                                                <AddToCart
                                                    product={product}
                                                    variationId={selectedVariationId}
                                                    variationSelections={selectedVariationSelections}
                                                    fullWidth={true}
                                                    disabled={addToCartDisabled}
                                                    quantity={quantity}
                                                    secondary={true}
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <AddToCart product={product} fullWidth={true} buyNow={true} quantity={quantity} key={`buy-${quantity}`} />
                                                <AddToCart product={product} fullWidth={true} quantity={quantity} key={`cart-${quantity}`} secondary={true} />
                                            </>
                                        )}

                                        {/* Mobile inline WhatsApp */}
                                        <a
                                            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi, I'm interested in "${dynamicProductName}" and have a question. Can you help?`)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 rounded-lg border border-[#25D366] py-2.5 text-sm font-semibold text-[#128C7E] transition-colors hover:bg-[#25D366]/10 active:bg-[#25D366]/20"
                                        >
                                            <svg viewBox="0 0 32 32" className="h-4 w-4 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M16.001 2C8.268 2 2 8.268 2 16c0 2.48.648 4.809 1.78 6.832L2 30l7.355-1.754A13.94 13.94 0 0 0 16.001 30C23.732 30 30 23.732 30 16S23.732 2 16.001 2zm0 25.455a11.42 11.42 0 0 1-5.824-1.594l-.418-.247-4.362 1.04 1.077-4.24-.272-.434A11.388 11.388 0 0 1 4.546 16c0-6.317 5.139-11.455 11.455-11.455S27.456 9.683 27.456 16 22.317 27.455 16.001 27.455zm6.285-8.57c-.344-.172-2.037-1.004-2.352-1.119-.316-.114-.547-.172-.777.173-.23.343-.892 1.119-1.092 1.35-.202.23-.402.258-.746.086-.344-.172-1.452-.535-2.767-1.707-1.022-.912-1.713-2.037-1.913-2.381-.2-.344-.021-.53.15-.702.155-.154.344-.402.516-.603.17-.2.228-.344.342-.573.115-.23.057-.431-.028-.603-.086-.172-.777-1.876-1.065-2.568-.28-.672-.564-.581-.778-.592l-.662-.011c-.23 0-.603.086-.919.431s-1.206 1.178-1.206 2.873 1.234 3.332 1.406 3.562c.172.23 2.427 3.706 5.88 5.197.822.355 1.464.567 1.964.726.825.262 1.577.225 2.17.137.662-.099 2.037-.832 2.323-1.634.287-.803.287-1.49.2-1.634-.086-.143-.315-.229-.66-.401z"/>
                                            </svg>
                                            Have questions? Chat on WhatsApp
                                        </a>
                                    </div>

                                    <div className="lg:hidden">
                                        <ProductRecommendationsDeferred
                                            key={`mobile-cross-sell-${String(product?.id ?? product?.databaseId ?? product?.slug ?? '')}`}
                                            productId={Number(product?.id ?? product?.databaseId ?? 0) || undefined}
                                            boughtTogetherProducts={boughtTogetherItems}
                                            boughtTogetherIds={boughtTogetherIds}
                                            crossSellProducts={crossSellItems}
                                            crossSellIds={crossSellIds}
                                            upsell={upsellItems}
                                            upsellIds={upsellIds}
                                            related={relatedItems}
                                            relatedIds={relatedIds}
                                            showBoughtTogether={boughtTogetherItems.length > 0 || boughtTogetherIds.length > 0}
                                            showCrossSell={true}
                                            showUpsell={false}
                                            showRelated={false}
                                            containerClassName="px-0"
                                            primaryProduct={bundlePrimaryProduct}
                                            primaryVariationId={selectedVariationId}
                                            primaryVariationSelections={selectedVariationSelections}
                                            primaryDisabled={addToCartDisabled}
                                            compactMobile={true}
                                        />
                                    </div>

                                    {shortDescription && (
                                        <div className="mt-2 border-t border-gray-100 pt-3">
                                            <div
                                                className={`text-gray-600 text-sm leading-relaxed ${!isShortDescriptionExpanded ? 'line-clamp-4' : ''}`}
                                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(shortDescription) }}
                                            />
                                            <button
                                                onClick={() => setIsShortDescriptionExpanded(!isShortDescriptionExpanded)}
                                                className="mt-1 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline focus:outline-none"
                                            >
                                                {isShortDescriptionExpanded ? 'Read Less' : 'Read More'}
                                                <svg className={`w-3 h-3 transform transition-transform ${isShortDescriptionExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Row 3: Accordions (Mobile Only) */}
                <div className="lg:hidden mt-8 space-y-6">
                    {description && (
                        <Accordion title="Product Details" defaultOpen={false}>
                            <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: description }} />
                        </Accordion>
                    )}
                    {attributeNodes.length > 0 && (
                        <Accordion title="Specifications">
                            <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <tbody className="divide-y divide-gray-200">
                                        {attributeNodes.map((attr: any, index: number) => (
                                            <tr key={index} className="bg-white">
                                                <td className="px-4 py-2 text-sm font-medium text-gray-900 w-1/3 bg-gray-50">
                                                    {attr.name}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-500">
                                                    {renderAttributeOptions(attr)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Accordion>
                    )}
                    {/* Reviews Mobile */}
                    <div ref={mobileReviewsRef} className="scroll-mt-24">
                        <Accordion title={`Reviews (${reviewCount || 0})`}>
                            <ProductReviews reviews={reviewNodes} />
                        </Accordion>
                    </div>
                    {(categoryNodes.length > 0 || tagNodes.length > 0 || locationNodes.length > 0 || currentSku || (Array.isArray(metaData) && metaData.length > 0)) && (
                        <Accordion title="More Information">
                            <div className="flex flex-col gap-2">
                                {currentSku && (
                                    <p><span className="font-semibold text-gray-900">SKU:</span> {currentSku}</p>
                                )}
                                {typeof totalSales === 'number' && (
                                    <p className="inline-flex items-center gap-1.5"><span aria-hidden="true">{String.fromCodePoint(0x1f525)}</span><span className="text-gray-400"><span className="text-gray-400">Units Sold:</span> {totalSales}</span></p>
                                )}
                                {brandNodes?.[0] && (
                                    <p>
                                        <span className="font-semibold text-gray-900">Brand: </span>
                                        <Link href={`/brand/${brandNodes[0].slug}`} className="text-blue-600 hover:underline">
                                            {brandNodes[0].name}
                                        </Link>
                                    </p>
                                )}
                                {locationNodes.length > 0 && (
                                    <p>
                                        <span className="font-semibold text-gray-900">Locations: </span>
                                        {renderLinkedTerms(locationNodes, (location) => `/location/${location.slug}`, 'mobile-info-location')}
                                    </p>
                                )}
                                {tagNodes.length > 0 && (
                                    <p>
                                        <span className="font-semibold text-gray-900">Tags: </span>
                                        {renderLinkedTerms(tagNodes, (tag) => `/collection/${tag.slug}`, 'mobile-info-tag')}
                                    </p>
                                )}
                                {categoryNodes.length > 0 && (
                                    <p>
                                        <span className="font-semibold text-gray-900">Categories: </span>
                                        {renderLinkedTerms(categoryNodes, (cat) => `/product-category/${cat.slug}`, 'mobile-info-category')}
                                    </p>
                                )}
                                {Array.isArray(metaData) && metaData.length > 0 && (
                                    <div className="pt-2 border-t border-gray-100">
                                        <p className="font-semibold text-gray-900">Product Meta</p>
                                        <div className="text-sm text-gray-500 space-y-1 mt-1">
                                            {metaData
                                                .filter((m: any) => m?.key && !String(m.key).startsWith('_'))
                                                .slice(0, 6)
                                                .map((m: any, index: number) => (
                                                    <p key={`${m.key}-${index}`}>
                                                        <span className="font-medium text-gray-700">{m.key}:</span> {String(m.value)}
                                                    </p>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Accordion>
                    )}
                </div>

                <div className="hidden lg:block mt-8">
                    <ProductRecommendationsDeferred
                        key={`desktop-cross-sell-${String(product?.id ?? product?.databaseId ?? product?.slug ?? '')}`}
                        productId={Number(product?.id ?? product?.databaseId ?? 0) || undefined}
                        boughtTogetherProducts={boughtTogetherItems}
                        boughtTogetherIds={boughtTogetherIds}
                        crossSellProducts={crossSellItems}
                        crossSellIds={crossSellIds}
                        upsell={upsellItems}
                        upsellIds={upsellIds}
                        related={relatedItems}
                        relatedIds={relatedIds}
                        showBoughtTogether={boughtTogetherItems.length > 0 || boughtTogetherIds.length > 0}
                        showCrossSell={true}
                        showUpsell={false}
                        showRelated={false}
                        containerClassName="px-0"
                        primaryProduct={bundlePrimaryProduct}
                        primaryVariationId={selectedVariationId}
                        primaryVariationSelections={selectedVariationSelections}
                        primaryDisabled={addToCartDisabled}
                    />
                </div>

                {/* Desktop Below-the-Fold Tabs */}
                <div className="hidden lg:block mt-8" ref={desktopReviewsRef}>
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                        <div className="grid grid-cols-5 border-b border-gray-200">
                            <button
                                type="button"
                                onClick={() => setDesktopActiveTab('description')}
                                className={`px-4 py-3 text-sm font-semibold transition-colors ${desktopActiveTab === 'description' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                            >
                                Description
                            </button>
                            <button
                                type="button"
                                onClick={() => setDesktopActiveTab('specs')}
                                className={`px-4 py-3 text-sm font-semibold transition-colors ${desktopActiveTab === 'specs' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                            >
                                Specs
                            </button>
                            <button
                                type="button"
                                onClick={() => setDesktopActiveTab('additional')}
                                className={`px-4 py-3 text-sm font-semibold transition-colors ${desktopActiveTab === 'additional' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                            >
                                Additional Info
                            </button>
                            <button
                                type="button"
                                onClick={() => setDesktopActiveTab('reviews')}
                                className={`px-4 py-3 text-sm font-semibold transition-colors ${desktopActiveTab === 'reviews' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                            >
                                Reviews ({reviewCount || 0})
                            </button>
                            <button
                                type="button"
                                onClick={() => setDesktopActiveTab('shipping')}
                                className={`px-4 py-3 text-sm font-semibold transition-colors ${desktopActiveTab === 'shipping' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                            >
                                Shipping
                            </button>
                        </div>

                        <div className="p-5">
                            {desktopActiveTab === 'description' && (
                                description ? (
                                    <div
                                        className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: description }}
                                    />
                                ) : (
                                    <p className="text-sm text-gray-500">No description available.</p>
                                )
                            )}

                            {desktopActiveTab === 'specs' && (
                                attributeNodes.length > 0 ? (
                                    <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <tbody className="divide-y divide-gray-200">
                                                {attributeNodes.map((attr: { name: string; options: string[] }, index: number) => (
                                                    <tr key={`desktop-spec-${index}`} className="bg-white">
                                                        <td className="px-4 py-2 text-sm font-medium text-gray-900 w-1/3 bg-gray-50">
                                                            {attr.name}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-gray-600">
                                                            {renderAttributeOptions(attr)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">No specifications available.</p>
                                )
                            )}

                            {desktopActiveTab === 'reviews' && (
                                <ProductReviews reviews={reviewNodes} />
                            )}

                            {desktopActiveTab === 'additional' && (
                                (categoryNodes.length > 0 || tagNodes.length > 0 || locationNodes.length > 0 || currentSku || (Array.isArray(metaData) && metaData.length > 0)) ? (
                                    <div className="flex flex-col gap-2 text-sm text-gray-700">
                                        {currentSku && (
                                            <p><span className="font-semibold text-gray-900">SKU:</span> {currentSku}</p>
                                        )}
                                        {typeof totalSales === 'number' && (
                                            <p className="inline-flex items-center gap-1.5"><span aria-hidden="true">{String.fromCodePoint(0x1f525)}</span><span className="text-gray-400"><span className="text-gray-400">Units Sold:</span> {totalSales}</span></p>
                                        )}
                                        {brandNodes?.[0] && (
                                            <p>
                                                <span className="font-semibold text-gray-900">Brand: </span>
                                                <Link href={`/brand/${brandNodes[0].slug}`} className="text-blue-600 hover:underline">
                                                    {brandNodes[0].name}
                                                </Link>
                                            </p>
                                        )}
                                        {locationNodes.length > 0 && (
                                            <p>
                                                <span className="font-semibold text-gray-900">Locations: </span>
                                                {renderLinkedTerms(locationNodes, (location) => `/location/${location.slug}`, 'tab-info-location')}
                                            </p>
                                        )}
                                        {tagNodes.length > 0 && (
                                            <p>
                                                <span className="font-semibold text-gray-900">Tags: </span>
                                                {renderLinkedTerms(tagNodes, (tag) => `/collection/${tag.slug}`, 'tab-info-tag')}
                                            </p>
                                        )}
                                        {categoryNodes.length > 0 && (
                                            <p>
                                                <span className="font-semibold text-gray-900">Categories: </span>
                                                {renderLinkedTerms(categoryNodes, (cat) => `/product-category/${cat.slug}`, 'tab-info-category')}
                                            </p>
                                        )}
                                        {Array.isArray(metaData) && metaData.length > 0 && (
                                            <div className="pt-2 border-t border-gray-100">
                                                <p className="font-semibold text-gray-900">Product Meta</p>
                                                <div className="text-sm text-gray-500 space-y-1 mt-1">
                                                    {metaData
                                                        .filter((m: any) => m?.key && !String(m.key).startsWith('_'))
                                                        .slice(0, 6)
                                                        .map((m: any, index: number) => (
                                                            <p key={`desktop-meta-${m.key}-${index}`}>
                                                                <span className="font-medium text-gray-700">{m.key}:</span> {String(m.value)}
                                                            </p>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">No additional information available.</p>
                                )
                            )}

                            {desktopActiveTab === 'shipping' && (
                                <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                                    <ProductLocationDisplay />
                                    <div className="border-t border-gray-200 pt-3">
                                        <DeliveryInfo />
                                    </div>
                                    <div className="border-t border-gray-200 pt-3">
                                        <PaymentInfo />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>


            </div> {/* Close Wrapper */}

        <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-gray-200 bg-white/95 px-3 py-2.5 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-6xl items-center gap-3 pb-[max(env(safe-area-inset-bottom),0px)]">
                {/* Price + stock info */}
                <div className="min-w-0 flex-1" suppressHydrationWarning>
                    <p className="text-lg font-bold leading-none text-gray-900">
                        {currentFinalPrice || price}
                    </p>
                    {computedSavingsPercentage > 0 && (
                        <p className="mt-0.5 text-[10px] font-bold text-green-600">
                            {computedSavingsPercentage}% OFF · Save {CURRENCY_SYMBOL} {computedSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    )}
                    {computedSavingsPercentage === 0 && (
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                            {isVariableProduct
                                ? (selectedVariationSummary || currentVariationLabel || 'Select options above')
                                : (stockStatusMessage || 'Ready to order')}
                        </p>
                    )}
                </div>

                {/* BUY NOW + ADD TO CART side by side */}
                <div className="flex shrink-0 gap-2">
                    {isVariableProduct ? (
                        <>
                            <AddToCart
                                product={product}
                                variationId={selectedVariationId}
                                variationSelections={selectedVariationSelections}
                                fullWidth={false}
                                disabled={addToCartDisabled}
                                quantity={quantity}
                                secondary={true}
                            />
                            <AddToCart
                                product={product}
                                variationId={selectedVariationId}
                                variationSelections={selectedVariationSelections}
                                fullWidth={false}
                                buyNow={true}
                                disabled={addToCartDisabled}
                                quantity={quantity}
                            />
                        </>
                    ) : (
                        <>
                            <AddToCart
                                product={product}
                                fullWidth={false}
                                quantity={quantity}
                                key={`sticky-cart-${quantity}`}
                                secondary={true}
                            />
                            <AddToCart
                                product={product}
                                fullWidth={false}
                                buyNow={true}
                                quantity={quantity}
                                key={`sticky-buy-${quantity}`}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>

        <ProductRecommendationsDeferred
            key={`recommendations-${String(product?.id ?? product?.databaseId ?? product?.slug ?? '')}`}
            productId={Number(product?.id ?? product?.databaseId ?? 0) || undefined}
            boughtTogetherProducts={boughtTogetherItems}
            boughtTogetherIds={boughtTogetherIds}
            crossSellProducts={crossSellItems}
            crossSellIds={crossSellIds}
            upsell={upsellItems}
            upsellIds={upsellIds}
            related={relatedItems}
            relatedIds={relatedIds}
            showCrossSell={false}
            primaryProduct={bundlePrimaryProduct}
            primaryVariationId={selectedVariationId}
            primaryVariationSelections={selectedVariationSelections}
            primaryDisabled={addToCartDisabled}
        />

                {/* Logic modals ... */}
                {showWarrantyBadge && (
                    <div className="hidden">
                    </div>
                )}
                {(() => {
                    const savingsFormatted = computedSavings > 0
                        ? computedSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : '0.00';

                    return (
                        <>
                            <ComparePriceModal
                                isOpen={showCompareModal}
                                onClose={() => setShowCompareModal(false)}
                                newPrice={currentRegularPrice || ''}
                                refurbPrice={currentFinalPrice || ''}
                                productName={name}
                                savings={savingsFormatted}
                            />
                            <WhatIsRefurbishedModal
                                isOpen={showWhatIsRefurbishedModal}
                                onClose={() => setShowWhatIsRefurbishedModal(false)}
                            />
                            <NotifyRestockModal
                                isOpen={showNotifyModal}
                                onClose={() => setShowNotifyModal(false)}
                                productName={name}
                                variationLabel={notifyVariationLabel}
                            />
                        </>
                    );
                })()}
        </section>
    );
};

export default SingleProductFinal;
