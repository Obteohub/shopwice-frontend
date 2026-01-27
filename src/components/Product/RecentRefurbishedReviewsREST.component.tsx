import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Review {
    id: number;
    product_id: number;
    product_name: string;
    product_permalink: string;
    status: string;
    reviewer: string;
    reviewer_email: string;
    review: string;
    rating: number;
    verified: boolean;
    date_created: string;
}

const RecentRefurbishedReviewsREST = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchReviews = async () => {
            if (!mounted) return;

            try {
                setLoading(true);
                // Fetch recent approved reviews - increased to 100 to catch more potential refurbished items
                const reviewsResponse = await fetch(
                    'https://api.shopwice.com/wp-json/wc/v3/products/reviews?status=approved&per_page=100',
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (!reviewsResponse.ok) {
                    throw new Error(`HTTP error! status: ${reviewsResponse.status}`);
                }

                const reviewsData = await reviewsResponse.json();

                // Get unique product IDs
                const productIds = [...new Set(reviewsData.map((r: Review) => r.product_id))];

                // Fetch product details to check if they're refurbished (limit batch size to avoid timeout)
                const productDetailsPromises = productIds.slice(0, 30).map(async (productId) => {
                    try {
                        const response = await fetch(
                            `https://api.shopwice.com/wp-json/wc/v3/products/${productId}`,
                            {
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                            }
                        );
                        if (response.ok) {
                            return await response.json();
                        }
                    } catch (err) {
                        console.error(`Error fetching product ${productId}:`, err);
                    }
                    return null;
                });

                const products = (await Promise.all(productDetailsPromises)).filter(Boolean);

                // Check if product is refurbished based on Condition attribute
                const refurbishedProductIds = new Set(
                    products
                        .filter((product: any) => {
                            // A refurbished product has a "Condition" attribute set to "Refurbish"
                            const conditionAttr = product.attributes?.find(
                                (attr: any) => attr.name?.toLowerCase() === 'condition'
                            );
                            return conditionAttr?.options?.some(
                                (opt: any) => opt.toLowerCase().includes('refurbish')
                            );
                        })
                        .map((product: any) => product.id)
                );

                // Filter reviews for refurbished products
                const refurbishedReviews = reviewsData.filter((review: Review) =>
                    refurbishedProductIds.has(review.product_id)
                );

                // Sort by date and take top 10 for the slider
                const sortedReviews = refurbishedReviews
                    .sort((a: Review, b: Review) =>
                        new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
                    )
                    .slice(0, 10);

                setReviews(sortedReviews);
            } catch (err) {
                console.error('Error fetching refurbished reviews:', err);
            } finally {
                setLoading(false);
            }
        };

        if (mounted) {
            fetchReviews();
        }
    }, [mounted]);

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % reviews.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
    };

    if (!mounted) return null;
    if (loading) return <div className="p-4 text-xs text-center text-gray-400">Loading reviews...</div>;
    if (reviews.length === 0) return null;

    return (
        <div className="mt-6 border-t border-gray-100 pt-4 relative group">
            <h4 className="text-sm font-bold text-gray-900 mb-3">Recent Refurbished Reviews</h4>

            <div className="relative overflow-hidden min-h-[140px] bg-gray-50 rounded-lg border border-gray-100">
                {/* Navigation Arrows */}
                {reviews.length > 1 && (
                    <>
                        <button
                            onClick={prevSlide}
                            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white shadow-md text-gray-600 hover:text-blue-600 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                        </button>
                        <button
                            onClick={nextSlide}
                            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white shadow-md text-gray-600 hover:text-blue-600 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </button>
                    </>
                )}

                <div
                    className="flex transition-transform duration-300 ease-in-out h-full"
                    style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                >
                    {reviews.map((review) => (
                        <div key={review.id} className="min-w-full p-4 flex flex-col justify-center">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-gray-800 text-xs">{review.reviewer || 'Customer'}</span>
                                    {review.rating && (
                                        <div className="flex text-yellow-400">
                                            {[...Array(5)].map((_, i) => (
                                                <svg
                                                    key={i}
                                                    className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'text-gray-300'}`}
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <span className="text-gray-400 text-[10px] whitespace-nowrap">
                                    {new Date(review.date_created).toLocaleDateString()}
                                </span>
                            </div>
                            <div
                                className="text-gray-600 mb-2 leading-relaxed text-xs line-clamp-3"
                                dangerouslySetInnerHTML={{ __html: review.review }}
                            />
                            {review.product_permalink && review.product_name && (
                                <Link
                                    href={review.product_permalink.replace('https://shopwice.com', '')}
                                    className="text-[10px] text-blue-600 hover:underline block pt-1 mt-auto font-medium"
                                >
                                    {review.verified && 'Verified Purchase: '}{review.product_name}
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Dots Indicator */}
            {reviews.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-2">
                    {reviews.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentIndex ? 'bg-blue-600' : 'bg-gray-300 hover:bg-gray-400'
                                }`}
                            aria-label={`Go to slide ${idx + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default RecentRefurbishedReviewsREST;
