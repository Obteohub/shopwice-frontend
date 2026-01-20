// Imports
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Utils
import { filteredVariantPrice, paddedPrice } from '@/utils/functions/functions';

// Components
import AddToCart, { IProductRootObject } from './AddToCart.component';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner.component';
import Breadcrumbs from '@/components/UI/Breadcrumbs.component';
import StarRating from '@/components/UI/StarRating.component';
import ProductGallery from './ProductGallery.component';
import ProductCard from './ProductCard.component';
import Accordion from '../UI/Accordion.component';
import DOMPurify from 'isomorphic-dompurify';
import DeliveryInfo from './DeliveryInfo.component';
import PaymentInfo from './PaymentInfo.component';
import ProductLocationDisplay from './ProductLocationDisplay.component';
import ProductActions from './ProductActions.component';

// Dynamic Imports for Performance
const ProductReviews = dynamic(() => import('./ProductReviews.component'), {
  loading: () => <p className="p-4 text-center text-gray-500">Loading reviews...</p>
});
const ComparePriceModal = dynamic(() => import('./ComparePriceModal.component'), { ssr: false });
const WhatIsRefurbishedModal = dynamic(() => import('./WhatIsRefurbishedModal.component'), { ssr: false });

import QuantityControl from '@/components/Cart/QuantityControl.component';

