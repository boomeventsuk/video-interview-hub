import { Star } from "lucide-react";
import { useState } from "react";

interface Props {
  value: number | null;
  onChange: (rating: number) => void;
  size?: "sm" | "md";
}

export default function StarRating({ value, onChange, size = "md" }: Props) {
  const [hover, setHover] = useState(0);
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hover || value || 0);
        return (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star)}
            className="transition-colors"
          >
            <Star
              className={`${iconSize} ${
                filled
                  ? "fill-[hsl(var(--warning))] text-[hsl(var(--warning))]"
                  : "text-muted-foreground/30"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
