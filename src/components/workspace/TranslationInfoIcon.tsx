/**
 * TranslationInfoIcon — circled "i" link to the translations info page.
 *
 * Renders next to the translation picker dropdown. On hover or focus,
 * shows a tooltip explaining what the link leads to.
 *
 * Tooltip is a positioned div with role="tooltip" and aria-describedby
 * linkage — no external library needed.
 *
 * Grandmother Principle: the icon is a gentle invitation, not a demand.
 */

import { useState, useRef, useId } from "react";

export function TranslationInfoIcon() {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipId = useId();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Small delay before hiding to prevent flicker when moving between icon and tooltip
  function handleMouseEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowTooltip(true);
  }

  function handleMouseLeave() {
    timeoutRef.current = setTimeout(() => setShowTooltip(false), 150);
  }

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <a
        href="/translations"
        className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-400
                   text-xs font-bold text-gray-500
                   hover:border-blue-500 hover:text-blue-600
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                   transition-colors duration-150"
        aria-label="Learn about Bible translations"
        aria-describedby={showTooltip ? tooltipId : undefined}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
      >
        i
      </a>

      {/* Tooltip — appears above the icon with a small arrow */}
      {showTooltip && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                     w-56 rounded-lg bg-gray-900 px-3 py-2
                     text-xs text-white text-center leading-snug shadow-lg
                     pointer-events-none z-50"
        >
          Visit our Translations page to learn the history behind each Bible
          translation
          {/* Arrow */}
          <span
            className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"
            aria-hidden="true"
          />
        </span>
      )}
    </span>
  );
}
