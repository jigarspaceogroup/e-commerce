import { RatingStars } from "@/components/ui/rating-stars";
import { Check } from "lucide-react";

interface TestimonialCardProps {
  name: string;
  rating: number;
  text: string;
  verified?: boolean;
}

export function TestimonialCard({ name, rating, text, verified = true }: TestimonialCardProps) {
  return (
    <div className="min-w-[300px] lg:min-w-[358px] rounded-lg border border-border p-7 px-8 flex-shrink-0">
      <RatingStars rating={rating} size={20} />
      <div className="mt-3 flex items-center gap-1">
        <span className="text-body-lg font-bold text-primary">{name}</span>
        {verified && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-success">
            <Check size={12} className="text-on-primary" />
          </span>
        )}
      </div>
      <p className="mt-2 text-body-md text-primary-muted line-clamp-3">{text}</p>
    </div>
  );
}
