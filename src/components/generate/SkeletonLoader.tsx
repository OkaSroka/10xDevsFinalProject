interface SkeletonLoaderProps {
  items?: number;
}

export function SkeletonLoader({ items = 3 }: SkeletonLoaderProps) {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-live="polite"
      aria-label="Ladowanie propozycji fiszek"
    >
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="animate-pulse rounded-2xl border border-white/5 bg-white/5 p-4 shadow-inner shadow-black/30"
        >
          <div className="mb-3 h-4 w-2/3 rounded-full bg-white/10" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded-full bg-white/10" />
            <div className="h-3 w-5/6 rounded-full bg-white/10" />
            <div className="h-3 w-3/4 rounded-full bg-white/10" />
            <div className="h-3 w-2/3 rounded-full bg-white/10" />
          </div>
        </div>
      ))}
      <span className="sr-only">Ladowanie...</span>
    </div>
  );
}
