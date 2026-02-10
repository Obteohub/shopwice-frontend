import Image from 'next/image';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';

interface ICategoriesProps {
  categories: {
    id: string;
    name: string;
    slug: string;
    image?: { sourceUrl?: string | null; altText?: string | null } | null;
  }[];
}

const Categories = ({ categories }: ICategoriesProps) => (
  <section className="container mx-auto bg-white">
    <div className="grid gap-3 px-2 pt-2 pb-2 lg:px-0 xl:px-0 md:px-0 lg:grid-cols-3 sm:grid-cols-1 md:grid-cols-3 xs:grid-cols-3">
      {categories.map(({ id, name, slug, image }) => (
        <Link
          key={uuidv4()}
          href={`/product-category/${encodeURIComponent(slug)}?id=${encodeURIComponent(id)}`}
        >
          <div className="p-2 cursor-pointer">
            <div className="group w-full overflow-hidden border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white">
              <div className="relative w-full aspect-[4/3] bg-gray-100">
                {image?.sourceUrl ? (
                  <Image
                    src={image.sourceUrl}
                    alt={image.altText || name || 'Category image'}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                    No image
                  </div>
                )}
              </div>
              <div className="px-4 py-3 text-center">
                <p className="text-base font-medium text-gray-800">{name}</p>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  </section>
);

export default Categories;
