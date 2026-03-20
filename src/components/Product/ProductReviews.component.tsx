import React from 'react';
import StarRating from '../UI/StarRating.component';
import { sanitizeHtml } from '@/utils/sanitizeHtml';

export interface RestReview {
  id: string | number;
  content?: string; // HTML or text
  review?: string; // common Woo REST field
  date?: string; // ISO
  date_created?: string; // common Woo REST field
  rating?: number;
  reviewer?: string; // common Woo REST field
  author_name?: string; // fallback
}

interface ProductReviewsProps {
  reviews: RestReview[];
  averageRating?: number;
  reviewCount?: number;
}

const formatDateSafe = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
};

const ProductReviews: React.FC<ProductReviewsProps> = ({
  reviews,
  averageRating = 0,
  reviewCount = 0,
}) => {
  if (!reviews || reviews.length === 0) {
    if (reviewCount > 0 || averageRating > 0) {
      return (
        <div className="py-8 bg-gray-100 rounded-lg text-center">
          <p className="text-gray-700 mb-2 font-medium">
            Rated {averageRating.toFixed(1)} out of 5 ({reviewCount} reviews)
          </p>
          <div className="flex justify-center mb-2">
            <StarRating rating={averageRating} size={16} />
          </div>
          <p className="text-sm text-gray-500">
            Ratings are available, but detailed review text is currently unavailable.
          </p>
        </div>
      );
    }

    return (
      <div className="py-8 bg-gray-100 rounded-lg text-center">
        <p className="text-gray-500 mb-2">No reviews yet</p>
        <p className="text-sm text-gray-500">
          Only customers who have purchased this product may leave a review
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold mb-4">Customer Reviews</h3>

      {reviews.map((review) => {
        const reviewerName =
          review.reviewer || review.author_name || 'Verified Buyer';

        const dateStr = formatDateSafe(review.date_created || review.date);

        const htmlContent = sanitizeHtml(review.content || review.review || '');

        return (
          <div
            key={String(review.id)}
            className="border-b border-gray-100 pb-6 last:border-0"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 uppercase flex-shrink-0">
                  {reviewerName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{reviewerName}</h4>
                  <div className="mt-0.5">
                    <StarRating rating={review.rating || 0} size={14} />
                  </div>
                </div>
              </div>

              {dateStr && (
                <span className="text-xs text-gray-500">{dateStr}</span>
              )}
            </div>

            <div
              className="text-gray-600 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default ProductReviews;
