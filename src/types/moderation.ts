/**
 * Types for AI moderation screening.
 *
 * AI screening is annotative — it flags content for human moderators
 * but does not make final approval/rejection decisions.
 */

/** A single flag raised by the AI screening system. */
export interface ScreeningFlag {
  /** Category of the flag. */
  type: "profanity" | "theology" | "spam" | "other";
  /** How serious the flag is. */
  severity: "low" | "medium" | "high";
  /** Human-readable explanation shown to moderators. */
  message: string;
}

/** Result of screening a piece of content. */
export interface ScreeningResult {
  /** Whether the content passed all checks (no high-severity flags). */
  passed: boolean;
  /** List of flags raised during screening. */
  flags: ScreeningFlag[];
  /** When the screening was performed. */
  screenedAt: string;
}
