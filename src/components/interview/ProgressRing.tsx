interface ProgressRingProps {
  current: number;
  total: number;
  size?: number;
  variant?: "primary" | "destructive" | "warning";
}

export default function ProgressRing({ current, total, size = 120, variant = "primary" }: ProgressRingProps) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const progress = total > 0 ? current / total : 0;

  const strokeColor =
    variant === "destructive"
      ? "hsl(var(--destructive))"
      : variant === "warning"
      ? "hsl(var(--warning))"
      : "hsl(var(--primary))";

  return (
    <svg width={size} height={size} className="transform -rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={4} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={strokeColor}
        strokeWidth={4}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - progress)}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-linear"
      />
    </svg>
  );
}
