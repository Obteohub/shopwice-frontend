// Gallery - Sharp Corners (REST ONLY)
import React, { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { firstDisplayImageUrl } from '@/utils/image';

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
  firstDisplayImageUrl(img?.sourceUrl, img?.src, img?.url);

const ProductGalleryVertical: React.FC<ProductGalleryProps> = ({
  mainImage,
  galleryImages,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
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

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);

  const lightboxPrev = () => setLightboxIndex(i => (i - 1 + allImages.length) % allImages.length);
  const lightboxNext = () => setLightboxIndex(i => (i + 1) % allImages.length);

  const handleLightboxKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') lightboxPrev();
    else if (e.key === 'ArrowRight') lightboxNext();
    else if (e.key === 'Escape') closeLightbox();
  };

  return (
    <>
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
          >
            {allImages.map((img, index) => (
              <div
                key={`${img.id}-${index}`}
                className={`flex-none w-full h-full snap-center relative transition-opacity duration-300 cursor-zoom-in ${
                  index === activeIndex ? 'opacity-100' : 'opacity-90'
                }`}
                onClick={() => openLightbox(index)}
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

          {/* Expand hint on mobile */}
          <div className="absolute top-2 right-2 z-10 md:hidden pointer-events-none">
            <div className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-1">
              <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
              </svg>
              <span className="text-[10px] text-white font-medium">Tap to zoom</span>
            </div>
          </div>

          {/* Mobile Pagination Dots */}
          {allImages.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10 md:hidden">
              {allImages.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
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

      {/* Lightbox Overlay */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
          onClick={closeLightbox}
          onKeyDown={handleLightboxKey}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
          aria-label="Product image lightbox"
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            onClick={closeLightbox}
            type="button"
            aria-label="Close lightbox"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Counter */}
          {allImages.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
              {lightboxIndex + 1} / {allImages.length}
            </div>
          )}

          {/* Image */}
          <div
            className="relative h-[80vw] w-[80vw] max-h-[85vh] max-w-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={allImages[lightboxIndex]?.src ?? ''}
              alt={allImages[lightboxIndex]?.title || 'Product image'}
              fill
              sizes="85vw"
              className="object-contain"
              priority
            />
          </div>

          {/* Prev / Next */}
          {allImages.length > 1 && (
            <>
              <button
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
                type="button"
                aria-label="Previous image"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
                type="button"
                aria-label="Next image"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Thumbnail strip */}
          {allImages.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4">
              {allImages.map((img, index) => (
                <button
                  key={`lb-thumb-${index}`}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(index); }}
                  className={`relative h-12 w-12 flex-shrink-0 overflow-hidden rounded border-2 transition-all ${
                    index === lightboxIndex ? 'border-white opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
                  }`}
                  type="button"
                  aria-label={`View image ${index + 1}`}
                >
                  <Image src={img.src} alt={img.title || ''} fill sizes="48px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ProductGalleryVertical;
