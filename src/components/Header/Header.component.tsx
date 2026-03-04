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

const Header = ({ title }: IHeaderProps) => {
  void title;
  return (
    <>
      <div className="w-full">
        <Navbar />
      </div>
    </>
  );
};

export default Header;
