
import React from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner.component';

interface PromoBoxesProps {
    promoProduct?: any;
}

const PromoBoxes = ({ promoProduct }: PromoBoxesProps) => {

    const formatPrice = (price: string) => {
        if (!price) return '';
        // If price comes with symbol, return as is, or format it
        return price;
    };

    return (
        <section className="py-12 bg-white">
            <div className="w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                    {/* Box 1: Large Featured (Flash Sale Style) */}
                    <div className="bg-[#EEEBFD] p-6 rounded-none border border-gray-100 flex flex-col justify-between relative overflow-hidden group">
                        {promoProduct ? (
                            <>
                                <div>
                                    <span className="bg-[#EE7E02] text-white text-[10px] font-bold px-2 py-1 rounded-sm uppercase mb-4 inline-block">
                                        Flash Sale
                                    </span>
                                    <h3 className="text-xl font-extrabold text-[#2c3338] mb-2 leading-tight line-clamp-2">
                                        {promoProduct.name}
                                    </h3>
                                    {/* Ratings */}
                                    <div className="flex items-center gap-1 mb-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <svg key={star} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                                                className={`w-4 h-4 ${star <= Math.round(promoProduct.averageRating || 0) ? 'text-yellow-400' : 'text-gray-300'}`}>
                                                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                                            </svg>
                                        ))}
                                        <span className="text-xs text-gray-500 ml-1">({promoProduct.reviewCount || 0} Reviews)</span>
                                    </div>
                                </div>
                                <div className="relative h-48 mt-4 -mx-6">
                                    <img
                                        src={promoProduct.image?.sourceUrl || "https://cdn.shopwice.com/2025/03/xbox-game-pad-robot-white-_result.webp"}
                                        alt={promoProduct.name}
                                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                    />
                                </div>
                                <div className="mt-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[#0C6DC9] font-bold text-lg">{formatPrice(promoProduct.salePrice || promoProduct.price)}</span>
                                        {promoProduct.regularPrice && (
                                            <span className="text-gray-400 text-sm line-through">{formatPrice(promoProduct.regularPrice)}</span>
                                        )}
                                    </div>
                                    {promoProduct.slug ? (
                                        <Link href={`/product/${promoProduct.slug}`} className="text-[#F07F02] font-bold text-sm uppercase flex items-center gap-1 hover:gap-2 transition-all">
                                            Shop Now <span>&rarr;</span>
                                        </Link>
                                    ) : (
                                        <span className="text-gray-400 font-bold text-sm uppercase flex items-center gap-1 cursor-not-allowed">
                                            Shop Now <span>&rarr;</span>
                                        </span>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <LoadingSpinner color="orange" />
                            </div>
                        )}
                    </div>

                    {/* Box 2: iPhone 2x2 Grid */}
                    <div className="bg-white p-6 rounded-none border border-gray-100 flex flex-col justify-between group overflow-hidden">
                        <h3 className="text-lg font-extrabold text-[#2c3338] mb-4">Apple iPhone <br /> Shop</h3>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="aspect-square bg-gray-50 rounded-full overflow-hidden p-2 border border-gray-100 hover:border-[#0C6DC9] transition-colors">
                                    <img
                                        src={`https://cdn.shopwice.com/2025/01/apple-iphone.webp`}
                                        alt="iPhone"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            ))}
                        </div>
                        <Link href="/product-category/mobile-phones" className="text-[#0C6DC9] font-bold text-sm uppercase">Shop All &rarr;</Link>
                    </div>

                    {/* Box 3: Electronics 2x2 Grid */}
                    <div className="bg-white p-6 rounded-none border border-gray-100 flex flex-col justify-between group overflow-hidden">
                        <h3 className="text-lg font-extrabold text-[#2c3338] mb-4">Household <br /> Essentials</h3>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {[
                                'https://cdn.shopwice.com/2024/02/westpoint-wasing-machine-t.webp',
                                'https://cdn.shopwice.com/2024/04/simple-computer-laptop-isolated-png.webp',
                                'https://cdn.shopwice.com/2024/02/westpoint-wasing-machine-t.webp',
                                'https://cdn.shopwice.com/2024/04/simple-computer-laptop-isolated-png.webp'
                            ].map((src, i) => (
                                <div key={i} className="aspect-square bg-gray-50 rounded-full overflow-hidden p-2 border border-gray-100 hover:border-[#0C6DC9] transition-colors">
                                    <img
                                        src={src}
                                        alt="Product"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            ))}
                        </div>
                        <Link href="/product-category/electronics" className="text-[#0C6DC9] font-bold text-sm uppercase">Shop All &rarr;</Link>
                    </div>

                    {/* Box 4: Lifestyle/Sneakers */}
                    <div className="bg-[#EEEBFD] p-6 rounded-none border border-gray-100 flex flex-col justify-between group overflow-hidden">
                        <div>
                            <h3 className="text-lg font-extrabold text-[#2c3338] mb-2">Trendy <br /> Sneakers</h3>
                            <p className="text-[#EE7E02] font-bold text-sm">New Collection Arrival</p>
                        </div>
                        <div className="relative h-40 my-4">
                            <img
                                src="https://cdn.shopwice.com/2025/04/trendy-sneaker-image-shopwice-ghana_result.avif"
                                alt="Sneakers"
                                className="w-full h-full object-contain group-hover:rotate-12 transition-transform duration-500"
                            />
                        </div>
                        <Link href="/product-category/shoes" className="text-[#F07F02] font-bold text-sm uppercase">View All &rarr;</Link>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default PromoBoxes;
