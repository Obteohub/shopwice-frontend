import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import Cart from './Cart.component';
import MegaMenu from './MegaMenu.component';
import CategorySidebar from './CategorySidebar.component';
import LocationPicker from './LocationPicker.component';
import NativeSearchBox from '../Search/NativeSearchBox.component';
import MobileNativeSearch from '../Search/MobileNativeSearch.component';

const LOCAL_ASSET_VERSION = '20260315-2';
const logoSrc = `/logo.png?v=${LOCAL_ASSET_VERSION}`;

/**
 * Navigation for the application.
 * Includes mobile menu.
 */
const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="w-full">
      <nav id="header" className="sticky top-0 z-[60] w-full bg-white">
        <LocationPicker variant="headless" />

        {/* Mobile Navbar */}
        <div className="flex w-full flex-col border-b border-gray-100 md:hidden">
          <div className="flex items-center justify-between bg-white px-4 py-3">
            <button
              aria-label="Menu"
              className="p-1"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-7 w-7 text-[#2c3338]"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>

            <Link href="/" prefetch={false} className="ml-2">
              <Image
                src={logoSrc}
                alt="Shopwice"
                width={120}
                height={35}
                className="object-contain"
                priority
              />
            </Link>

            <div className="flex items-center space-x-4">
              <Link href="/my-account" prefetch={false} aria-label="Account">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-6 w-6 text-[#2c3338]"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                  />
                </svg>
              </Link>
              <Cart />
            </div>
          </div>

          <div className="w-full bg-[#0C6DC9] px-4 py-3">
            <MobileNativeSearch />
          </div>
        </div>

        {/* Desktop Navbar - Top Bar */}
        <div className="hidden border-b border-gray-100 py-4 md:block">
          <div className="flex w-full items-center justify-between gap-12 px-8">
            <div className="flex-shrink-0">
              <Link href="/" prefetch={false}>
                <Image
                  src={logoSrc}
                  alt="Shopwice"
                  width={150}
                  height={45}
                  className="object-contain"
                  priority
                />
              </Link>
            </div>

            <div className="max-w-4xl flex-grow">
              <NativeSearchBox />
            </div>

            <div className="block">
              <LocationPicker />
            </div>

            <div className="flex items-center space-x-6">
              <Link
                href="/my-account"
                prefetch={false}
                className="group flex items-center gap-2.5 transition-colors"
              >
                <div className="transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-6 w-6 text-[#0C6DC9] group-hover:text-[#0a59a4]"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                    />
                  </svg>
                </div>
                <div className="hidden flex-col lg:flex">
                  <span className="text-[10px] font-bold uppercase leading-tight text-gray-500">
                    Welcome
                  </span>
                  <span className="whitespace-nowrap text-sm font-bold text-[#0C6DC9] group-hover:text-[#0a59a4]">
                    My Account
                  </span>
                </div>
              </Link>

              <div className="group relative">
                <div className="flex items-center gap-2.5">
                  <div className="transition-colors">
                    <Cart />
                  </div>
                  <div className="hidden flex-col lg:flex">
                    <span className="text-[10px] font-bold uppercase leading-tight text-gray-500">
                      Shopping
                    </span>
                    <span className="whitespace-nowrap text-sm font-bold text-[#0C6DC9]">
                      My Basket
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <MegaMenu />

        {mobileMenuOpen && (
          <CategorySidebar
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
          />
        )}
      </nav>
    </header>
  );
};

export default Navbar;
