import Link from 'next/link';
import dynamic from 'next/dynamic';

import Cart from '@/components/Header/Cart.component';

import Hamburger from './Hamburger.component';

const MobileNativeSearch = dynamic(
  () => import('@/components/Search/MobileNativeSearch.component'),
  { ssr: false },
);

/**
 * Navigation for the application.
 * Includes mobile menu.
 */
const Stickynav = () => (
  <nav id="footer" className="fixed bottom-0 z-50 w-full mt-[10rem] md:hidden">
    <div className="container flex flex-wrap items-center justify-between px-6 py-3 mx-auto mt-0 md:min-w-96 bg-blue-800">
      <Hamburger />
      <div
        className="order-3 hidden w-full md:flex md:items-center md:w-auto md:order-1"
        id="menu"
      >
        <ul className="items-center justify-between pt-4 text-base text-gray-700 md:flex md:pt-0">
          <li>
            <Link href="/products" prefetch={false}>
              <span className="inline-block py-2 pr-4 text-xl font-bold no-underline hover:underline">
                Products
              </span>
            </Link>
          </li>
          <li>
            <Link href="/categories" prefetch={false}>
              <span className="inline-block py-2 pr-4 text-xl font-bold no-underline hover:underline">
                Categories
              </span>
            </Link>
          </li>
        </ul>
      </div>
      <div className="flex items-center order-2 md:order-3" id="nav-content">
        <div className="w-full max-w-[200px] mr-2">
          <MobileNativeSearch />
        </div>
        <Cart stickyNav />
      </div>
    </div>
  </nav>
);

export default Stickynav;
