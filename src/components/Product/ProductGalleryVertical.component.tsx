// Gallery - Sharp Corners
import React, { useState, useRef } from 'react';

interface GalleryImage {
    id: string;
    sourceUrl: string;
    title?: string;
}

interface ProductGalleryProps {
    mainImage?: {
        sourceUrl: string;
        title?: string;
    };
    galleryImages?: {
        nodes: GalleryImage[];
    };
}

const ProductGalleryVertical: React.FC<ProductGalleryProps> = ({ mainImage, galleryImages }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Combine main image and gallery images
    const allImages = [];
    if (mainImage?.sourceUrl) {
        allImages.push({
            id: 'main',
            sourceUrl: mainImage.sourceUrl,
            title: mainImage.title || 'Product Image'
        });
    }

    if (galleryImages?.nodes) {
        const validGalleryImages = galleryImages.nodes.filter((img) => !!img?.sourceUrl);
        allImages.push(...validGalleryImages);
    }

    if (allImages.length === 0) return null;

    const scrollToImage = (index: number) => {
        setActiveIndex(index);
        if (scrollContainerRef.current) {
            const width = scrollContainerRef.current.offsetWidth;
            scrollContainerRef.current.scrollTo({
                left: index * width,
                behavior: 'smooth'
            });
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const width = e.currentTarget.offsetWidth;
        const index = Math.round(e.currentTarget.scrollLeft / width);
        setActiveIndex(index);
    };

    return (
        <div className="flex flex-col-reverse md:flex-row gap-4 w-full">
            {/* Desktop Vertical Thumbnails */}
            {allImages.length > 1 && (
                <div className="hidden md:flex flex-col gap-3 h-[400px] lg:h-[500px] overflow-y-auto no-scrollbar w-[80px] flex-shrink-0">
                    {allImages.map((img, index) => (
                        <div
                            key={`thumb-${index}`}
                            onMouseEnter={() => scrollToImage(index)}
                            onClick={() => scrollToImage(index)}
                            className={`relative w-full aspect-square cursor-pointer overflow-hidden transition-all duration-200 ${activeIndex === index ? 'ring-2 ring-blue-600 ring-inset opacity-100' : 'opacity-50 hover:opacity-100'
                                }`}
                        >
                            <img
                                src={img.sourceUrl}
                                alt={`Thumbnail ${index + 1}`}
                                loading="lazy"
                                decoding="async"
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Main Swipeable Container */}
            <div className="relative flex-1 w-full">
                <div
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide aspect-square md:h-[400px] lg:h-[500px] md:aspect-auto bg-gray-100"
                    onScroll={handleScroll}
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {allImages.map((img, index) => (
                        <div key={`${img.id}-${index}`} className="flex-none w-full h-full snap-center relative">
                            <img
                                src={img.sourceUrl}
                                alt={img.title || 'Product image'}
                                loading={index === 0 ? 'eager' : 'lazy'}
                                decoding="async"
                                className="absolute inset-0 w-full h-full object-contain bg-white"
                            />
                        </div>
                    ))}
                </div>

                {/* Mobile Pagination Dots */}
                {allImages.length > 1 && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10 md:hidden">
                        {allImages.map((_, index) => (
                            <button
                                key={index}
                                onClick={(e) => {
                                    e.preventDefault();
                                    scrollToImage(index);
                                }}
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${index === activeIndex ? 'bg-black w-4' : 'bg-gray-300'
                                    }`}
                                aria-label={`Go to image ${index + 1}`}
                            />
                        ))}
                    </div>
                )}
            </div>
            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default ProductGalleryVertical;
