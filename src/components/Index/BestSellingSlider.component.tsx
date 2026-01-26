import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProductCard from '../Product/ProductCard.component';
import { Product } from '@/types/product';

interface BestSellingSliderProps {
    products: Product[];
}

const BestSellingSlider = ({ products }: BestSellingSliderProps) => {
    const [mounted, setMounted] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [slidesPerView, setSlidesPerView] = useState(1);

    useEffect(() => {
        setMounted(true);
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setSlidesPerView(8);
            } else if (window.innerWidth >= 768) {
                setSlidesPerView(5);
            } else {
                setSlidesPerView(2.5); // Mobile uses native scroll
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!products || products.length === 0) return null;

    const nextSlide = () => {
        // Ensure we don't scroll past empty space
        const maxIndex = Math.max(0, products.length - slidesPerView);
        setCurrentIndex((prev) => (prev + 1 > maxIndex ? 0 : prev + 1));
    };

    const prevSlide = () => {
        const maxIndex = Math.max(0, products.length - slidesPerView);
        setCurrentIndex((prev) => (prev - 1 < 0 ? maxIndex : prev - 1));
    };

    return (
        <div className="bg-white py-1 border-t border-gray-100">
            <div className="w-full px-4 sm:px-6 relative group">
                <div className="flex items-center justify-between mb-2 pb-2">
                    <h2 className="text-xl font-medium text-gray-900 tracking-tight">Best Selling Products</h2>
                    <Link href="/products?orderby=popularity" className="text-[#0C6DC9] font-bold text-sm hover:underline">
                        View All
                    </Link>
                </div>

                {/* Mobile View: Horizontal Scroll */}
                <div className="md:hidden flex overflow-x-auto snap-x snap-mandatory gap-1 pb-4 no-scrollbar">
                    {products.map((product) => (
                        <div key={`mob-best-${product.databaseId}`} className="snap-start shrink-0" style={{ width: '40vw' }}>
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
                <div className="hidden md:block overflow-hidden relative min-h-[400px]">
                    <div
                        className="flex transition-transform duration-500 ease-out"
                        style={{
                            transform: mounted ? `translateX(-${currentIndex * (100 / slidesPerView)}%)` : 'translateX(0%)',
                            // Width needs to accomodate all items based on slidesPerView
                            width: mounted ? `${(products.length / slidesPerView) * 100}%` : '100%'
                        }}
                    >
                        {products.map((product) => (
                            <div
                                key={`desk-best-${product.databaseId}`}
                                className="px-2"
                                style={{
                                    width: mounted ? `${100 / products.length}%` : '100%', // Percentage relative to the CONTAINER width
                                }}
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
                    {products.length > slidesPerView && (
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

export default BestSellingSlider;
