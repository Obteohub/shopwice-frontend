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

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchReviews = async () => {
            if (!mounted) return;

            try {
                setLoading(true);
                // Fetch recent approved reviews
                const reviewsResponse = await fetch(
                    'https://api.shopwice.com/wp-json/wc/v3/products/reviews?status=approved&per_page=50',
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

                // Fetch product details to check if they're refurbished
                const productDetailsPromises = productIds.slice(0, 20).map(async (productId) => {
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

                // Sort by date and take top 5
                const sortedReviews = refurbishedReviews
                    .sort((a: Review, b: Review) =>
                        new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
                    )
                    .slice(0, 5);

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

    if (!mounted) return null;
    if (loading) return <div className="p-4 text-xs text-center text-gray-400">Loading reviews...</div>;
    if (reviews.length === 0) return null;

    return (
        <div className="mt-6 border-t border-gray-100 pt-4">
            <h4 className="text-sm font-bold text-gray-900 mb-3">Recent Refurbished Reviews</h4>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {reviews.map((review) => (
                    <div key={review.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs">
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                                <span className="font-bold text-gray-800">{review.reviewer || 'Customer'}</span>
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
                            className="text-gray-600 mb-2 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: review.review }}
                        />
                        {review.product_permalink && review.product_name && (
                            <Link
                                href={review.product_permalink.replace('https://shopwice.com', '')}
                                className="text-[10px] text-blue-600 hover:underline block border-t border-gray-200 pt-1 mt-1 font-medium"
                            >
                                {review.verified && 'Verified Purchase: '}{review.product_name}
                            </Link>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecentRefurbishedReviewsREST;
