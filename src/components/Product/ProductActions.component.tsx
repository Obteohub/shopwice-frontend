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
                // Fallthrough to open modal if cancelled/failed? 
                // Usually if cancelled we stop, but if failed we fallback.
                // Let's fallback only if not cancelled? Hard to detect cancellation reliably across browsers.
                // Safest to just open modal if share fails or isn't supported.
            }
        }

        // Open custom modal if native share not available or failed
        setIsShareModalOpen(true);
    };

    const copyToClipboard = async () => {
        const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${productUrl}` : productUrl;
        try {
            await navigator.clipboard.writeText(fullUrl);
            setShareFeedback('Link copied!');
            setTimeout(() => setShareFeedback(null), 2000);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement("textarea");
            textArea.value = fullUrl;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setShareFeedback('Link copied!');
                setTimeout(() => setShareFeedback(null), 2000);
            } catch (err) {
                setShareFeedback('Failed to copy');
            }
            document.body.removeChild(textArea);
        }
    };

    const shareLinks = [
        {
            name: 'WhatsApp',
            icon: (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
            ),
            bg: 'bg-[#25D366]',
            getUrl: (url: string, text: string) => `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`
        },
        {
            name: 'Facebook',
            icon: (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
            ),
            bg: 'bg-[#1877F2]',
            getUrl: (url: string, text: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        },
        {
            name: 'Twitter',
            icon: (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>
            ),
            bg: 'bg-[#1DA1F2]',
            getUrl: (url: string, text: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
        },
        {
            name: 'Email',
            icon: (
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            ),
            bg: 'bg-gray-600',
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

            {/* Share Modal */}
            {isShareModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[999] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsShareModalOpen(false)}>
                    <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl overflow-hidden animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h3 className="font-bold text-gray-900">Share Product</h3>
                            <button onClick={() => setIsShareModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-4 gap-4 mb-6">
                                {shareLinks.map((link) => (
                                    <a
                                        key={link.name}
                                        href={link.getUrl(typeof window !== 'undefined' ? `${window.location.origin}${productUrl}` : productUrl, `Check out ${productName} on Shopwice!`)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex flex-col items-center gap-2 group"
                                    >
                                        <div className={`w-12 h-12 rounded-full ${link.bg} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                                            {link.icon}
                                        </div>
                                        <span className="text-xs text-gray-600 font-medium">{link.name}</span>
                                    </a>
                                ))}
                            </div>

                            <div className="relative">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Or copy link</label>
                                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded border border-gray-200">
                                    <input
                                        type="text"
                                        className="bg-transparent border-none text-xs text-gray-500 w-full focus:ring-0 p-0"
                                        value={typeof window !== 'undefined' ? `${window.location.origin}${productUrl}` : productUrl}
                                        readOnly
                                    />
                                    <button
                                        onClick={copyToClipboard}
                                        className="text-blue-600 text-xs font-bold hover:underline whitespace-nowrap px-2"
                                    >
                                        {shareFeedback === 'Link copied!' ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProductActions;
