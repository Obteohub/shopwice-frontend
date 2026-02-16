
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import SocialIcons from './SocialIcons.component';

const Footer = () => {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <footer className="w-full font-sans">
      {/* 1. Newsletter Banner */}
      <div className="bg-[#1e73be] py-6 px-4">
        <div className="container mx-auto text-left">
          <p className="text-white font-semibold text-lg md:text-xl">
            Get deals, promos, and offers directly to your mail
          </p>
        </div>
      </div>

      {/* 2. Main Link Columns */}
      <div className="bg-white py-12 px-6 border-b border-gray-100">
        <div className="container mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 text-left">
          {/* Customer Help */}
          <div>
            <h4 className="text-[#2c3338] font-bold text-lg mb-6 relative inline-block pb-2">
              Customer Help
              <span className="absolute bottom-0 left-0 w-12 h-1 bg-[#1e73be]"></span>
            </h4>
            <ul className="space-y-3 text-[#2c3338]">
              {['My Account', 'Shop', 'Shipping', 'Size Guide', 'Refund', 'Payments', 'Contact Us'].map((item) => (
                <li key={item} className="flex items-center justify-start gap-2 group">
                  <span className="w-1.5 h-1.5 bg-[#1e73be] rounded-full group-hover:scale-125 transition-transform"></span>
                  <Link href={`/${item.toLowerCase().replace(/ /g, '-')}`} className="text-sm hover:text-[#1e73be] transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Overview */}
          <div>
            <h4 className="text-[#2c3338] font-bold text-lg mb-6 relative inline-block pb-2">
              Overview
              <span className="absolute bottom-0 left-0 w-12 h-1 bg-[#1e73be]"></span>
            </h4>
            <ul className="space-y-3 text-[#2c3338]">
              {['About Us', 'Terms', 'Privacy', 'Cookies', 'Sitemap', 'Blog', 'Feedback'].map((item) => (
                <li key={item} className="flex items-center justify-start gap-2 group">
                  <span className="w-1.5 h-1.5 bg-[#1e73be] rounded-full group-hover:scale-125 transition-transform"></span>
                  <Link href={`/${item.toLowerCase().replace(/ /g, '-')}`} className="text-sm hover:text-[#1e73be] transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-[#2c3338] font-bold text-lg mb-6 relative inline-block pb-2">
              Explore
              <span className="absolute bottom-0 left-0 w-12 h-1 bg-[#1e73be]"></span>
            </h4>
            <ul className="space-y-3 text-[#2c3338]">
              {['Brands', 'New Arrivals', 'Sale', 'Best Selling', 'Featured', 'Top Rated', 'Sell On Shopwice'].map((item) => (
                <li key={item} className="flex items-center justify-start gap-2 group">
                  <span className="w-1.5 h-1.5 bg-[#1e73be] rounded-full group-hover:scale-125 transition-transform"></span>
                  <Link href={`/${item.toLowerCase().replace(/ /g, '-')}`} className="text-sm hover:text-[#1e73be] transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-[#2c3338] font-bold text-lg mb-6 relative inline-block pb-2">
              Contact Info
              <span className="absolute bottom-0 left-0 w-12 h-1 bg-[#1e73be]"></span>
            </h4>
            <ul className="space-y-3 text-[#2c3338]">
              <li className="flex items-start justify-center md:justify-start gap-2 group">
                <span className="w-1.5 h-1.5 bg-[#1e73be] rounded-full mt-1.5 group-hover:scale-125 transition-transform"></span>
                <span className="text-sm">25 Ayikushie Street, Adabraka</span>
              </li>
              <li className="flex items-center justify-left ustify-start gap-2 group">
                <span className="w-1.5 h-1.5 bg-[#1e73be] rounded-full group-hover:scale-125 transition-transform"></span>
                <a href="tel:0572636517" className="text-sm hover:text-[#1e73be] transition-colors">Call: 0572636517</a>
              </li>
              <li className="flex items-center justify-left md:justify-start gap-2 group">
                <span className="w-1.5 h-1.5 bg-[#1e73be] rounded-full group-hover:scale-125 transition-transform"></span>
                <a href="mailto:info@shopwice.com" className="text-sm hover:text-[#1e73be] transition-colors">info@shopwice.com</a>
              </li>
              <li className="flex items-center justify-left md:justify-start gap-2 group">
                <span className="w-1.5 h-1.5 bg-[#1e73be] rounded-full group-hover:scale-125 transition-transform"></span>
                <span className="text-sm">Socials @shopwice</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3. Social & Payment Section */}
      <div className="bg-[#1e73be] py-10 px-6 text-white text-left">
        <div className="container mx-auto">
          <h4 className="text-xl font-bold mb-6">Follow Us</h4>
          <div className="mb-8">
            <SocialIcons />
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 text-[13px] text-[#6aff7a] font-medium mb-8">
            {['Cash On Delivery', 'VISA', 'MasterCard', 'Apple Pay', 'UnionPay', 'Discover', 'American Express', 'Mobile Money'].map((method, index, array) => (
              <React.Fragment key={method}>
                <span>{method}</span>
                {index < array.length - 1 && <span className="text-white opacity-50">|</span>}
              </React.Fragment>
            ))}
          </div>

          <div className="text-sm text-white opacity-90">
            &copy; 2017 - {currentYear} Shopwice / Developed by <span className="text-yellow-400 font-bold">Theo</span>
          </div>
        </div>
      </div>

      {/* 4. Bottom Strip */}
      <div className="bg-[#2c3338] py-3 px-6 relative">
        <div className="container mx-auto flex flex-col md:flex-row items-start justify-start gap-4 text-xs text-white opacity-70">
          <div className="flex gap-4">
            <Link href="/home-appliances" className="hover:text-white transition-colors">Home Appliances</Link>
            <Link href="/health-beauty" className="hover:text-white transition-colors">Health & Beauty</Link>
            <Link href="/refurbished-policy" className="hover:text-white transition-colors font-semibold">Refurbished Policy</Link>
          </div>
        </div>

        {/* Back to Top Button */}
        {showBackToTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 w-10 h-10 bg-[#1e73be] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-all duration-300 z-50 animate-bounce"
            aria-label="Back to top"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        )}
      </div>
    </footer>
  );
};

export default Footer;
