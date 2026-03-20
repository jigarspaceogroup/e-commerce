import { Star } from "lucide-react";

interface RatingStarsProps {
  rating: number;
  maxStars?: number;
  size?: number;
  showValue?: boolean;
}

export function RatingStars({ rating, maxStars = 5, size = 18, showValue = false }: RatingStarsProps) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxStars }, (_, i) => {
          const fillPercent = Math.min(1, Math.max(0, rating - i));
          return (
            <span key={i} className="relative" style={{ width: size, height: size }}>
              <Star
                size={size}
                className="text-surface-muted"
                fill="currentColor"
                strokeWidth={0}
              />
              {fillPercent > 0 && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fillPercent * 100}%` }}
                >
                  <Star
                    size={size}
                    className="text-rating"
                    fill="currentColor"
                    strokeWidth={0}
                  />
                </span>
              )}
            </span>
          );
        })}
      </div>
      {showValue && (
        <span className="text-body-sm text-primary">
          {rating.toFixed(1)}/{maxStars}
        </span>
      )}
    </div>
  );
}
