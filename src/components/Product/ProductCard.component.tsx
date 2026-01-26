import Link from 'next/link';
import Image from 'next/image';
import { paddedPrice } from '@/utils/functions/functions';
import StarRating from '../UI/StarRating.component';
import { ProductCategory, AttributeNode } from '@/types/product';

interface ProductCardProps {
  databaseId: number;
  name: string;
  price: string;
  regularPrice: string;
  salePrice?: string;
  onSale: boolean;
  slug: string;
  image?: {
    sourceUrl?: string;
  };
  averageRating?: number;
  productCategories?: {
    nodes: ProductCategory[];
  };
  attributes?: {
    nodes: Array<{ name: string; options: string[] }>;
  };
  stockQuantity?: number;
  reviewCount?: number;
}

const ProductCard = ({
  databaseId,
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
}: ProductCardProps) => {
  // Add padding/empty character after currency symbol
  const formattedPrice = price ? paddedPrice(price, 'GH₵') : price;
  const formattedRegularPrice = regularPrice ? paddedPrice(regularPrice, 'GH₵') : regularPrice;
  const formattedSalePrice = salePrice ? paddedPrice(salePrice, 'GH₵') : salePrice;

  // Debugging log
  // Debugging log
  // console.log(`Product: ${name}`, { productCategories, attributes });

  // Check if product is in "Mobile Phones" category
  const isMobilePhone = productCategories?.nodes?.some(
    (cat) => cat.name.toLowerCase() === 'mobile phones' || cat.slug === 'mobile-phones'
  );

  // Check if product has ANY attribute with an option containing "Refurbish"
  // We ignore the attribute name to be more robust (e.g. it could be "Grade", "Condition", "State")
  const isRefurbished = attributes?.nodes?.some(
    (attr) => attr.options?.some((opt) => opt.toLowerCase().includes('refurbish'))
  );

  const showRefurbishedBadge = isMobilePhone && isRefurbished;
  const showWarrantyBadge = isMobilePhone && isRefurbished;

  // Calculate savings
  let savingsAmount = '';
  let savingsPercentage = 0;
  if (onSale && regularPrice && salePrice) {
    const regPriceNum = parseFloat(regularPrice.replace(/[^0-9.]/g, ''));
    const salePriceNum = parseFloat(salePrice.replace(/[^0-9.]/g, ''));
    if (!isNaN(regPriceNum) && !isNaN(salePriceNum)) {
      const savings = regPriceNum - salePriceNum;
      if (savings > 0) {
        savingsAmount = `GH₵${savings.toFixed(2)}`;
        savingsPercentage = Math.round((savings / regPriceNum) * 100);
      }
    }
  }

  // Stock Scarcity Logic
  const showStockWarning = stockQuantity !== undefined && stockQuantity !== null && stockQuantity > 0 && stockQuantity < 5;

  return (
    <div className="group relative h-full flex flex-col w-full overflow-hidden bg-white">
      <div className="aspect-square overflow-hidden bg-gray-100 relative shrink-0">
        <Link href={`/product/${slug}`} className="relative block w-full h-full">
          {image?.sourceUrl ? (
            <Image
              src={image.sourceUrl}
              alt={name}
              fill className="w-full h-full object-cover object-center transition duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="h-full w-full bg-gray-100 flex items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}
        </Link>

        {/* Refurbished Badge */}
        {showRefurbishedBadge && (
          <div className="absolute top-2 left-2 bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm z-10 uppercase tracking-wide">
            Refurbished-Excellent
          </div>
        )}

        {/* Warranty Badge - Only for Refurbished Phones */}
        {showWarrantyBadge && (
          <div className="absolute top-8 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm z-10 uppercase tracking-wide">
            6 Month Warranty
          </div>
        )}

        {/* Stock Scarcity Warning - Only for Refurbished */}
        {showStockWarning && isRefurbished && (
          <div className="absolute bottom-2 left-2 right-2 bg-red-500/90 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm z-10 text-center">
            Only {stockQuantity} left in stock!
          </div>
        )}
      </div>

      <div className="flex flex-col flex-grow mt-2 justify-between">
        <Link href={`/product/${slug}`}>
          <div>
            <p
              className="text-sm font-normal text-left cursor-pointer hover:text-gray-600 transition-colors leading-[1.2] tracking-tighter min-h-[34px] break-words"
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineClamp: 2 }}
            >
              {name}
            </p>
            <div className="flex justify-start items-center gap-1 mt-0.5">
              <StarRating rating={averageRating} size={14} />
              {reviewCount !== undefined && reviewCount > 0 && (
                <span className="text-xs text-gray-500">({reviewCount})</span>
              )}
            </div>
          </div>
        </Link>
        <div className="mt-1 text-left">
          {onSale ? (
            <div className="flex flex-col items-start gap-0.5">
              <div className="flex items-center justify-start gap-1.5">
                <span className="text-xs font-bold text-blue-600 tracking-tighter">{formattedSalePrice}</span>
                <span className="text-xs text-gray-500 line-through tracking-tighter">{formattedRegularPrice}</span>
              </div>
              {savingsAmount && (
                <span className="text-[10px] font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded tracking-tighter inline-block mt-0.5">
                  Save - {savingsAmount}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm font-bold text-blue-600">{formattedPrice}</span>
          )}
        </div>
      </div>
    </div>
  );
};


export default ProductCard;
