import { useReviews } from '../hooks/useReviews';
import ReviewsSkeleton from '../skeletons/ReviewsSkeleton';
import StarRating from '../../UI/StarRating.component';
import Button from '../../UI/Button.component';
import Link from 'next/link';
import { sanitizeHtml } from '@/utils/sanitizeHtml';

const ReviewCard = ({ review }: { review: any }) => {
    const rawDate = review.date || review.date_created;
    const dateObj = rawDate ? new Date(rawDate) : null;
    const dateStr = dateObj && !Number.isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString() : '';
    const status = review.status || 'published';
    const productTitle = review.productTitle || review.product_name || ((review.productId ?? review.product_id) ? `Product #${review.productId ?? review.product_id}` : 'Product');
    const contentHtml = sanitizeHtml(review.content || review.review || '');
    const rating = Number(review.rating) || 0;

    const statusMap: Record<string, string> = {
        published: 'bg-green-100 text-green-700',
        pending: 'bg-yellow-100 text-yellow-700',
        rejected: 'bg-red-100 text-red-700',
    };

    return (
        <div className="border border-gray-100 rounded-xl p-4 md:p-6 bg-white hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                    {/* Mock Product Thumbnail if product_id is available */}
                    <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 truncate max-w-[200px]">
                            {productTitle}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                            <StarRating rating={rating} size={12} />
                            <span className="text-[10px] text-gray-500 font-medium">{dateStr}</span>
                        </div>
                    </div>
                </div>
                <span className={`self-start md:self-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${statusMap[status] || 'bg-gray-100 text-gray-700'}`}>
                    {status}
                </span>
            </div>

            <div
                className="text-sm text-gray-600 leading-relaxed line-clamp-3 italic"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
            />

            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-wider">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        Helpful
                    </button>
                    <button className="text-[10px] font-bold text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-wider">
                        Edit Review
                    </button>
                </div>
            </div>
        </div>
    );
};

const Reviews = () => {
    const { reviews, stats, isLoading, isError, error } = useReviews();

    if (isLoading) return <ReviewsSkeleton />;

    if (isError || !reviews) {
        // Provide specific error messages based on error type
        let errorMessage = 'Could not load your reviews.';
        
        if (error?.status === 401) {
            errorMessage = 'You are not authenticated. Please log in to view your reviews.';
        } else if (error?.status === 403) {
            errorMessage = 'You do not have permission to view your reviews.';
        } else if (error?.status === 404) {
            errorMessage = 'Reviews not found.';
        } else if (error?.status === 500) {
            errorMessage = 'Server error. Please try again later.';
        }

        return (
            <div className="p-8 text-center">
                <div className="text-red-500 mb-4">
                    <p className="text-lg font-semibold">{errorMessage}</p>
                    {process.env.NODE_ENV === 'development' && error && (
                        <p className="text-sm mt-2 text-gray-600">
                            Error: {error.message}
                        </p>
                    )}
                </div>
                <Button 
                    handleButtonClick={() => window.location.reload()} 
                    className="mt-4"
                >
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">My Reviews</h2>

            {/* Summary Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6 text-center shadow-sm">
                    <span className="block text-2xl font-black text-blue-600 mb-1">{stats.total}</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Reviews Submitted</span>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-6 text-center shadow-sm">
                    <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-2xl font-black text-emerald-600">{stats.averageRating}</span>
                        <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Average Star Rating</span>
                </div>
                <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-6 text-center shadow-sm">
                    <span className="block text-2xl font-black text-purple-600 mb-1">{stats.byRating?.five || 0}</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">5-Star Reviews</span>
                </div>
            </div>

            {reviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
                        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Share your experience</h3>
                    <p className="text-gray-500 mt-2 mb-8 max-w-xs mx-auto text-sm">
                        You haven&apos;t reviewed anything yet. Share your thoughts on your latest purchase to help others!
                    </p>
                    <Link href="/my-account?tab=orders" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                        Review a Purchase
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {reviews.map((review) => (
                        <ReviewCard key={review.id} review={review} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Reviews;
