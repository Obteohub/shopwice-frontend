import { useState } from 'react';
import { api } from '@/utils/api';
import { useWishlist } from '../hooks/useWishlist';
import WishlistSkeleton from '../skeletons/WishlistSkeleton';
import Link from 'next/link';
import Image from 'next/image';
import Button from '../../UI/Button.component';
import LoadingSpinner from '../../LoadingSpinner/LoadingSpinner.component';
import { useCartStore } from '@/stores/cartStore';
import { getSlugFromUrl } from '@/utils/functions/productUtils';
import { toDisplayImageUrl } from '@/utils/image';

const WishlistCard = ({ product, onRemove }: { product: any; onRemove: (id: number) => void }) => {
    const [isAdding, setIsAdding] = useState(false);
    const updateCart = useCartStore(state => state.updateCart);
    const productImageUrl = toDisplayImageUrl(product.image?.src);

    const handleAddToCart = async () => {
        setIsAdding(true);
        try {
            const res: any = await api.post('/api/cart/add', {
                id: product.id,
                quantity: 1
            }, {
                params: { view: 'mini' },
            });
            if (res && res.cart) {
                updateCart(res.cart);
                alert(`${product.name} added to cart!`);
            }
        } catch (err) {
            console.error('Failed to add to cart', err);
            alert('Failed to add to cart. Please try again.');
        } finally {
            setIsAdding(false);
        }
    };

    const safeSlug = getSlugFromUrl(product.slug);

    return (
        <div className="group relative bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col h-full">
            {/* Remove Button */}
            <button
                onClick={() => onRemove(product.id)}
                className="absolute top-2 right-2 z-20 p-1.5 bg-white/80 hover:bg-white rounded-full text-gray-400 hover:text-red-500 shadow-sm transition-colors"
                title="Remove from wishlist"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            {/* Image Container */}
            <Link
                href={`/product/${safeSlug}`}
                className="block aspect-square relative bg-gray-50 overflow-hidden"
            >
                {productImageUrl ? (
                    <Image
                        src={productImageUrl}
                        alt={product.name}
                        layout="fill"
                        objectFit="cover"
                        className="group-hover:scale-110 transition-transform duration-500"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-300">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}

                {/* Price Drop Badge (Mocked logic for demo) */}
                {product.onSale && (
                    <div className="absolute bottom-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                        Price dropped!
                    </div>
                )}
            </Link>

            {/* Product Info */}
            <div className="p-4 flex flex-col flex-grow">
                <Link
                    href={`/product/${safeSlug}`}
                    className="text-sm font-bold text-gray-900 line-clamp-2 mb-1 hover:text-blue-600 transition-colors h-10"
                >
                    {product.name}
                </Link>
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-base font-bold text-blue-600">{product.price}</span>
                    {product.onSale && (
                        <span className="text-xs text-gray-400 line-through">{product.regular_price}</span>
                    )}
                </div>

                <div className="mt-auto">
                    <Button
                        variant="primary"
                        fullWidth
                        className="text-xs py-2.5 flex justify-center items-center gap-2"
                        handleButtonClick={handleAddToCart}
                        buttonDisabled={isAdding}
                    >
                        {isAdding ? <LoadingSpinner size="sm" color="white" /> : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Add to Cart
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const Wishlist = () => {
    const { wishlistItems, wishlistIds, isLoading, isError, removeFromWishlist } = useWishlist();

    if (isLoading && wishlistIds.length > 0) return <WishlistSkeleton />;

    if (wishlistIds.length === 0) {
        return (
            <div className="p-8 md:p-12 text-center h-[600px] flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center mb-8 shadow-inner">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Your wishlist is empty</h2>
                <p className="text-gray-500 mb-8 max-w-sm mx-auto leading-relaxed">
                    Save items you love and they&apos;ll appear here. We&apos;ll let you know if they go on sale!
                </p>
                <Link href="/" className="bg-blue-600 text-white px-10 py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                    Start Shopping
                </Link>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">My Wishlist</h2>
                    <p className="text-sm text-gray-500 mt-1">{wishlistIds.length} items saved</p>
                </div>

                {/* Bulk action placeholder */}
                <button className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-2">
                    <span>Move to Cart (Bulk)</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </button>
            </div>

            {isError ? (
                <div className="bg-red-50 border border-red-100 p-6 rounded-xl text-center">
                    <p className="text-red-600 font-medium">Something went wrong loading your wishlist.</p>
                    <button onClick={() => window.location.reload()} className="text-xs text-red-500 font-bold uppercase tracking-widest mt-2 hover:underline">Retry</button>
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {wishlistItems.map((product) => (
                        <WishlistCard
                            key={product.id}
                            product={product}
                            onRemove={removeFromWishlist}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Wishlist;
