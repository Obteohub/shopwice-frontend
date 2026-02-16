import { useRef } from 'react';
import Link from 'next/link';
import ProductCard from '../Product/ProductCard.component';
import { Product } from '@/types/product';

interface SpeakersProductsProps {
    products: Product[];
}

const SpeakersProducts = ({ products }: SpeakersProductsProps) => {
    const sliderRef = useRef<HTMLDivElement | null>(null);

    if (!products || products.length === 0) return null;

    const nextSlide = () => {
        const el = sliderRef.current;
        if (!el) return;
        el.scrollBy({ left: el.clientWidth, behavior: 'smooth' });
    };

    const prevSlide = () => {
        const el = sliderRef.current;
        if (!el) return;
        el.scrollBy({ left: -el.clientWidth, behavior: 'smooth' });
    };

    return (
        <div className="bg-white py-1 border-t border-gray-100">
            <div className="w-full px-2 sm:px-6 relative group">
                <div className="flex items-center justify-between mb-2 pb-2">
                    <h2 className="text-xl text-gray-900 tracking-tight">Speakers</h2>
                    <Link href="/product-category/speakers" className="text-blue-600 text-md font-bold hover:underline">
                        View All
                    </Link>
                </div>

                {/* Mobile View: Horizontal Scroll */}
                <div className="md:hidden flex overflow-x-auto snap-x snap-mandatory gap-1 pb-4 no-scrollbar">
                    {products.map((product, index) => (
                        <div key={`mob-speakers-${product.databaseId || index}`} className="snap-start shrink-0 w-[40vw]">
                            <ProductCard
                                databaseId={product.databaseId}
                                name={product.name}
                                price={product.price}
                                regularPrice={product.regularPrice}
                                salePrice={product.salePrice}
                                onSale={product.onSale}
                                slug={product.slug}
                                image={product.image}
                                averageRating={product.averageRating}
                                reviewCount={product.reviewCount}
                                productCategories={product.productCategories}
                                attributes={product.attributes}
                                stockQuantity={product.stockQuantity}
                            />
                        </div>
                    ))}
                </div>

                {/* Desktop View: Carousel */}
                <div className="hidden md:block relative min-h-[400px]">
                    <div
                        ref={sliderRef}
                        className="flex gap-2 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar"
                    >
                        {products.map((product, index) => (
                            <div
                                key={`desk-speakers-${product.databaseId || index}`}
                                className="snap-start shrink-0 w-[42%] sm:w-[28%] md:w-[22%] lg:w-[12.5%] px-2"
                            >
                                <ProductCard
                                    databaseId={product.databaseId}
                                    name={product.name}
                                    price={product.price}
                                    regularPrice={product.regularPrice}
                                    salePrice={product.salePrice}
                                    onSale={product.onSale}
                                    slug={product.slug}
                                    image={product.image}
                                    averageRating={product.averageRating}
                                    reviewCount={product.reviewCount}
                                    productCategories={product.productCategories}
                                    attributes={product.attributes}
                                    stockQuantity={product.stockQuantity}
                                />
                            </div>
                        ))}
                    </div>
                    {/* Arrows */}
                    {products.length > 8 && (
                        <>
                            <button
                                onClick={prevSlide}
                                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white shadow-lg text-gray-800 hover:bg-gray-50 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity border border-gray-100"
                                aria-label="Previous Products"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                </svg>
                            </button>
                            <button
                                onClick={nextSlide}
                                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white shadow-lg text-gray-800 hover:bg-gray-50 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity border border-gray-100"
                                aria-label="Next Products"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SpeakersProducts;
