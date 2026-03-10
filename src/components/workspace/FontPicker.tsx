/**
 * FontPicker — dropdown to choose the Bible reading font.
 *
 * Shows system/web-safe fonts in a native <select>, ordered by viewport:
 * - Mobile: sans-serif fonts first (better for small screens)
 * - Desktop: serif fonts first (better for extended reading)
 *
 * Uses native <select> for best mobile accessibility (OS picker wheel).
 * Grandmother Principle: plain dropdown, descriptive label.
 */

import { useMemo } from "react";
import type { ReaderFont } from "../../lib/workspace-prefs";
import { getOrderedFontOptions } from "../../lib/reader-fonts";

interface FontPickerProps {
  /** Currently selected font key */
  readerFont: ReaderFont;
  /** Called when user picks a new font */
  onFontChange: (font: ReaderFont) => void;
}

export function FontPicker({ readerFont, onFontChange }: FontPickerProps) {
  // Compute ordering once at mount — sans-first on mobile, serif-first on desktop
  const orderedFonts = useMemo(() => getOrderedFontOptions(), []);

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="font-picker"
        className="text-sm font-medium text-muted whitespace-nowrap"
      >
        Font
      </label>
      <select
        id="font-picker"
        value={readerFont}
        onChange={(e) => onFontChange(e.target.value as ReaderFont)}
        className="rounded-md border border-input-border bg-panel px-3 py-1.5 text-sm
                   font-medium text-body
                   focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Choose a reading font"
      >
        {orderedFonts.map((font) => (
          <option key={font.key} value={font.key}>
            {font.label}
          </option>
        ))}
      </select>
    </div>
  );
}
