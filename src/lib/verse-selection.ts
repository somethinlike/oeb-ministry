/**
 * Verse selection state management.
 *
 * Handles the "tap a verse to select it, tap another to extend the range"
 * interaction pattern used in the Bible reader. This is pure state logic
 * with no DOM dependency, making it easy to test.
 */

/** Represents a selected range of verses within a single chapter. */
export interface VerseSelection {
  /** First verse in the selection (always <= end) */
  start: number;
  /** Last verse in the selection (always >= start) */
  end: number;
}

/**
 * Calculates the next selection state when a verse is tapped.
 *
 * Selection behavior:
 * 1. No current selection → select the tapped verse
 * 2. Tapped same verse as current selection → deselect (clear)
 * 3. Have a single verse selected → extend to range (order doesn't matter)
 * 4. Have a range selected → start fresh with the new verse
 *
 * @param current - The current selection (null if nothing selected)
 * @param tappedVerse - The verse number the user just tapped
 * @returns The new selection state (null if deselected)
 */
export function updateSelection(
  current: VerseSelection | null,
  tappedVerse: number,
): VerseSelection | null {
  // Case 1: Nothing selected → select this verse
  if (!current) {
    return { start: tappedVerse, end: tappedVerse };
  }

  const isSingleVerse = current.start === current.end;

  // Case 2: Tapped the same single verse → deselect
  if (isSingleVerse && current.start === tappedVerse) {
    return null;
  }

  // Case 3: Have a single verse → extend to range
  if (isSingleVerse) {
    // Math.min/max ensures start <= end regardless of tap order
    return {
      start: Math.min(current.start, tappedVerse),
      end: Math.max(current.start, tappedVerse),
    };
  }

  // Case 4: Have a range → start fresh
  return { start: tappedVerse, end: tappedVerse };
}

/**
 * Checks if a specific verse number falls within the current selection.
 * Used for highlighting selected verses in the reader.
 */
export function isVerseSelected(
  selection: VerseSelection | null,
  verseNumber: number,
): boolean {
  if (!selection) return false;
  return verseNumber >= selection.start && verseNumber <= selection.end;
}
