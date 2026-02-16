// Imports - Layout Refined
import { useState, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Utils
import { filteredVariantPrice, paddedPrice } from '@/utils/functions/functions';

// Components
import AddToCart from './AddToCart.component';
import Breadcrumbs from '@/components/UI/Breadcrumbs.component';
import StarRating from '@/components/UI/StarRating.component';
import ProductGallery from './ProductGalleryVertical.component';
import ProductCard from './ProductCard.component';
import Accordion from '../UI/Accordion.component';
import DOMPurify from 'isomorphic-dompurify';
import DeliveryInfo from './DeliveryInfo.component';
import PaymentInfo from './PaymentInfo.component';
import ProductLocationDisplay from './ProductLocationDisplay.component';
import ProductActions from './ProductActions.component';
import ProductReviews from './ProductReviews.component';

// Dynamic Imports for Performance
const ComparePriceModal = dynamic(() => import('./ComparePriceModal.component'), { ssr: false });
const WhatIsRefurbishedModal = dynamic(() => import('./WhatIsRefurbishedModal.component'), { ssr: false });

import QuantityControl from '@/components/Cart/QuantityControl.component';

const SingleProductFinal = ({
    product,
    isRefurbished = false
}: {
    product: any;
    loading?: boolean;
    isRefurbished?: boolean;
}) => {

    const [selectedVariation, setSelectedVariation] = useState<number>();
    const [quantity, setQuantity] = useState<number>(1);
    const [isShortDescriptionExpanded, setIsShortDescriptionExpanded] = useState(false);
    const [showCompareModal, setShowCompareModal] = useState(false);
    const [showWhatIsRefurbishedModal, setShowWhatIsRefurbishedModal] = useState(false);
    const reviewsRef = useRef<HTMLDivElement>(null);

    const placeholderFallBack = 'https://via.placeholder.com/600';

    let { description, shortDescription, image, name, onSale, price, regularPrice, salePrice, productCategories, productBrand, averageRating, reviewCount, galleryImages, reviews, attributes, sku, stockStatus, stockQuantity, totalSales, metaData, productLocation } =
        product;



    // Add padding/empty character after currency symbol here
    if (price) {
        price = paddedPrice(price, 'GH₵');
    }
    if (regularPrice) {
        regularPrice = paddedPrice(regularPrice, 'GH₵');
    }
    if (salePrice) {
        salePrice = paddedPrice(salePrice, 'GH₵');
    }

    // Determine Box Content
    const boxContentAttr = attributes?.nodes?.find((attr: any) =>
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
        reviewsRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const isVariableProduct = (product?.variations?.nodes?.length || 0) > 0;
    const selectedVariationMatch = product?.variations?.nodes?.some(
        (node: any) => node.databaseId === selectedVariation,
    );
    const firstVariationId = product?.variations?.nodes?.[0]?.databaseId;
    const selectedVariationId = selectedVariationMatch ? selectedVariation : firstVariationId;
    const isSelectionMissing = isVariableProduct && !selectedVariationId;

    const selectedVariationNode = product.variations?.nodes?.find(
        (node: any) => node.databaseId === selectedVariationId,
    );

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

    return (
        <section className="bg-white pb-8">
            <div className="w-full max-w-none mx-auto px-2 md:px-4 pt-1 pb-4 text-black">

                {/* Row 1: Breadcrumbs */}
                <div className="mb-2 md:mb-3">
                    <Breadcrumbs categories={productCategories} productName={name} />
                </div>

                {/* Row 2: Main Grid (Gallery Left / Details Right) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-10 gap-6 lg:gap-8">

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
                                <Accordion title="Product Details" defaultOpen={true}>
                                    <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: description }} />
                                </Accordion>
                            )}
                            {attributes && attributes.nodes && attributes.nodes.length > 0 && (
                                <Accordion title="Specifications">
                                    <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <tbody className="divide-y divide-gray-200">
                                                {attributes.nodes.map((attr: { name: string; options: string[] }, index: number) => (
                                                    <tr key={index} className="bg-white">
                                                        <td className="px-4 py-2 text-sm font-medium text-gray-900 w-1/3 bg-gray-50">
                                                            {attr.name}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-gray-500">
                                                            {attr.options ? attr.options.join(', ') : ''}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Accordion>
                            )}
                            <div ref={reviewsRef} className="scroll-mt-24">
                                <Accordion title={`Reviews (${reviewCount || 0})`}>
                                    <ProductReviews reviews={reviews?.nodes || []} />
                                </Accordion>
                            </div>
                            {((productCategories?.nodes && productCategories.nodes.length > 0) || currentSku || (Array.isArray(metaData) && metaData.length > 0)) && (
                                <Accordion title="More Information">
                                    <div className="flex flex-col gap-2">
                                        {currentSku && (
                                            <p><span className="font-semibold text-gray-900">SKU:</span> {currentSku}</p>
                                        )}
                                        {typeof totalSales === 'number' && (
                                            <p><span className="font-semibold text-gray-900">Units Sold:</span> {totalSales}</p>
                                        )}
                                        {productBrand?.nodes?.[0] && (
                                            <p>
                                                <span className="font-semibold text-gray-900">Brand: </span>
                                                <Link href={`/brand/${productBrand.nodes[0].slug}`} className="text-blue-600 hover:underline">
                                                    {productBrand.nodes[0].name}
                                                </Link>
                                            </p>
                                        )}
                                        {productLocation?.nodes?.[0] && (
                                            <p>
                                                <span className="font-semibold text-gray-900">Location: </span>
                                                <Link href={`/location/${productLocation.nodes[0].slug}`} className="text-blue-600 hover:underline">
                                                    {productLocation.nodes[0].name}
                                                </Link>
                                            </p>
                                        )}
                                        {productCategories?.nodes && productCategories.nodes.length > 0 && (
                                            <p>
                                                <span className="font-semibold text-gray-900">Categories: </span>
                                                {productCategories.nodes.map((cat: any, index: number) => (
                                                    <span key={cat.slug}>
                                                        {index > 0 && ', '}
                                                        <Link href={`/product-category/${cat.slug}`} className="text-blue-600 hover:underline">
                                                            {cat.name}
                                                        </Link>
                                                    </span>
                                                ))}
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
                                    {productBrand?.nodes?.[0] && (
                                        <Link href={`/brand/${productBrand.nodes[0].slug}`} className="text-xs font-bold text-blue-600 font-medium tracking-wider hover:underline">
                                            {productBrand.nodes[0].name}
                                        </Link>
                                    )}
                                    <div
                                        className="flex items-center gap-1 cursor-pointer hover:opacity-75 transition-opacity"
                                        onClick={scrollToReviews}
                                    >
                                        <StarRating rating={averageRating || 0} size={14} />
                                        <span className="text-xs text-gray-500 font-normal ml-1">
                                            {reviewCount || 0} Reviews
                                        </span>
                                    </div>
                                </div>

                                <h1 className="text-md md:text-xl font-bold text-gray-900 leading-tight">
                                    {name}
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
                                ) : <div className="mt-4 h-6"></div>}
                            </div>

                            {/* Info Grid: Short Description (70%) and Info/Refurb Perks (30%) */}
                            <div className="grid grid-cols-1 md:grid-cols-10 gap-4 my-1">
                                {/* Short Description - 70% */}
                                <div className="md:col-span-7">
                                    {shortDescription && (
                                        <div className="mt-0">
                                            <div
                                                className={`text-gray-600 text-sm leading-relaxed ${!isShortDescriptionExpanded ? 'line-clamp-4' : ''}`}
                                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(shortDescription) }}
                                            />
                                            <button
                                                onClick={() => setIsShortDescriptionExpanded(!isShortDescriptionExpanded)}
                                                className="text-blue-600 text-xs font-semibold mt-1 hover:underline flex items-center gap-1 focus:outline-none"
                                            >
                                                {isShortDescriptionExpanded ? 'Read Less' : 'Read More'}
                                                <svg className={`w-3 h-3 transform transition-transform ${isShortDescriptionExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                    {/* What's in the box Section */}
                                    {boxContentText && (
                                        <div className="my-3 p-3 bg-gray-50 rounded-lg border border-gray-100 shadow-sm">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m-8-4v10l8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                                                </svg>
                                                <span className="text-md font-medium text-gray-600 tracking-wide">What&apos;s in the box?</span>
                                            </div>
                                            <p className="text-xs md:text-sm text-gray-600 pl-6 leading-relaxed font-xs" suppressHydrationWarning>
                                                {boxContentText}
                                            </p>

                                            {isRefurbished && (
                                                <>
                                                    <h4 className="text-md font-medium text-gray-600 mb-2 pl-6">Additional Info</h4>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4">
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                                                            <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                            <span>Fresh in Box</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                                                            <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                            <span>12 Months Warranty</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                                                            <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                                            <span>100% Battery Health</span>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
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
                                    <div>
                                        {onSale ? (
                                            <div className="flex flex-col items-start gap-1">
                                                <div className="flex flex-row items-end gap-3">
                                                    <div className="flex flex-col" suppressHydrationWarning>
                                                        {isRefurbished && (
                                                            <span className="text-[10px] uppercase font-extrabold text-blue-700 mb-0.5">Refurbished Price</span>
                                                        )}
                                                        <p className="text-3xl font-bold text-blue-600 leading-none">
                                                            {isVariableProduct
                                                                ? price
                                                                : salePrice}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col pb-0.5" suppressHydrationWarning>
                                                        {isRefurbished && (
                                                            <span className="text-[10px] uppercase font-extrabold text-gray-400 mb-0.5">Brand New Price</span>
                                                        )}
                                                        <p className="text-xl text-gray-400 line-through leading-none">
                                                            {regularPrice}
                                                        </p>
                                                    </div>
                                                </div>
                                                {(() => {
                                                    const currentSale = (isVariableProduct ? filteredVariantPrice(price, '') : salePrice) || '';
                                                    const currentReg = (isVariableProduct ? filteredVariantPrice(price, 'right') : regularPrice) || '';

                                                    if (currentSale && currentReg) {
                                                        const saleVal = parseFloat(currentSale.replace(/[^0-9.]/g, ''));
                                                        const regVal = parseFloat(currentReg.replace(/[^0-9.]/g, ''));

                                                        if (!isNaN(saleVal) && !isNaN(regVal) && regVal > saleVal) {
                                                            const savings = regVal - saleVal;
                                                            const savingsFormatted = savings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                            return (
                                                                <p className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded inline-block mt-1" suppressHydrationWarning>
                                                                    You Save: GH₵{savingsFormatted}
                                                                </p>
                                                            );
                                                        }
                                                    }
                                                    return null;
                                                })()}

                                                {isRefurbished && (
                                                    <button
                                                        onClick={() => setShowCompareModal(true)}
                                                        className="text-xs font-semibold text-gray-600 underline mt-2 hover:text-blue-800 text-left"
                                                    >
                                                        Compare with Brand New
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-3xl font-bold text-gray-600" suppressHydrationWarning>{price}</p>
                                        )}
                                    </div>

                                    {/* Variations */}
                                    {isVariableProduct && product?.variations?.nodes && (
                                        <div>
                                            <label className="block text-sm font-semibold mb-2 text-gray-900">
                                                Select Option
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {product.variations.nodes.map(
                                                    ({ id, name, databaseId, stockQuantity, stockStatus }: any) => {
                                                        const isOutOfStock = stockStatus === 'OUT_OF_STOCK' || (stockQuantity !== null && stockQuantity === 0);
                                                        const isSelected = selectedVariationId === databaseId;
                                                        const variantName = name.split('- ').pop();

                                                        return (
                                                            <button
                                                                key={id}
                                                                type="button"
                                                                onClick={() => !isOutOfStock && setSelectedVariation(databaseId)}
                                                                disabled={isOutOfStock}
                                                                className={`
                                                px-3 py-2 rounded-lg border text-sm font-medium transition-all
                                                ${isSelected && !isOutOfStock
                                                                        ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                                                                        : isOutOfStock
                                                                            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60 decoration-slice line-through'
                                                                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                                                                    }
                                            `}
                                                            >
                                                                {variantName}
                                                            </button>
                                                        );
                                                    }
                                                )}
                                            </div>
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
                                            const showEmergencyStock = isRefurbished && currentStockQuantity !== undefined && currentStockQuantity !== null && currentStockQuantity > 0 && currentStockQuantity < 5;
                                            return (
                                                <div className="flex flex-col text-xs">
                                                    {currentStockQuantity !== null && currentStockQuantity !== undefined ? (
                                                        <span className={`font-medium ${currentStockQuantity === 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                            {currentStockQuantity === 0 ? 'Out of Stock' : `${currentStockQuantity} in stock`}
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

                                    {/* Buttons */}
                                    <div className="flex flex-col gap-3 pt-2">
                                        {isVariableProduct ? (
                                            <div className="flex flex-col md:flex-row gap-2">
                                                <div className="w-full md:flex-1">
                                                    <AddToCart
                                                        product={product}
                                                        variationId={selectedVariationId}
                                                        fullWidth={true}
                                                        disabled={isSelectionMissing}
                                                        quantity={quantity}
                                                    />
                                                </div>
                                                <div className="w-full md:flex-1">
                                                    <AddToCart
                                                        product={product}
                                                        variationId={selectedVariationId}
                                                        fullWidth={true}
                                                        buyNow={true}
                                                        disabled={isSelectionMissing}
                                                        quantity={quantity}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col md:flex-row gap-2">
                                                <div className="w-full md:flex-1">
                                                    <AddToCart product={product} fullWidth={true} quantity={quantity} key={`cart-${quantity}`} />
                                                </div>
                                                <div className="w-full md:flex-1">
                                                    <AddToCart product={product} fullWidth={true} buyNow={true} quantity={quantity} key={`buy-${quantity}`} />
                                                </div>
                                            </div>
                                        )}
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
                    {attributes && attributes.nodes && attributes.nodes.length > 0 && (
                        <Accordion title="Specifications">
                            <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <tbody className="divide-y divide-gray-200">
                                        {attributes.nodes.map((attr: { name: string; options: string[] }, index: number) => (
                                            <tr key={index} className="bg-white">
                                                <td className="px-4 py-2 text-sm font-medium text-gray-900 w-1/3 bg-gray-50">
                                                    {attr.name}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-500">
                                                    {attr.options ? attr.options.join(', ') : ''}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Accordion>
                    )}
                    {/* Reviews Mobile */}
                    <div ref={reviewsRef} className="scroll-mt-24">
                        <Accordion title={`Reviews (${reviewCount || 0})`}>
                            <ProductReviews reviews={reviews?.nodes || []} />
                        </Accordion>
                    </div>
                    {((productCategories?.nodes && productCategories.nodes.length > 0) || currentSku || (Array.isArray(metaData) && metaData.length > 0)) && (
                        <Accordion title="More Information">
                            <div className="flex flex-col gap-2">
                                {currentSku && (
                                    <p><span className="font-semibold text-gray-900">SKU:</span> {currentSku}</p>
                                )}
                                {typeof totalSales === 'number' && (
                                    <p><span className="font-semibold text-gray-900">Units Sold:</span> {totalSales}</p>
                                )}
                                {productBrand?.nodes?.[0] && (
                                    <p>
                                        <span className="font-semibold text-gray-900">Brand: </span>
                                        <Link href={`/brand/${productBrand.nodes[0].slug}`} className="text-blue-600 hover:underline">
                                            {productBrand.nodes[0].name}
                                        </Link>
                                    </p>
                                )}
                                {productLocation?.nodes?.[0] && (
                                    <p>
                                        <span className="font-semibold text-gray-900">Location: </span>
                                        <Link href={`/location/${productLocation.nodes[0].slug}`} className="text-blue-600 hover:underline">
                                            {productLocation.nodes[0].name}
                                        </Link>
                                    </p>
                                )}
                                {productCategories?.nodes && productCategories.nodes.length > 0 && (
                                    <p>
                                        <span className="font-semibold text-gray-900">Categories: </span>
                                        {productCategories.nodes.map((cat: any, index: number) => (
                                            <span key={`${cat.slug || 'cat'}-${index}`}>
                                                {index > 0 && ', '}
                                                <Link href={`/product-category/${cat.slug}`} className="text-blue-600 hover:underline">
                                                    {cat.name}
                                                </Link>
                                            </span>
                                        ))}
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


            </div> {/* Close lg:col-span-7 */}
        </div> {/* Close grid */}
        </div> {/* Close Wrapper */}


        {/* Row 4: Cross-sells - Full Width */}
        <div className="w-full px-2 md:px-4">
                {product.crossSell?.nodes && product.crossSell.nodes.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-100">
                        <h3 className="text-xl font-bold mb-4 text-gray-900">Mostly Bought Together</h3>
                        <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
                            {product.crossSell.nodes.map((crossSellProduct: any) => (
                                <div key={crossSellProduct.id} className="min-w-[160px] md:min-w-[220px] snap-start">
                                    <ProductCard
                                        {...crossSellProduct}
                                        stockQuantity={crossSellProduct.stockQuantity}
                                        reviewCount={crossSellProduct.reviewCount}
                                        productCategories={crossSellProduct.productCategories}
                                        attributes={crossSellProduct.attributes}
                                    />
                                    <div className="mt-2">
                                        <AddToCart
                                            product={crossSellProduct}
                                            fullWidth={true}
                                            quantity={1}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Row 5: Related Products Sliders */}
                <div className="mt-6 pt-6 border-t border-gray-100 space-y-6">
                    {product.upsell?.nodes && product.upsell.nodes.length > 0 && (
                        <div>
                            <h3 className="text-xl font-bold mb-4 text-gray-900">You May Also Like</h3>
                            <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
                                {product.upsell.nodes.map((upsellProduct: any) => (
                                    <div key={upsellProduct.id} className="min-w-[160px] md:min-w-[220px] snap-start">
                                        <ProductCard
                                            {...upsellProduct}
                                            stockQuantity={upsellProduct.stockQuantity}
                                            reviewCount={upsellProduct.reviewCount}
                                            productCategories={upsellProduct.productCategories}
                                            attributes={upsellProduct.attributes}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {product.related?.nodes && product.related.nodes.length > 0 && (
                        <div>
                            <h3 className="text-xl font-bold mb-4 text-gray-900">Related Products</h3>
                            <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
                                {product.related.nodes.map((relatedProduct: any) => (
                                    <div key={relatedProduct.id} className="min-w-[160px] md:min-w-[220px] snap-start">
                                        <ProductCard
                                            {...relatedProduct}
                                            stockQuantity={relatedProduct.stockQuantity}
                                            reviewCount={relatedProduct.reviewCount}
                                            productCategories={relatedProduct.productCategories}
                                            attributes={relatedProduct.attributes}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

                <style jsx>{`
            /* Ensure the horizontal carousels hide their scrollbars.
               The JSX uses the 'hide-scrollbar' class, so we target that here.
               Keep 'no-scrollbar' as an alias for any legacy usage. */
            .hide-scrollbar::-webkit-scrollbar,
            .no-scrollbar::-webkit-scrollbar {
                display: none;
            }
            .hide-scrollbar,
            .no-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
            }
            `}</style>

                {/* Logic modals ... */}
                {showWarrantyBadge && (
                    <div className="hidden">
                    </div>
                )}
                {(() => {
                    const currentSale = (isVariableProduct ? filteredVariantPrice(price, '') : salePrice) || '';
                    const currentReg = (isVariableProduct ? filteredVariantPrice(price, 'right') : regularPrice) || '';
                    const saleVal = parseFloat(currentSale.replace(/[^0-9.]/g, ''));
                    const regVal = parseFloat(currentReg.replace(/[^0-9.]/g, ''));
                    const savings = regVal - saleVal;
                    const savingsFormatted = isNaN(savings) ? '0.00' : savings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                    return (
                        <>
                            <ComparePriceModal
                                isOpen={showCompareModal}
                                onClose={() => setShowCompareModal(false)}
                                newPrice={currentReg || ''}
                                refurbPrice={currentSale || ''}
                                productName={name}
                                savings={savingsFormatted}
                            />
                            <WhatIsRefurbishedModal
                                isOpen={showWhatIsRefurbishedModal}
                                onClose={() => setShowWhatIsRefurbishedModal(false)}
                            />
                        </>
                    );
                })()}
        </section>
    );
};

export default SingleProductFinal;