const SingleProduct = ({ product }: IProductRootObject) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedVariation, setSelectedVariation] = useState<number>();
  const [quantity, setQuantity] = useState<number>(1);
  const [isShortDescriptionExpanded, setIsShortDescriptionExpanded] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showWhatIsRefurbishedModal, setShowWhatIsRefurbishedModal] = useState(false);
  const reviewsRef = useRef<HTMLDivElement>(null);

  const placeholderFallBack = 'https://via.placeholder.com/600';



  useEffect(() => {
    setIsLoading(false);
    if (product.variations && product.variations.nodes && product.variations.nodes.length > 0) {
      const firstVariant = product.variations.nodes[0].databaseId;
      setSelectedVariation(firstVariant);
    }
  }, [product.variations]);

  let { description, shortDescription, image, name, onSale, price, regularPrice, salePrice, productCategories, productBrand, averageRating, reviewCount, galleryImages, reviews, attributes, sku, stockStatus, stockQuantity } =
    product;

  useEffect(() => {
    console.log('Product Data:', product);
    console.log('Related:', product.related);
    console.log('Upsell:', product.upsell);
    console.log('CrossSell:', product.crossSell);
  }, [product]);

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



  // Check if product is in "Mobile Phones" category
  const isMobilePhone = productCategories?.nodes?.some(
    (cat) => cat.name.toLowerCase() === 'mobile phones' || cat.slug === 'mobile-phones'
  );

  // Check if product has ANY attribute with an option containing "Refurbish"
  const isRefurbished = attributes?.nodes?.some(
    (attr) => attr.options?.some((opt) => opt.toLowerCase().includes('refurbish'))
  );

  const showRefurbishedBadge = isMobilePhone && isRefurbished;
  const showWarrantyBadge = isMobilePhone && isRefurbished;

  const scrollToReviews = () => {
    reviewsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getStockStatusColor = (status: string | undefined, quantity: number) => {
    if (status === 'OUT_OF_STOCK') return 'text-red-600 bg-red-50 border-red-100';
    if (status === 'ON_BACKORDER') return 'text-orange-600 bg-orange-50 border-orange-100';
    return 'text-green-700 bg-green-50 border-green-100';
  };

  const selectedVariationNode = product.variations?.nodes.find(
    (node) => node.databaseId === selectedVariation,
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

  const currentFormattedStockStatus = currentStockStatus?.replace(/_/g, ' ').toLowerCase();

  return (
    <section className="bg-white mb-[8rem] md:mb-12">
      {isLoading ? (
        <div className="h-56 mt-20">
          <p className="text-xl font-bold text-center">Loading product...</p>
          <br />
          <LoadingSpinner />
        </div>
      ) : (
        <div className="w-full md:container md:mx-auto md:px-4 py-0 md:py-2 max-w-3xl md:max-w-5xl lg:max-w-6xl">
          {/* Top Row: Breadcrumbs & Header Info */}
          <div className="px-4 md:px-0">
            <Breadcrumbs categories={productCategories} productName={name} />

            {/* Second Row: Ratings & Brand */}
            <div className="flex justify-between items-center mb-1">
              <div
                className="flex items-center gap-2 cursor-pointer hover:opacity-75 transition-opacity"
                onClick={scrollToReviews}
              >
                <StarRating rating={averageRating || 0} size={16} />
                <span className="text-sm text-gray-500 font-medium">
                  {reviewCount || 0} Reviews
                </span>
              </div>
              {productBrand?.nodes?.[0] && (
                <Link href={`/brand/${productBrand.nodes[0].slug}`} className="text-sm font-semibold text-blue-600 hover:underline hover:text-blue-800 transition-colors uppercase tracking-wide">
                  {productBrand.nodes[0].name}
                </Link>
              )}
            </div>

            {/* Third Row: Product Title */}
            <h1 className="text-[19px] font-medium text-gray-900 leading-tight">
              {name}
            </h1>
            {showRefurbishedBadge && (
              <div className="flex items-center gap-2 mb-3 mt-1">
                <p className="text-sm text-green-700 font-medium whitespace-nowrap">Refurbished - Excellent Condition</p>
              </div>
            )}
          </div>

          {/* Fourth Row: Gallery */}
          <div className="mb-4 relative group">
            <ProductGallery mainImage={image} galleryImages={galleryImages} />
            <div className="absolute bottom-4 right-4 z-10">
              <ProductActions productName={name} productUrl={`/product/${product.slug}`} productId={product.databaseId} />
            </div>
          </div>

          {/* Fifth Row: Action Cards Section */}
          <div className="bg-gray-50 rounded-none md:rounded-xl p-4 mb-4 border-y md:border border-gray-100 shadow-sm mx-0">
            <div className="flex flex-col gap-3">
              {/* Price and Stock */}
              <div className="flex justify-between items-start">
                <div>
                  {onSale ? (
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex flex-row items-end gap-4">
                        <div className="flex flex-col">
                          {isRefurbished && (
                            <span className="text-[10px] uppercase font-extrabold text-blue-700 mb-0.5">Refurbished Price</span>
                          )}
                          <p className="text-2xl font-bold text-gray-900 leading-none">
                            {product.variations
                              ? filteredVariantPrice(price, '')
                              : salePrice}
                          </p>
                        </div>
                        <div className="flex flex-col">
                          {isRefurbished && (
                            <span className="text-[10px] uppercase font-extrabold text-gray-400 mb-0.5">Brand New Price</span>
                          )}
                          <p className="text-lg text-gray-500 line-through leading-none">
                            {product.variations
                              ? filteredVariantPrice(price, 'right')
                              : regularPrice}
                          </p>
                        </div>
                      </div>
                      {(() => {
                        const currentSale = product.variations ? filteredVariantPrice(price, '') : salePrice;
                        const currentReg = product.variations ? filteredVariantPrice(price, 'right') : regularPrice;

                        if (currentSale && currentReg) {
                          const saleVal = parseFloat(currentSale.replace(/[^0-9.]/g, ''));
                          const regVal = parseFloat(currentReg.replace(/[^0-9.]/g, ''));

                          if (!isNaN(saleVal) && !isNaN(regVal) && regVal > saleVal) {
                            const savings = regVal - saleVal;
                            const savingsFormatted = savings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            return (
                              <p className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-md inline-block mt-1">
                                You Save: GH₵{savingsFormatted}
                              </p>
                            );
                          }
                        }
                        return null;
                      })()}
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-gray-900">{price}</p>
                  )}

                  {isRefurbished && (
                    <div className="mt-4 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span className="font-medium">6 months warranty included</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span className="font-medium">100% performance. Battery is always 100</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span className="font-medium">Fresh in Box</span>
                      </div>
                    </div>
                  )}

                  {isRefurbished && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                          </svg>
                          What's in the Box
                        </h4>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          Fresh in Box
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { name: 'Device', icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z' },
                          { name: 'User Manual', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                          { name: 'Charging Cable', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                          { name: 'SIM Ejector', icon: 'M15 7a2 2 0 012 2m-2 4a2 2 0 012 2m-8-3a2 2 0 012-2m-2 4a2 2 0 012 2' }
                        ].map((item) => (
                          <div key={item.name} className="flex items-center gap-1.5 text-[12px] text-gray-600 font-medium bg-gray-50/50 p-1 rounded-lg border border-gray-100/50">
                            <div className="p-1 bg-white rounded shadow-sm shrink-0 border border-gray-100">
                              <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon}></path>
                              </svg>
                            </div>
                            {item.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stock Status Badge */}
                  <div className="mt-2 flex flex-col gap-2">
                    {(() => {
                      const showEmergencyStock = isRefurbished && currentStockQuantity !== undefined && currentStockQuantity !== null && currentStockQuantity > 0 && currentStockQuantity < 5;

                      return (
                        <>
                          <div className="flex items-center gap-3">
                            {!showEmergencyStock && (
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStockStatusColor(currentStockStatus, currentStockQuantity || 0)} capitalized`}
                              >
                                {currentStockQuantity ? `${currentStockQuantity} in stock` : (currentFormattedStockStatus || 'In Stock')}
                              </span>
                            )}
                            {currentSku && (
                              <span className="text-xs text-gray-500 font-mono">
                                SKU: {currentSku}
                              </span>
                            )}
                          </div>

                          {/* Stock Warning - Only for Refurbished */}
                          {showEmergencyStock && (
                            <div className="text-red-600 text-xs font-bold animate-pulse">
                              Only {currentStockQuantity} left in stock!
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {showWarrantyBadge && (
                      <div className="flex items-center gap-3 mt-1">
                        <button
                          onClick={() => setShowCompareModal(true)}
                          className="text-xs text-blue-600 underline hover:text-blue-800 transition-colors"
                        >
                          Compare vs New
                        </button>
                        <div className="w-px h-3 bg-gray-300"></div>
                        <button
                          onClick={() => setShowWhatIsRefurbishedModal(true)}
                          className="text-xs text-gray-500 underline hover:text-gray-700 transition-colors flex items-center gap-1"
                        >
                          What is refurbished?
                        </button>
                      </div>
                    )}

                    {/* Compare modal render */}
                    {(() => {
                      const currentSale = product.variations ? filteredVariantPrice(price, '') : salePrice;
                      const currentReg = product.variations ? filteredVariantPrice(price, 'right') : regularPrice;
                      const saleVal = parseFloat((currentSale || '').replace(/[^0-9.]/g, ''));
                      const regVal = parseFloat((currentReg || '').replace(/[^0-9.]/g, ''));
                      const savings = regVal - saleVal;
                      const savingsFormatted = savings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
                  </div>
                </div>

                {/* Valuation / Rating Badge (Optional visual reinforcement) */}
                {averageRating && averageRating > 4 && (
                  <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                    Top Rated
                  </div>
                )}
              </div>



              {/* Short Description with Read More */}
              {shortDescription && (
                <div className="mb-4">
                  <div
                    className={`text-gray-600 text-xs leading-relaxed ${!isShortDescriptionExpanded ? 'line-clamp-3' : ''}`}
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

              <style jsx>{`
                .no-scrollbar::-webkit-scrollbar {
                  display: none;
                }
                .no-scrollbar {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
              `}</style>

              {/* Variations & Add to Cart */}
              <div className="pt-1">
                <DeliveryInfo />
                <PaymentInfo />
                <ProductLocationDisplay />
                {/* ProductActions moved to Image Gallery Overlay */}

                {product.variations && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Select Option
                    </label>
                    <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar scroll-smooth">
                      {product.variations.nodes.map(
                        ({ id, name, databaseId, stockQuantity, stockStatus }) => {
                          const isOutOfStock = stockStatus === 'OUT_OF_STOCK' || (stockQuantity !== null && stockQuantity === 0);
                          const isSelected = selectedVariation === databaseId;
                          const variantName = name.split('- ').pop();

                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => !isOutOfStock && setSelectedVariation(databaseId)}
                              disabled={isOutOfStock}
                              className={`
                                flex-shrink-0 min-w-fit px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all
                                ${isSelected && !isOutOfStock
                                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                                  : isOutOfStock
                                    ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                                }
                              `}
                            >
                              <div className={isOutOfStock ? 'line-through' : ''}>
                                {variantName}
                              </div>
                              <div className="text-[10px] mt-0.5 font-normal">
                                {isOutOfStock
                                  ? 'Out of Stock'
                                  : stockQuantity !== null
                                    ? `${stockQuantity} in stock`
                                    : 'In Stock'
                                }
                              </div>
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700">Quantity</label>
                    <div className="w-32">
                      <QuantityControl
                        quantity={quantity}
                        onIncrease={() => setQuantity(prev => prev + 1)}
                        onDecrease={() => setQuantity(prev => Math.max(1, prev - 1))}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {product.variations ? (
                    <>
                      <AddToCart
                        product={product}
                        variationId={selectedVariation}
                        fullWidth={true}
                        quantity={quantity}
                      />
                      <AddToCart
                        product={product}
                        variationId={selectedVariation}
                        fullWidth={true}
                        buyNow={true}
                        quantity={quantity}
                      />
                    </>
                  ) : (
                    <>
                      <AddToCart product={product} fullWidth={true} quantity={quantity} />
                      <AddToCart product={product} fullWidth={true} buyNow={true} quantity={quantity} />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>


          {/* Product Information Accordions */}
          <div className="mb-6 px-4 md:px-0">
            {/* Full Description */}
            {description && (
              <Accordion title="Product Details" defaultOpen={false}>
                <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: description }} />
              </Accordion>
            )}

            {/* Specifications */}
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

            {/* Reviews */}
            <div ref={reviewsRef} className="scroll-mt-24">
              <Accordion title={`Reviews (${reviewCount || 0})`}>
                <ProductReviews reviews={reviews?.nodes || []} />
              </Accordion>
            </div>

            {/* Categories & Meta */}
            {((productCategories?.nodes && productCategories.nodes.length > 0) || sku) && (
              <Accordion title="More Information">
                <div className="flex flex-col gap-2">
                  {sku && (
                    <p><span className="font-semibold text-gray-900">SKU:</span> {sku}</p>
                  )}
                  {productCategories?.nodes && productCategories.nodes.length > 0 && (
                    <p>
                      <span className="font-semibold text-gray-900">Categories: </span>
                      {productCategories.nodes.map((cat, index) => (
                        <span key={cat.slug}>
                          {index > 0 && ', '}
                          <Link href={`/product-category/${cat.slug}`} className="text-blue-600 hover:underline">
                            {cat.name}
                          </Link>
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              </Accordion>
            )}

            {/* Short Description relocated under accordions */}

          </div>

          {/* Related Products */}
          {product.related?.nodes && product.related.nodes.length > 0 && (
            <div className="mb-6 border-t border-gray-100 pt-6">
              <h3 className="text-xl font-bold mb-4 text-gray-900 px-4 md:px-0">Related Products</h3>
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x hide-scrollbar px-4 md:px-0">
                {product.related.nodes.map((relatedProduct) => (
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

          {/* Upsell Products */}
          {product.upsell?.nodes && product.upsell.nodes.length > 0 && (
            <div className="mb-6 border-t border-gray-100 pt-6">
              <h3 className="text-xl font-bold mb-4 text-gray-900 px-4 md:px-0">You May Also Like</h3>
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x hide-scrollbar px-4 md:px-0">
                {product.upsell.nodes.map((upsellProduct) => (
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

          {/* Cross-Sell Products */}
          {product.crossSell?.nodes && product.crossSell.nodes.length > 0 && (
            <div className="mb-6 border-t border-gray-100 pt-6">
              <h3 className="text-xl font-bold mb-4 text-gray-900 px-4 md:px-0">Mostly Bought Together</h3>
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x hide-scrollbar px-4 md:px-0">
                {product.crossSell.nodes.map((crossSellProduct) => (
                  <div key={crossSellProduct.id} className="min-w-[160px] md:min-w-[220px] snap-start">
                    <ProductCard
                      {...crossSellProduct}
                      stockQuantity={crossSellProduct.stockQuantity}
                      reviewCount={crossSellProduct.reviewCount}
                      productCategories={crossSellProduct.productCategories}
                      attributes={crossSellProduct.attributes}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )
      }
    </section >
  );
};

export default SingleProduct;
