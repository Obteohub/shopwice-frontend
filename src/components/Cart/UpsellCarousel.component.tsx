
import React from 'react';
import ProductCard from '@/components/Product/ProductCard.component';

interface UpsellCarouselProps {
    title: string;
    products?: any[]; // Keep flexible if types mismatch slightly
}

const UpsellCarousel: React.FC<UpsellCarouselProps> = ({ title, products }) => {
    if (!products || products.length === 0) return null;

    return (
        <div className="my-12">
            <h3 className="text-xl font-bold text-gray-900 mb-6">{title}</h3>
            <div className="flex gap-4 overflow-x-auto pb-6 snap-x hide-scrollbar">
                {products.map((product) => (
                    <div key={product.id || product.databaseId} className="min-w-[200px] md:min-w-[240px] snap-start">
                        <ProductCard
                            {...product}
                        // Map fields if necessary, assuming ProductCard handles what's passed
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UpsellCarousel;
