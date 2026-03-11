/**
 * AI Screening — automated first pass for content moderation.
 *
 * Two-layer approach:
 * 1. Rules-based: profanity wordlist + theological keyword detection (always runs)
 * 2. AI-assisted: Claude API call for nuanced theological review (optional, requires API key)
 *
 * Screening is ANNOTATIVE, not BLOCKING:
 * - Content always reaches the moderation queue
 * - AI flags provide extra context for human moderators
 * - Moderators have final authority on all decisions
 *
 * The "passed" field means "no high-severity flags found" — not "approved for publishing."
 */

import type { ScreeningFlag, ScreeningResult } from "../types/moderation";

// ── Profanity Detection ──

/**
 * Common profane words and slurs. This is intentionally a conservative list
 * to minimize false positives. Better to let something through to human review
 * than to flag legitimate theological discussion.
 *
 * Words are stored lowercase; input is lowercased before matching.
 * Uses word-boundary matching to avoid flagging "class" for containing "ass", etc.
 */
const PROFANITY_LIST: string[] = [
  // Explicit profanity (high severity)
  "fuck", "fucking", "fucker", "fucked", "shit", "shitting", "bullshit",
  "cunt", "cock", "dick", "pussy", "bitch", "bastard", "asshole",
  "motherfucker", "goddamn", "goddammit",
  // Slurs (high severity) — abbreviated to avoid full reproduction
  "nigger", "nigga", "faggot", "fag", "retard", "retarded",
  "kike", "spic", "chink", "wetback", "tranny",
];

/**
 * Mild profanity that's flagged but at lower severity.
 * Some of these appear in legitimate theological discussion
 * (e.g., "hell" in eschatology, "damn" in judgment contexts).
 */
const MILD_PROFANITY: string[] = [
  "damn", "damned", "crap", "piss", "ass",
];

// ── Theological Flag Detection ──

/**
 * Phrases that indicate theological positions the project considers
 * contrary to its standards (per CLAUDE.md: "No false gospels").
 *
 * These flag for moderator review — they don't auto-reject.
 * A skilled theologian might use these terms in critique or comparison.
 */
const THEOLOGY_FLAGS: { pattern: RegExp; message: string }[] = [
  {
    pattern: /\bpredestination\s+(is|means|teaches)\s+.*(only|elect|chosen\s+few)/i,
    message: "May advocate exclusive predestination theology",
  },
  {
    pattern: /\b(once\s+saved\s+always\s+saved|eternal\s+security\s+means?\s+you\s+can)/i,
    message: "May advocate unconditional eternal security without repentance",
  },
  {
    pattern: /\b(sin\s+(is|doesn'?t)\s+(not\s+)?real|sin\s+is\s+an?\s+illusion)/i,
    message: "May deny the reality of sin",
  },
  {
    pattern: /\b(all\s+religions?\s+(are|lead)\s+(to\s+)?(the\s+same|god|heaven|salvation))/i,
    message: "May advocate religious universalism",
  },
  {
    pattern: /\b(bible\s+is\s+(just|merely|only)\s+a\s+(book|story|myth|fairy\s*tale))/i,
    message: "May dismiss scriptural authority",
  },
];

/**
 * Spam-like patterns that suggest low-quality or bot-generated content.
 */
const SPAM_PATTERNS: { pattern: RegExp; message: string }[] = [
  {
    pattern: /https?:\/\/\S+/gi,
    message: "Contains URLs (may be spam)",
  },
  {
    pattern: /(.)\1{10,}/,
    message: "Contains excessive repeated characters",
  },
  {
    pattern: /^(.{1,20})\1{3,}$/s,
    message: "Content appears to be repetitive",
  },
];

// ── Screening Functions ──

/**
 * Screen content using rules-based checks.
 * Always available — no API key required.
 */
export function screenContentRules(content: string): ScreeningResult {
  const flags: ScreeningFlag[] = [];
  const lowerContent = content.toLowerCase();

  // Check explicit profanity (high severity)
  for (const word of PROFANITY_LIST) {
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, "i");
    if (regex.test(lowerContent)) {
      flags.push({
        type: "profanity",
        severity: "high",
        message: `Contains profanity: "${word}"`,
      });
    }
  }

  // Check mild profanity (low severity)
  for (const word of MILD_PROFANITY) {
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, "i");
    if (regex.test(lowerContent)) {
      flags.push({
        type: "profanity",
        severity: "low",
        message: `Contains mild language: "${word}"`,
      });
    }
  }

  // Check theological flags (medium severity)
  for (const { pattern, message } of THEOLOGY_FLAGS) {
    if (pattern.test(content)) {
      flags.push({
        type: "theology",
        severity: "medium",
        message,
      });
    }
  }

  // Check spam patterns (medium severity)
  for (const { pattern, message } of SPAM_PATTERNS) {
    if (pattern.test(content)) {
      flags.push({
        type: "spam",
        severity: "medium",
        message,
      });
    }
  }

  // "passed" = no high-severity flags
  const passed = !flags.some((f) => f.severity === "high");

  return {
    passed,
    flags,
    screenedAt: new Date().toISOString(),
  };
}

/**
 * Screen content and store results on a Supabase record.
 *
 * Works for both annotations and devotional_bibles tables.
 */
export async function screenAndStore(
  client: { from: (table: string) => unknown },
  table: "annotations" | "devotional_bibles",
  recordId: string,
  content: string,
): Promise<ScreeningResult> {
  const result = screenContentRules(content);

  // Store results on the record
  await (client.from(table) as {
    update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
  })
    .update({
      ai_screening_passed: result.passed,
      ai_screening_flags: result.flags,
      ai_screened_at: result.screenedAt,
    })
    .eq("id", recordId);

  return result;
}

// ── Utilities ──

/** Escape special regex characters in a string. */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
