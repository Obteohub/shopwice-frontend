import { useMemo, useEffect } from 'react';
import Link from 'next/link';
import { paddedPrice } from '@/utils/functions/functions';
import StarRating from '../UI/StarRating.component';
import { ProductCategory } from '@/types/product';

interface ProductCardProps {
  databaseId: number;
  name: string;
  price?: string | number | null;
  regularPrice?: string | number | null;
  salePrice?: string | number | null;
  onSale?: boolean;
  slug?: string;
  image?: { sourceUrl?: string | null } | null;
  averageRating?: number;
  productCategories?: { nodes?: ProductCategory[] | null };
  attributes?: { nodes?: Array<{ name: string; options?: string[] | null }> | null };
  stockQuantity?: number | null;
  reviewCount?: number;
}

/* ---------- Helpers ---------- */

const parseMoney = (value?: any) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;

  // Debug log for unexpected values
  if (typeof value !== 'string') {
    // console.log('[ProductCard] parseMoney received non-string:', value);
  }

  // Safety: cast to string to handle unexpected objects/types
  const strVal = String(value);
  return Number(strVal.replace(/[^\d.]/g, '')) || 0;
};

const hasRefurbishKeyword = (value?: any) => {
  if (!value) return false;
  const strVal = String(value);
  return strVal.toLowerCase().includes('refurbish') ||
    strVal.toLowerCase().includes('renewed');
};

/* ---------- Component ---------- */

const ProductCard = (props: ProductCardProps) => {
  const {
    name,
    price,
    regularPrice,
    salePrice,
    onSale,
    slug,
    image,
    averageRating = 0,
    productCategories,
    attributes,
    stockQuantity,
    reviewCount,
  } = props;

  const safeSlug = slug ? String(slug).split('/').filter(Boolean).pop() : '';

  /* ---------- Price Formatting ---------- */

  const formattedPrice = useMemo(
    () => (price && price !== null) ? paddedPrice(price, 'GH₵') : null,
    [price]
  );

  const formattedRegularPrice = useMemo(
    () => (regularPrice && regularPrice !== null) ? paddedPrice(regularPrice, 'GH₵') : null,
    [regularPrice]
  );

  const formattedSalePrice = useMemo(
    () => (salePrice && salePrice !== null) ? paddedPrice(salePrice, 'GH₵') : null,
    [salePrice]
  );

  /* ---------- Category + Attribute Checks ---------- */

  const isRefurbished = useMemo(() => {
    return attributes?.nodes?.some(attr =>
      attr.options?.some(opt => hasRefurbishKeyword(opt))
    );
  }, [attributes]);

  /* ---------- Savings ---------- */

  const savingsAmount = useMemo(() => {
    if (!onSale) return '';

    const reg = parseMoney(regularPrice);
    const sale = parseMoney(salePrice);

    if (reg > sale) {
      return `GH₵${(reg - sale).toFixed(2)}`;
    }

    return '';
  }, [onSale, regularPrice, salePrice]);

  /* ---------- Stock Warning ---------- */

  const showStockWarning = useMemo(() => {
    return (
      typeof stockQuantity === 'number' &&
      stockQuantity > 0 &&
      stockQuantity < 5 &&
      isRefurbished
    );
  }, [stockQuantity, isRefurbished]);

  /* ---------- Shared Product Info ---------- */

  const renderInfo = () => (
    <>
      <p className="text-sm leading-tight min-h-[34px] line-clamp-2 text-gray-800 group-hover:text-blue-700 transition-colors">
        {name}
      </p>

      <div className="flex items-center gap-1 mt-0.5">
        <StarRating rating={averageRating} size={14} />
        {!!reviewCount && (
          <span className="text-xs text-gray-500">
            ({reviewCount})
          </span>
        )}
      </div>
    </>
  );

  /* ---------- Image Component ---------- */

  const ProductImage = () => {
    const imgSrc = image?.sourceUrl;
    return imgSrc ? (
      <img
        src={imgSrc}
        alt={name || 'Product image'}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-110"
      />
    ) : (
      <div className="flex items-center justify-center h-full text-gray-400 text-xs italic">
        No image
      </div>
    );
  };

  /* ---------- Render ---------- */

  return (
    <article className="group relative flex flex-col h-full w-full bg-white border border-transparent hover:border-gray-100 transition-all rounded-sm">

      {/* IMAGE */}
      <div className="aspect-square relative bg-gray-100 overflow-hidden rounded-sm">

        {safeSlug ? (
          <Link
            href={`/product/${safeSlug}`}
            aria-label={`View product ${name}`}
            className="block w-full h-full"
          >
            <ProductImage />
          </Link>
        ) : (
          <ProductImage />
        )}

        {/* BADGES */}
        {isRefurbished && (
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            <span className="bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shadow-sm">
              Renewed
            </span>

            <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shadow-sm">
              12 Month Warranty
            </span>
          </div>
        )}

        {showStockWarning && (
          <div className="absolute bottom-2 left-2 right-2 bg-red-600/90 text-white text-[10px] font-bold text-center py-1 rounded shadow-md">
            Only {stockQuantity} left!
          </div>
        )}
      </div>

      {/* BODY */}
      <div className="flex flex-col flex-grow mt-2 px-1 pb-2">

        {safeSlug ? (
          <Link href={`/product/${safeSlug}`}>
            {renderInfo()}
          </Link>
        ) : (
          renderInfo()
        )}

        {/* PRICE */}
        <div className="mt-2">

          {onSale && formattedSalePrice ? (
            <div className="flex flex-col">

              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-blue-600">
                  {formattedSalePrice}
                </span>

                {formattedRegularPrice && (
                  <span className="text-xs line-through text-gray-400">
                    {formattedRegularPrice}
                  </span>
                )}
              </div>

              {savingsAmount && (
                <span className="text-[10px] font-semibold text-green-700 mt-0.5">
                  Save {savingsAmount}
                </span>
              )}
            </div>
          ) : formattedPrice ? (
            <span className="text-sm font-bold text-blue-600">
              {formattedPrice}
            </span>
          ) : (
            <span className="text-xs text-gray-400">
              Price unavailable
            </span>
          )}

        </div>
      </div>
    </article>
  );
};

export default ProductCard;
