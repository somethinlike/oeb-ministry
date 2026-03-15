/**
 * YouTubePlayer — controlled React component that renders a YouTube iframe.
 *
 * The actual player lifecycle is managed by the useYouTubePlayer hook.
 * This component just provides the container <div> with the right ID
 * and handles responsive sizing.
 *
 * Two display modes:
 * - **expanded**: Shows the video at 16:9 aspect ratio (for the timing editor)
 * - **compact**: Small thumbnail-sized embed (for the player bar)
 */

import { useId } from "react";

interface YouTubePlayerProps {
  /** Display mode: full video or compact thumbnail */
  mode?: "expanded" | "compact";
  /** Container ID — must match what's passed to useYouTubePlayer */
  containerId: string;
  /** Additional CSS classes */
  className?: string;
}

export function YouTubePlayer({
  mode = "expanded",
  containerId,
  className = "",
}: YouTubePlayerProps) {
  if (mode === "compact") {
    return (
      <div
        className={`h-10 w-16 overflow-hidden rounded bg-black shrink-0 ${className}`}
      >
        <div id={containerId} className="h-full w-full" />
      </div>
    );
  }

  // Expanded mode: 16:9 aspect ratio, responsive
  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg bg-black ${className}`}
      style={{ paddingBottom: "56.25%" /* 16:9 */ }}
    >
      <div
        id={containerId}
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}

/**
 * Hook to generate a unique container ID for the YouTube player.
 * Each player instance needs a unique DOM ID.
 */
export function useYouTubeContainerId(): string {
  const id = useId();
  // useId returns ":r1:" format — strip colons for a valid DOM ID
  return `yt-player-${id.replace(/:/g, "")}`;
}
