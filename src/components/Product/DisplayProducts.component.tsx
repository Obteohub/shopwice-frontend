/*eslint complexity: ["error", 20]*/
import Link from 'next/link';
import Image from 'next/image';

import { filteredVariantPrice, paddedPrice } from '@/utils/functions/functions';
import { getSlugFromUrl } from '@/utils/functions/productUtils';
import { firstDisplayImageUrl } from '@/utils/image';

interface Image {
  sourceUrl?: string;
  src?: string;
  url?: string;
}

interface RootObject {
  name: string;
  onSale: boolean;
  slug: string;
  image: Image;
  price: string;
  regularPrice: string;
  salePrice?: string;
  variations?: Array<{
    price?: string;
    regularPrice?: string;
    salePrice?: string;
  }> | null;
}

interface IDisplayProductsProps {
  products: RootObject[];
}

/**
 * Displays all of the products as long as length is defined.
 * Does a map() over the props array and utilizes uuidv4 for unique key values.
 * @function DisplayProducts
 * @param {IDisplayProductsProps} products Products to render
 * @returns {JSX.Element} - Rendered component
 */

const DisplayProducts = ({ products }: IDisplayProductsProps) => (
  <section className="container mx-auto bg-white py-12">
    <div
      id="product-container"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
    >
      {products ? (
        products.map(
          ({
            name,
            price,
            regularPrice,
            salePrice,
            onSale,
            slug,
            image,
            variations,
          }, index) => {
            // Add padding/empty character after currency symbol here
            if (price) {
              price = paddedPrice(price, 'GH₵');
            }
            if (regularPrice) {
              regularPrice = paddedPrice(regularPrice, 'GH₵');
            }
            if (salePrice) {
              salePrice = paddedPrice(salePrice, 'GH₵');
            }
            const imageUrl = firstDisplayImageUrl(image?.sourceUrl, image?.src, image?.url);

            return (
              <div key={`${slug || name}-${index}`} className="group bg-white rounded-none border border-gray-100 flex flex-col h-full hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
                <Link href={`/product/${getSlugFromUrl(slug)}`} className="relative block aspect-square overflow-hidden bg-white px-2 pt-2">
                  {onSale && (
                    <div className="absolute top-4 left-4 z-10 bg-[#EE7E02] text-white text-[10px] font-black px-2 py-1 rounded-sm shadow-md uppercase tracking-tighter">
                      Limited Time
                    </div>
                  )}
                  {imageUrl ? (
                    <Image
                      id="product-image"
                      className="object-contain object-center transition duration-500 group-hover:scale-110"
                      alt={name}
                      src={imageUrl}
                      fill
                      priority={index === 0}
                      fetchPriority={index === 0 ? 'high' : 'auto'}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    />
                  ) : (
                    <div
                      id="product-image"
                      className="w-full h-full flex items-center justify-center text-xs italic text-gray-400"
                    >
                      No image
                    </div>
                  )}
                </Link>

                <div className="p-4 flex flex-col flex-grow text-left">
                  <Link href={`/product/${getSlugFromUrl(slug)}`}>
                    <h4 className="text-[#2c3338] font-bold text-[14px] md:text-[15px] mb-2 line-clamp-2 hover:text-[#0C6DC9] transition-colors cursor-pointer min-h-[2.5rem] leading-[1.3]">
                      {name}
                    </h4>
                  </Link>

                  {/* Rating Placeholder to match Shopwice card density */}
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg key={s} className="w-3 h-3 text-[#FF9C00]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="text-[10px] text-gray-400 font-bold">(0)</span>
                  </div>

                  <div className="mt-auto">
                    {onSale ? (
                      <div className="flex flex-col">
                        <span className="text-gray-400 text-[12px] line-through decoration-gray-300 font-bold mb-0.5">
                          {variations?.length ? filteredVariantPrice(price, 'right') : regularPrice}
                        </span>
                        <span className="text-[#0C6DC9] font-black text-[18px]">
                          {variations?.length ? filteredVariantPrice(price, '') : salePrice}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[#0C6DC9] font-black text-[18px]">{price}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          },
        )
      ) : (
        <div className="mx-auto text-xl font-bold text-center text-gray-800 no-underline uppercase">
          No products found
        </div>
      )}
    </div>
  </section>
);

export default DisplayProducts;
