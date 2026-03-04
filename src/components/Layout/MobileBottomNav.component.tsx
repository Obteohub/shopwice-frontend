import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCartStore } from '@/stores/cartStore';
import { useState } from 'react';
import type { ReactNode } from 'react';
import CategorySidebar from '@/components/Header/CategorySidebar.component';

type NavItem = {
  label: string;
  href: string;
  active: boolean;
  icon: ReactNode;
  badge?: number;
  onClick?: () => void;
};

const MobileBottomNav = () => {
  const router = useRouter();
  const cartCount = useCartStore((state) => state.cart?.totalProductsCount || 0);
  const path = router.asPath || '';
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

  const shouldHide =
    path.startsWith('/checkout') ||
    path.startsWith('/product/') ||
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/forgot-password') ||
    path.startsWith('/reset-password');

  if (shouldHide) return null;

  const items: NavItem[] = [
    {
      label: 'Home',
      href: '/',
      active: path === '/',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-10.5z" />
        </svg>
      ),
    },
    {
      label: 'Categories',
      href: '/categories',
      active:
        isCategoryMenuOpen ||
        path.startsWith('/categories') ||
        path.startsWith('/product-category/'),
      onClick: () => setIsCategoryMenuOpen(true),
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
    },
    {
      label: 'Search',
      href: '/search',
      active: path.startsWith('/search'),
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.6-5.15a6.75 6.75 0 1 1-13.5 0 6.75 6.75 0 0 1 13.5 0z" />
        </svg>
      ),
    },
    {
      label: 'Cart',
      href: '/cart',
      active: path.startsWith('/cart'),
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l2.2 11.1a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L21 6H7" />
          <circle cx="10" cy="20" r="1.5" />
          <circle cx="18" cy="20" r="1.5" />
        </svg>
      ),
      badge: cartCount > 0 ? cartCount : undefined,
    },
    {
      label: 'Account',
      href: '/my-account',
      active: path.startsWith('/my-account'),
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <ul className="grid grid-cols-5 px-1 pb-[calc(env(safe-area-inset-bottom)+4px)] pt-1">
          {items.map((item) => (
            <li key={item.label}>
              {typeof item.onClick === 'function' ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className={`relative w-full flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold ${
                    item.active ? 'text-[#0C6DC9]' : 'text-gray-500'
                  }`}
                  aria-label={item.label}
                >
                  <span className="relative">
                    {item.icon}
                    {item.badge ? (
                      <span className="absolute -top-2 -right-2 min-w-[16px] h-4 rounded-full bg-[#0C6DC9] text-white text-[10px] px-1 flex items-center justify-center">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    ) : null}
                  </span>
                  <span>{item.label}</span>
                </button>
              ) : (
                <Link
                  href={item.href}
                  prefetch={false}
                  className={`relative flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold ${
                    item.active ? 'text-[#0C6DC9]' : 'text-gray-500'
                  }`}
                >
                  <span className="relative">
                    {item.icon}
                    {item.badge ? (
                      <span className="absolute -top-2 -right-2 min-w-[16px] h-4 rounded-full bg-[#0C6DC9] text-white text-[10px] px-1 flex items-center justify-center">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    ) : null}
                  </span>
                  <span>{item.label}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {isCategoryMenuOpen && (
        <CategorySidebar
          isOpen={isCategoryMenuOpen}
          onClose={() => setIsCategoryMenuOpen(false)}
        />
      )}
    </>
  );
};

export default MobileBottomNav;
