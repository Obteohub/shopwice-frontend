// Gallery - Sharp Corners (REST ONLY)
import React, { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { firstValidImageUrl } from '@/utils/image';

type AnyImage = {
  id?: string | number;
  src?: string | null;
  url?: string | null;
  sourceUrl?: string | null; // allow legacy
  title?: string | null;
  alt?: string | null;
  altText?: string | null;
};

interface ProductGalleryProps {
  mainImage?: AnyImage | null;

  // REST: array (preferred)
  galleryImages?: AnyImage[] | null;
}

const getSrc = (img?: AnyImage | null) =>
  firstValidImageUrl(img?.sourceUrl, img?.src, img?.url);

const ProductGalleryVertical: React.FC<ProductGalleryProps> = ({
  mainImage,
  galleryImages,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const allImages = useMemo(() => {
    const rawImages: Array<{ id: string; src: string; title?: string }> = [];

    const mainSrc = getSrc(mainImage);
    if (mainSrc) {
      rawImages.push({
        id: String(mainImage?.id ?? 'main'),
        src: mainSrc,
        title: String(mainImage?.title ?? 'Product Image'),
      });
    }

    const restImages = Array.isArray(galleryImages) ? galleryImages : [];
    restImages.forEach((img, index) => {
      const src = getSrc(img);
      if (!src) return;
      rawImages.push({
        id: String(img?.id ?? `gallery-${index}`),
        src,
        title: String(img?.title ?? ''),
      });
    });

    const seen = new Set<string>();
    return rawImages.filter((img) => {
      if (!img.src) return false;
      if (seen.has(img.src)) return false;
      seen.add(img.src);
      return true;
    });
  }, [galleryImages, mainImage]);

  if (allImages.length === 0) return null;

  const scrollToImage = (index: number) => {
    setActiveIndex(index);
    const el = scrollContainerRef.current;
    if (!el) return;

    const width = el.offsetWidth;
    el.scrollTo({
      left: index * width,
      behavior: 'smooth',
    });
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const width = e.currentTarget.offsetWidth;
    if (!width) return;

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
              key={`thumb-${img.id}-${index}`}
              onMouseEnter={() => scrollToImage(index)}
              onClick={() => scrollToImage(index)}
              className={`relative w-full aspect-square cursor-pointer overflow-hidden transition-all duration-200 ${
                activeIndex === index
                  ? 'ring-2 ring-blue-600 ring-inset opacity-100'
                  : 'opacity-50 hover:opacity-100'
              }`}
            >
              <Image
                src={img.src}
                alt={img.title || `Thumbnail ${index + 1}`}
                fill
                sizes="80px"
                loading="lazy"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Main Swipeable Container */}
      <div className="relative flex-1 w-full group">
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide aspect-square md:h-[400px] lg:h-[500px] md:aspect-auto bg-gray-100"
          onScroll={handleScroll}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' as any }}
        >
          {allImages.map((img, index) => (
            <div
              key={`${img.id}-${index}`}
              className={`flex-none w-full h-full snap-center relative transition-opacity duration-300 ${
                index === activeIndex ? 'opacity-100' : 'opacity-90'
              }`}
            >
              <Image
                src={img.src}
                alt={img.title || 'Product image'}
                fill
                priority={index === 0}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                loading={index === 0 ? 'eager' : 'lazy'}
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 45vw, 36vw"
                className="object-contain bg-white transition-transform duration-500 ease-out md:group-hover:scale-110"
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
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === activeIndex ? 'bg-black w-4' : 'bg-gray-300'
                }`}
                aria-label={`Go to image ${index + 1}`}
                type="button"
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
