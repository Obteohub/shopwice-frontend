import Head from 'next/head';

import Navbar from './Navbar.component';

interface IHeaderProps {
  title: string;
}

/**
 * Renders header for each page.
 * @function Header
 * @param {string} title - Title for the page. Is set in <title>{title}</title>
 * @returns {JSX.Element} - Rendered component
 */

const Header = ({ title }: IHeaderProps) => (
  <>
    <Head>
      <title>{`Shopwice ${title}`}</title>
      <meta name="description" content="Online Shopping in Ghana" />
      <meta name="keywords" content="Online Shopping in Ghana" />
      <meta
        property="og:title"
        content="Shopwice"
        key="pagetitle"
      />
    </Head>
    <div className="w-full">
      <Navbar />
    </div>
  </>
);

export default Header;
