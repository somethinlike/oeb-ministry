/**
 * Skeleton — loading placeholder that mimics content layout.
 *
 * Shows animated gray blocks while real content is loading.
 * This is better than a spinner because it reduces layout shift
 * and gives users a sense of what's coming.
 */

interface SkeletonProps {
  /** Number of skeleton lines to render */
  lines?: number;
  /** Width class for lines (default varies for visual interest) */
  className?: string;
}

export function Skeleton({ lines = 3, className = "" }: SkeletonProps) {
  // Varying widths make the skeleton look more natural
  const widths = ["w-full", "w-3/4", "w-5/6", "w-2/3", "w-full"];

  return (
    <div
      className={`space-y-3 animate-pulse ${className}`}
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`h-4 rounded bg-gray-200 ${widths[i % widths.length]}`}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/** Card-shaped skeleton for annotation results. */
export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 p-4">
      <div className="h-4 w-32 rounded bg-gray-200 mb-2" />
      <div className="h-3 w-full rounded bg-gray-200 mb-1" />
      <div className="h-3 w-3/4 rounded bg-gray-200" />
    </div>
  );
}
