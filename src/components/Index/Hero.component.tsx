import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const Hero = () => {
  // Configurable Card Data
  const slides = [
    {
      text: "Everything You Ever Needed To Purchase Is Available At Shopwice",
      src: "/hero-text-bg.jpg",
      link: "/products",
      color: "bg-blue-600",
      textColor: "text-white",
      id: 7
    },
    {
      text: "Lightining Fast Express Delivery in Just 2 Hours.",
      src: "/hero-express.png",
      link: "/products",
      color: "bg-green-50",
      textColor: "text-gray-900",
      id: 1
    },
    {
      src: "https://cdn.shopwice.com/Homepage%20Banners/suxika%20halogen%20vertical%20image%20for%20homepage%20vertical%20banner%20slider_result.webp",
      link: "/product-category/home-appliances",
      title: "Halogen Heaters",
      subtitle: "Winter Essentials",
      color: "bg-orange-50",
      id: 2
    },
    {
      src: "https://cdn.shopwice.com/Homepage%20Banners/suxika%20vertical%20image%20for%20homepage%20vertical%20banner%20slider_result.webp",
      link: "/product-category/home-appliances",
      title: "Home Appliances",
      subtitle: "Upgrade Your Home",
      color: "bg-purple-50",
      id: 3
    },
    {
      src: "https://cdn.shopwice.com/Homepage%20Banners/vertical%20image%20for%20homepage%20vertical%20banner%20slider_result.webp",
      link: "/shop",
      title: "New Arrivals",
      subtitle: "Shop the Latest",
      color: "bg-emerald-50",
      id: 4
    },
    {
      src: "https://cdn.shopwice.com/Homepage%20Banners/air%20cooler%20with%20mosquito%20repllent%20vertical%20imager%20slider%20banner_result.webp",
      link: "/product-category/home-appliances",
      title: "Best Sellers",
      subtitle: "Trending Now",
      color: "bg-rose-50",
      id: 5
    },
    {
      src: "https://cdn.shopwice.com/Homepage%20Banners/suxika%20halogen%20vertical%20image%20for%20homepage%20vertical%20banner%20slider_result.webp",
      link: "/product-category/home-appliances",
      title: "Flash Deals",
      subtitle: "Limited Time Offer",
      color: "bg-amber-50",
      id: 6
    },
  ];

  // Carousel State (Desktop/Tablet)
  const allSlides = slides;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slidesPerView, setSlidesPerView] = useState(2.5);

  useEffect(() => {
    const updateSlidesPerView = () => {
      if (window.innerWidth >= 1024) {
        setSlidesPerView(3.7);
      } else if (window.innerWidth >= 768) {
        setSlidesPerView(2.5);
      } else {
        setSlidesPerView(1);
      }
    };

    updateSlidesPerView();
    window.addEventListener('resize', updateSlidesPerView);

    return () => window.removeEventListener('resize', updateSlidesPerView);
  }, []);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + allSlides.length) % allSlides.length);
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % allSlides.length);
  };

  return (
    <section className="relative w-full py-8 bg-[#365feb] group">

      {/* ----------------- MOBILE VIEW (< 768px) ----------------- */}
      <div className="md:hidden block">
        {/* Native Scroll Container */}
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-4 pb-1 no-scrollbar items-start">
          {slides.map((slide, index) => (
            <div
              key={`mob-${slide.id}-${index}`}
              className={`snap-center shrink-0 w-[85vw] h-[450px] relative rounded-xl overflow-hidden shadow-sm flex flex-col ${slide.color || 'bg-gray-100'}`}
            >
              <Link href={slide.link || '#'} className={`block w-full h-full relative`}>
                {slide.src && (
                  <Image
                    src={slide.src}
                    alt={slide.title || 'Product'}
                    fill
                    className="object-cover object-center"
                    sizes="85vw"
                    quality={90}
                    unoptimized
                  />
                )}

                {slide.text && (
                  <div className={`absolute inset-0 p-8 flex items-start justify-center z-10 ${!slide.src ? 'relative bg-white h-full items-center' : ''}`}>
                    <h3 className={`font-black text-2xl leading-tight text-center ${slide.textColor || 'text-gray-800'}`}>
                      {slide.text}
                    </h3>
                  </div>
                )}
              </Link>
            </div>
          ))}
        </div>
      </div>


      {/* ----------------- DESKTOP/TABLET VIEW (>= 768px) ----------------- */}
      <div className="hidden md:block overflow-hidden relative min-h-[500px]">
        {/* Carousel Track */}
        <div
          className="relative h-[500px] transition-transform duration-500 ease-out"
          style={{
            display: 'flex',
            transform: `translateX(-${(currentIndex * (100 / allSlides.length)).toFixed(4)}%)`,
            width: `${(allSlides.length / slidesPerView) * 100}%`
          }}
        >
          {allSlides.map((slide, index) => (
            <div
              key={`desk-${slide.id}-${index}`}
              className="relative h-full flex-shrink-0 px-2"
              style={{
                width: `${100 / allSlides.length}%`,
              }}
            >
              <Link href={slide.link || '#'} className={`block w-full h-full relative rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
                {slide.src && (
                  <Image
                    src={slide.src}
                    alt={slide.title || 'Product'}
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 1200px) 33vw, 25vw"
                    quality={90}
                    unoptimized
                  />
                )}

                {slide.text && (
                  <div className={`absolute inset-0 p-8 flex items-start justify-center z-10 ${!slide.src ? 'relative bg-white h-full items-center' : ''}`}>
                    <h3 className={`font-black text-2xl md:text-3xl leading-tight text-center ${slide.textColor || 'text-gray-800'}`}>
                      {slide.text}
                    </h3>
                  </div>
                )}
              </Link>
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/80 shadow-lg hover:bg-white transition-colors focus:outline-none"
          aria-label="Previous Slide"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-800">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        <button
          onClick={nextSlide}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/80 shadow-lg hover:bg-white transition-colors focus:outline-none"
          aria-label="Next Slide"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-800">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

    </section>
  );
};

export default Hero;
