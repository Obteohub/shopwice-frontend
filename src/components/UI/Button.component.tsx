import { ReactNode } from 'react';
import Link from 'next/link';

type TButtonVariant = 'primary' | 'secondary' | 'hero' | 'filter' | 'reset';

interface IButtonProps {
  handleButtonClick?: () => void;
  buttonDisabled?: boolean;
  variant?: TButtonVariant;
  children?: ReactNode;
  fullWidth?: boolean;
  href?: string;
  title?: string;
  selected?: boolean;
  className?: string; // Allow custom classes
  type?: 'button' | 'submit' | 'reset';
  onPointerEnter?: () => void;
}

/**
 * Renders a clickable button
 * @function Button
 * @param {void} handleButtonClick - Handle button click
 * @param {boolean?} buttonDisabled - Is button disabled?
 * @param {TButtonVariant?} variant - Button variant
 * @param {ReactNode} children - Children for button
 * @param {boolean?} fullWidth - Whether the button should be full-width on mobile
 * @param {boolean?} selected - Whether the button is in a selected state
 * @returns {JSX.Element} - Rendered component
 */
const Button = ({
  handleButtonClick,
  buttonDisabled,
  variant = 'primary',
  children,
  fullWidth = false,
  href,
  title,
  selected = false,
  type,
  onPointerEnter,
  ...props
}: IButtonProps) => {
  const getVariantClasses = (variant: TButtonVariant = 'primary') => {
    switch (variant) {
      case 'hero':
        return 'inline-block px-8 py-4 text-sm tracking-wider uppercase bg-[#fa710f] text-white border border-[#fa710f] hover:bg-[#e0670d] hover:border-[#e0670d] hover:shadow-md';
      case 'filter':
        return selected
          ? 'px-3 py-1 border rounded bg-[#e0670d] border-[#e0670d] text-white'
          : 'px-3 py-1 border rounded bg-[#fa710f] border-[#fa710f] text-white hover:bg-[#e0670d] hover:border-[#e0670d]';
      case 'reset':
        return 'w-full mt-8 py-2 px-4 bg-[#fa710f] border border-[#fa710f] text-white rounded hover:bg-[#e0670d] hover:border-[#e0670d] transition-colors';
      case 'secondary':
        return 'px-2 lg:px-4 py-2 font-bold border border-[#fa710f] border-solid rounded text-white bg-[#fa710f] hover:bg-[#e0670d] hover:border-[#e0670d]';
      default: // primary
        return 'px-2 lg:px-4 py-2 font-bold border border-[#fa710f] border-solid rounded text-white bg-[#fa710f] hover:bg-[#e0670d] hover:border-[#e0670d]';
    }
  };

  const classes = `${getVariantClasses(variant)} ease-in-out transition-all duration-300 disabled:opacity-50 ${fullWidth ? 'w-full' : ''
    } ${props.className || ''}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button
      onClick={handleButtonClick}
      disabled={buttonDisabled}
      className={classes}
      title={title}
      type={type}
      onPointerEnter={onPointerEnter}
    >
      {children}
    </button>
  );
};

export default Button;
