import { useState, useEffect } from 'react';

interface ProductActionsProps {
    productName: string;
    productUrl: string; // Should be full URL if possible, or relative
    productId: number;
}

const ProductActions = ({ productName, productUrl, productId }: ProductActionsProps) => {
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [shareFeedback, setShareFeedback] = useState<string | null>(null);

    useEffect(() => {
        // Check local storage for wishlist status
        try {
            const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
            if (wishlist.includes(productId)) {
                setIsWishlisted(true);
            }
        } catch (e) {
            console.error("Error reading wishlist", e);
        }
    }, [productId]);

    const handleWishlistToggle = () => {
        try {
            const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
            let newWishlist;
            if (wishlist.includes(productId)) {
                newWishlist = wishlist.filter((id: number) => id !== productId);
                setIsWishlisted(false);
            } else {
                newWishlist = [...wishlist, productId];
                setIsWishlisted(true);
            }
            localStorage.setItem('wishlist', JSON.stringify(newWishlist));

            // Dispatch a custom event so other components can react if needed
            window.dispatchEvent(new Event('wishlist-updated'));

        } catch (e) {
            console.error("Error updating wishlist", e);
        }
    };

    const handleShare = async () => {
        const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${productUrl}` : productUrl;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: productName,
                    text: `Check out ${productName} on Shopwice!`,
                    url: fullUrl,
                });
                // No need for feedback if native share works
            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            // Fallback to clipboard
            try {
                await navigator.clipboard.writeText(fullUrl);
                setShareFeedback('Link copied!');
                setTimeout(() => setShareFeedback(null), 2000);
            } catch (err) {
                setShareFeedback('Failed to copy');
            }
        }
    };

    return (
        <div className="flex items-center gap-4 py-2 mb-4">
            {/* Share Button */}
            <button
                onClick={handleShare}
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors group"
                aria-label="Share this product"
            >
                <div className="p-2 bg-gray-50 rounded-full group-hover:bg-blue-50 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                    </svg>
                </div>
                <span className="text-sm font-medium relative">
                    Share
                    {shareFeedback && (
                        <span className="absolute left-0 -top-8 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap animate-fade-in-up">
                            {shareFeedback}
                        </span>
                    )}
                </span>
            </button>

            {/* Wishlist Button */}
            <button
                onClick={handleWishlistToggle}
                className={`flex items-center gap-2 transition-colors group ${isWishlisted ? 'text-red-500' : 'text-gray-600 hover:text-red-500'}`}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
                <div className={`p-2 rounded-full transition-colors ${isWishlisted ? 'bg-red-50' : 'bg-gray-50 group-hover:bg-red-50'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill={isWishlisted ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                    </svg>
                </div>
                <span className="text-sm font-medium">
                    {isWishlisted ? 'Added' : 'Wishlist'}
                </span>
            </button>
        </div>
    );
};

export default ProductActions;
