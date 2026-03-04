import React from 'react';

interface StarRatingProps {
  rating: number;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
}

const clampRating = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(5, value));
};

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = 14,
  activeColor = '#f59e0b',
  inactiveColor = '#d1d5db',
}) => {
  const safeRating = clampRating(Number(rating));
  const filled = Math.round(safeRating);

  return (
    <div className="flex items-center gap-0.5" aria-label={`Rated ${safeRating.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const color = star <= filled ? activeColor : inactiveColor;
        return (
          <svg
            key={star}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={color}
            width={size}
            height={size}
            className="shrink-0"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.005Z"
              clipRule="evenodd"
            />
          </svg>
        );
      })}
    </div>
  );
};

export default StarRating;

