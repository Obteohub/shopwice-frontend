
import React from 'react';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { GET_RECENT_REVIEWS_QUERY } from '@/utils/gql/GQL_QUERIES';

const RecentRefurbishedReviews = () => {
    // Client-side only flag
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => {
        setMounted(true);
    }, []);

    const { data, loading, error } = useQuery(GET_RECENT_REVIEWS_QUERY, {
        fetchPolicy: 'network-only', // Ensure fresh data
        skip: !mounted, // Skip query during SSR
        notifyOnNetworkStatusChange: true
    });

    if (!mounted) return null;
    if (loading) return <div className="p-4 text-xs text-center text-gray-400">Loading reviews...</div>;
    if (error) {
        console.error("Refurbished Reviews Error:", error);
        return null;
    }

    // Determine reviews to show
    const recentRefurbishedReviews = data?.reviews?.nodes?.filter((review: any) =>
        review.commentOn?.name?.toLowerCase().includes('refurbish')
    ) || [];

    console.log("Refurbished Reviews Found:", recentRefurbishedReviews);

    if (recentRefurbishedReviews.length === 0) return null;

    return (
        <div className="mt-6 border-t border-gray-100 pt-4">
            <h4 className="text-sm font-bold text-gray-900 mb-3">Recent Refurbished Reviews</h4>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {recentRefurbishedReviews.slice(0, 5).map((review: any) => (
                    <div key={review.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs">
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                                <span className="font-bold text-gray-800">{review.author?.node?.name || 'Customer'}</span>
                                <div className="flex text-yellow-400">
                                    {[...Array(5)].map((_, i) => (
                                        <svg key={i} className={`w-3 h-3 ${i < (review.rating || 5) ? 'fill-current' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                    ))}
                                </div>
                            </div>
                            <span className="text-gray-400 text-[10px] whitespace-nowrap">{new Date(review.date).toLocaleDateString()}</span>
                        </div>
                        <div className="text-gray-600 mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: review.content }} />
                        {review.commentOn?.slug && (
                            <Link href={`/product/${review.commentOn.slug}`} className="text-[10px] text-blue-600 hover:underline block border-t border-gray-200 pt-1 mt-1 font-medium">
                                Verified Purchase: {review.commentOn.name}
                            </Link>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecentRefurbishedReviews;
