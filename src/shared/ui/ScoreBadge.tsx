interface Props {
  score: number | null;
  size?: "sm" | "md" | "lg";
}

function tone(score: number | null): string {
  if (score === null) return "bg-neutral-800 text-neutral-400";
  if (score >= 7.5) return "bg-emerald-500/20 text-emerald-300";
  if (score >= 5) return "bg-amber-400/20 text-amber-300";
  return "bg-rose-500/20 text-rose-300";
}

const sizes = {
  sm: "min-w-9 px-1.5 py-0.5 text-sm",
  md: "min-w-11 px-2 py-1 text-base",
  lg: "min-w-14 px-3 py-1.5 text-2xl",
} as const;

export function ScoreBadge({ score, size = "md" }: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg font-semibold tabular-nums ${sizes[size]} ${tone(score)}`}
    >
      {score === null ? "-" : score.toFixed(1)}
    </span>
  );
}
