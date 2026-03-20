// Imports
import { ReactNode } from 'react';

// Components
import Header from '@/components/Header/Header.component';
import PageTitle from './PageTitle.component';
import Footer from '@/components/Footer/Footer.component';
import MobileBottomNav from './MobileBottomNav.component';
import AddToCartToast from '@/components/Cart/AddToCartToast.component';
import WhatsAppButton from '@/components/UI/WhatsAppButton.component';

interface ILayoutProps {
  children?: ReactNode;
  title: string;
  fullWidth?: boolean;
}

/**
 * Renders layout for each page. Also passes along the title to the Header component.
 * @function Layout
 * @param {ReactNode} children - Children to be rendered by Layout component
 * @param {TTitle} title - Title for the page. Is set in <title>{title}</title>
 * @param {boolean} fullWidth - If true, renders children without container constraints and page title
 * @returns {JSX.Element} - Rendered component
 */

const Layout = ({ children, title, fullWidth = false }: ILayoutProps) => {
  return (
    <div className="flex flex-col min-h-screen w-full mx-auto bg-slate-50 text-gray-900">
      <Header title={title} />
      {title === 'Home' ? (
        <main className="flex-1 px-4 md:px-0 pb-20 md:pb-0">{children}</main>
      ) : fullWidth ? (
        <main className="flex-1 w-full pb-20 md:pb-0">{children}</main>
      ) : (
        <div className="container mx-auto px-6 flex-1 pb-20 md:pb-0">
          <PageTitle title={title} />
          <main>{children}</main>
        </div>
      )}
      <MobileBottomNav />
      <AddToCartToast />
      {/* Floating WhatsApp button — sits above MobileBottomNav on mobile, bottom-right on desktop */}
      <WhatsAppButton className="fixed bottom-[76px] right-4 z-[65] h-14 w-14 lg:bottom-6 lg:right-6 lg:h-14 lg:w-14" />
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
};

export default Layout;
