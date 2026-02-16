import { useState } from 'react';

interface ProductActionsProps {
    productName: string;
    productUrl: string; // Should be full URL if possible, or relative
    productId: number;
    orientation?: 'row' | 'col';
}

const ProductActions = ({ productName, productUrl, productId, orientation = 'col' }: ProductActionsProps) => {
    const [isWishlisted, setIsWishlisted] = useState(() => {
        if (typeof window === 'undefined') return false;
        try {
            const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
            return wishlist.includes(productId);
        } catch (e) {
            console.error('Error reading wishlist', e);
            return false;
        }
    });
    const [shareFeedback, setShareFeedback] = useState<string | null>(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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
        } catch {
            // Fallback for older browsers
            const textArea = document.createElement("textarea");
            textArea.value = fullUrl;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setShareFeedback('Copied!');
                setTimeout(() => setShareFeedback(null), 2000);
            } catch {
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
            getUrl: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
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
            <div className={`flex ${orientation === 'row' ? 'flex-row' : 'flex-col'} gap-3`}>
                {/* Share Button */}
                <button
                    onClick={handleShare}
                    className="flex flex-col items-center justify-center w-10 h-10 bg-white rounded-full shadow-md hover:bg-gray-50 text-gray-700 transition-all active:scale-95 group relative border border-gray-100 z-30 cursor-pointer"
                    aria-label="Share this product"
                    title="Share"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                    </svg>
                    {shareFeedback && !isShareModalOpen && (
                        <div className="absolute right-12 top-1 bg-black text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap animate-fade-in z-10 font-bold">
                            {shareFeedback}
                        </div>
                    )}
                </button>

                {/* Wishlist Button */}
                <button
                    onClick={handleWishlistToggle}
                    className="flex flex-col items-center justify-center w-10 h-10 bg-white rounded-full shadow-md hover:bg-gray-50 transition-all active:scale-95 border border-gray-100 z-30 cursor-pointer"
                    aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                    title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill={isWishlisted ? "#ef4444" : "none"}
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke={isWishlisted ? "#ef4444" : "currentColor"}
                        className={`w-5 h-5 transition-colors ${isWishlisted ? 'text-red-500' : 'text-gray-700'}`}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                    </svg>
                </button>
            </div>

            {/* Share Modal - Refined Minimal Design */}
            {isShareModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm" onClick={() => setIsShareModalOpen(false)}>
                    <div className="bg-white rounded-xl w-full max-w-[280px] shadow-2xl overflow-hidden animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="text-sm font-bold text-gray-900">Share via</h3>
                            <button onClick={() => setIsShareModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors bg-white rounded-full p-1 shadow-sm border border-gray-100">
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
                                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-sm text-gray-700 font-medium group"
                                >
                                    <span className="group-hover:text-gray-900">{link.name}</span>
                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                            ))}

                            {/* Copy Link Option */}
                            <button
                                onClick={copyToClipboard}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-sm text-gray-700 font-medium border-t border-gray-100 group"
                            >
                                <span className="group-hover:text-gray-900">Copy Link</span>
                                {shareFeedback === 'Copied!' ? (
                                    <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-0.5 rounded border border-green-100">Copied!</span>
                                ) : (
                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
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
