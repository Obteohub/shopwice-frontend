import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProductCard from '../Product/ProductCard.component';
import { Product } from '@/types/product';
import { useIsMounted } from '@/hooks/useIsMounted';

interface TopRatedProductsProps {
  products: Product[];
}

const TopRatedProducts = ({ products }: TopRatedProductsProps) => {
  const isMounted = useIsMounted();
  const [slidesPerView, setSlidesPerView] = useState(2.5);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!isMounted) return;

    // Determine slidesPerView based on window width
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSlidesPerView(6);
      } else if (window.innerWidth >= 768) {
        setSlidesPerView(5);
      } else {
        setSlidesPerView(2.5);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMounted]);

  if (!products || products.length === 0) return null;

  const nextSlide = () => {
    const maxIndex = Math.max(0, products.length - slidesPerView);
    setCurrentIndex((prev) => (prev + 1 > maxIndex ? 0 : prev + 1));
  };

  const prevSlide = () => {
    const maxIndex = Math.max(0, products.length - slidesPerView);
    setCurrentIndex((prev) => (prev - 1 < 0 ? maxIndex : prev - 1));
  };

  return (
    <div className="bg-white py-1 border-t border-gray-100">
      <div className="w-full px-2 sm:px-6 relative group">
        <div className="flex items-center justify-between mb-1 pb-1">
          <h2 className="text-xl text-gray-900 tracking-tight">Top Rated Products</h2>
          <Link href="/products?orderby=rating" className="text-blue-600 text-md font-bold hover:underline">
            View All
          </Link>
        </div>

        {/* Mobile View: Horizontal Scroll */}
        <div className="md:hidden flex overflow-x-auto snap-x snap-mandatory gap-1 pb-4 no-scrollbar">
          {products.map((product, index) => (
            <div key={`mob-top-${product.databaseId || index}`} className="snap-start shrink-0 w-[40vw]">
              <ProductCard
                id={product.databaseId}
                name={product.name}
                price={product.price}
                regularPrice={product.regularPrice}
                salePrice={product.salePrice}
                onSale={product.onSale}
                slug={product.slug}
                image={product.image}
                averageRating={product.averageRating}
                reviewCount={product.reviewCount}
                attributes={product.attributes}
                stockQuantity={product.stockQuantity}
              />
            </div>
          ))}
        </div>

        {/* Desktop View: Carousel */}
        <div className="hidden md:block overflow-hidden relative min-h-[360px]">
          {isMounted && (
            <>
              <div
                className="flex transition-transform duration-500 ease-out [transform:var(--slide-transform)] [width:var(--slide-width)]"
                style={{
                  '--slide-transform': `translateX(-${currentIndex * (100 / slidesPerView)}%)`,
                  '--slide-width': `${(products.length / slidesPerView) * 100}%`
                } as React.CSSProperties}
              >
                {products.map((product, index) => (
                  <div
                    key={`desk-top-${product.databaseId || index}`}
                    className="px-1 [width:var(--item-width)]"
                    style={{
                      '--item-width': `${100 / products.length}%`,
                    } as React.CSSProperties}
                  >
                    <ProductCard
                      id={product.databaseId}
                      name={product.name}
                      price={product.price}
                      regularPrice={product.regularPrice}
                      salePrice={product.salePrice}
                      onSale={product.onSale}
                      slug={product.slug}
                      image={product.image}
                      averageRating={product.averageRating}
                      reviewCount={product.reviewCount}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopRatedProducts;
