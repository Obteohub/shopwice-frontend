import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import ProductCard from '../Product/ProductCard.component';
import { Product } from '@/types/product';

interface BestSellingSliderProps {
    products: Product[];
}

const BestSellingSlider = ({ products }: BestSellingSliderProps) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [slidesPerView, setSlidesPerView] = useState(1);

    // ---------- Responsive Slides ----------
    useEffect(() => {
        const updateSlides = () => {
            if (window.innerWidth >= 1024) setSlidesPerView(8);
            else if (window.innerWidth >= 768) setSlidesPerView(5);
            else setSlidesPerView(2);
        };

        let resizeTimeout: NodeJS.Timeout;

        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(updateSlides, 150);
        };

        updateSlides();
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ---------- Prevent invalid index ----------
    useEffect(() => {
        const maxIndex = Math.max(0, products.length - slidesPerView);
        if (currentIndex > maxIndex) setCurrentIndex(0);
    }, [slidesPerView, products.length]);

    const safeProducts = products || [];
    const maxIndex = Math.max(0, safeProducts.length - slidesPerView);

    const nextSlide = () =>
        setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));

    const prevSlide = () =>
        setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));

    // ---------- Memoized styles ----------
    // Refactored to use CSS variables and Tailwind classes to avoid inline style warnings

    if (!safeProducts.length) return null;

    return (
        <div className="bg-white py-1 border-t border-gray-100">
            <div className="w-full px-4 sm:px-6 relative group">

                {/* Header */}
                <div className="flex items-center justify-between mb-2 pb-2">
                    <h2 className="text-xl font-medium text-gray-900">
                        Best Selling Products
                    </h2>

                    <Link
                        href="/products?orderby=popularity"
                        className="text-[#0C6DC9] font-bold text-sm hover:underline"
                    >
                        View All
                    </Link>
                </div>

                {/* ---------- MOBILE SCROLL ---------- */}
                <div className="md:hidden flex overflow-x-auto snap-x snap-mandatory gap-2 pb-4 no-scrollbar">
                    {products.map((product, index) => (
                        <div
                            key={product.databaseId ?? index}
                            className="snap-start shrink-0 w-[42vw]"
                        >
                            <ProductCard {...product} />
                        </div>
                    ))}
                </div>

                {/* ---------- DESKTOP SLIDER ---------- */}
                <div className="hidden md:block overflow-hidden relative min-h-[400px]">

                    <div
                        className="flex w-full transition-transform duration-500 ease-out [transform:var(--slide-transform)]"
                        style={{
                            '--slide-transform': `translateX(-${(currentIndex * 100) / slidesPerView}%)`,
                        } as React.CSSProperties}
                    >
                        {products.map((product, index) => (
                            <div
                                key={product.databaseId ?? index}
                                className="px-2 shrink-0 w-1/2 md:w-1/5 lg:w-[12.5%]"
                            >
                                <ProductCard {...product} />
                            </div>
                        ))}
                    </div>

                    {/* ---------- ARROWS ---------- */}
                    {products.length > slidesPerView && (
                        <>
                            <button
                                onClick={prevSlide}
                                aria-label="Previous Products"
                                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition"
                            >
                                ◀
                            </button>

                            <button
                                onClick={nextSlide}
                                aria-label="Next Products"
                                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition"
                            >
                                ▶
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BestSellingSlider;
