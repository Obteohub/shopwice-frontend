import { useState, useEffect } from 'react';

interface ProductActionsProps {
    productName: string;
    productUrl: string; // Should be full URL if possible, or relative
    productId: number;
}

const ProductActions = ({ productName, productUrl, productId }: ProductActionsProps) => {
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [shareFeedback, setShareFeedback] = useState<string | null>(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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

        // Try native share first if available
        if (navigator.share) {
            try {
                await navigator.share({
                    title: productName,
                    text: `Check out ${productName} on Shopwice!`,
                    url: fullUrl,
                });
                return;
            } catch (error) {
                console.log('Native share failed or cancelled, falling back to modal', error);
            }
        }

        // Open custom modal if native share not available or failed
        setIsShareModalOpen(true);
    };

    const copyToClipboard = async () => {
        const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${productUrl}` : productUrl;
        try {
            await navigator.clipboard.writeText(fullUrl);
            setShareFeedback('Copied!');
            setTimeout(() => setShareFeedback(null), 2000);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement("textarea");
            textArea.value = fullUrl;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setShareFeedback('Copied!');
                setTimeout(() => setShareFeedback(null), 2000);
            } catch (err) {
                setShareFeedback('Failed');
                setTimeout(() => setShareFeedback(null), 2000);
            }
            document.body.removeChild(textArea);
        }
    };

    const shareLinks = [
        {
            name: 'WhatsApp',
            getUrl: (url: string, text: string) => `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`
        },
        {
            name: 'Facebook',
            getUrl: (url: string, text: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        },
        {
            name: 'Twitter',
            getUrl: (url: string, text: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
        },
        {
            name: 'Gmail',
            getUrl: (url: string, text: string) => `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`
        }
    ];

    return (
        <>
            <div className="flex items-center gap-4 py-2 mb-4">
                {/* Share Button */}
                <button
                    onClick={handleShare}
                    className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors group relative"
                    aria-label="Share this product"
                >
                    <div className="p-2 bg-gray-50 rounded-full group-hover:bg-blue-50 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                        </svg>
                    </div>
                    <span className="text-sm font-medium">
                        Share
                    </span>
                    {shareFeedback && !isShareModalOpen && (
                        <div className="absolute left-0 -top-10 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap animate-fade-in-up z-10">
                            {shareFeedback}
                        </div>
                    )}
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

            {/* Share Modal - Refined Minimal Design */}
            {isShareModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm" onClick={() => setIsShareModalOpen(false)}>
                    <div className="bg-white rounded-lg w-full max-w-[280px] shadow-2xl overflow-hidden animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-900">Share via</h3>
                            <button onClick={() => setIsShareModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="py-1">
                            {shareLinks.map((link) => (
                                <a
                                    key={link.name}
                                    href={link.getUrl(typeof window !== 'undefined' ? `${window.location.origin}${productUrl}` : productUrl, `Check out ${productName} on Shopwice!`)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-sm text-gray-700 font-medium"
                                >
                                    <span>{link.name}</span>
                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                            ))}

                            {/* Copy Link Option */}
                            <button
                                onClick={copyToClipboard}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-sm text-gray-700 font-medium border-t border-gray-100"
                            >
                                <span>Copy Link</span>
                                {shareFeedback === 'Copied!' ? (
                                    <span className="text-green-600 text-xs font-bold">Copied!</span>
                                ) : (
                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProductActions;
