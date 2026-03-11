/**
 * ModerationQueue — review pending CC0 annotations.
 *
 * Only accessible to users with the 'moderator' or 'admin' role.
 * Shows annotations that users have submitted for public sharing.
 * Moderators can approve (→ CC0 public) or reject (→ with feedback).
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import {
  getPendingAnnotations,
  approveAnnotation,
  rejectAnnotation,
} from "../lib/annotations";
import type { Annotation } from "../types/annotation";
import type { AuthState } from "../types/auth";
import type { ScreeningFlag } from "../types/moderation";
import { BOOK_BY_ID } from "../lib/constants";
import type { BookId } from "../types/bible";

interface ModerationQueueProps {
  auth: AuthState;
}

export function ModerationQueue({ auth }: ModerationQueueProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    loadPending();
  }, []);

  async function loadPending() {
    setLoading(true);
    setError(null);
    try {
      const result = await getPendingAnnotations(supabase);
      setAnnotations(result);
    } catch {
      setError("Couldn't load the moderation queue. You may not have moderator access.");
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = useCallback(async (annotationId: string) => {
    if (!auth.userId) return;
    setActionInProgress(annotationId);
    setError(null);
    try {
      await approveAnnotation(supabase, annotationId, auth.userId);
      setAnnotations((prev) => prev.filter((a) => a.id !== annotationId));
    } catch {
      setError("Failed to approve. Please try again.");
    } finally {
      setActionInProgress(null);
    }
  }, [auth.userId]);

  const handleReject = useCallback(async (annotationId: string) => {
    if (!auth.userId || !rejectReason.trim()) return;
    setActionInProgress(annotationId);
    setError(null);
    try {
      await rejectAnnotation(supabase, annotationId, auth.userId, rejectReason.trim());
      setAnnotations((prev) => prev.filter((a) => a.id !== annotationId));
      setRejectingId(null);
      setRejectReason("");
    } catch {
      setError("Failed to reject. Please try again.");
    } finally {
      setActionInProgress(null);
    }
  }, [auth.userId, rejectReason]);

  function formatVerseRef(annotation: Annotation): string {
    const bookInfo = BOOK_BY_ID.get(annotation.anchor.book);
    const name = bookInfo?.name ?? annotation.anchor.book;
    return annotation.anchor.verseStart === annotation.anchor.verseEnd
      ? `${name} ${annotation.anchor.chapter}:${annotation.anchor.verseStart}`
      : `${name} ${annotation.anchor.chapter}:${annotation.anchor.verseStart}-${annotation.anchor.verseEnd}`;
  }

  return (
    <div>
      {/* Header with count */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-heading">Moderation Queue</h2>
          {!loading && (
            <p className="text-sm text-muted mt-1">
              {annotations.length} {annotations.length === 1 ? "note" : "notes"} waiting for review
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={loadPending}
          disabled={loading}
          className="rounded-lg border border-input-border px-3 py-2 text-sm text-muted
                     hover:bg-surface-hover disabled:opacity-50
                     focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4" role="status">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="animate-pulse rounded-lg border border-edge p-5">
              <div className="h-5 w-40 rounded bg-edge mb-3" />
              <div className="h-3 w-full rounded bg-edge mb-2" />
              <div className="h-3 w-3/4 rounded bg-edge" />
            </div>
          ))}
          <span className="sr-only">Loading moderation queue...</span>
        </div>
      )}

      {/* Queue */}
      {!loading && annotations.length > 0 && (
        <div className="space-y-4">
          {annotations.map((annotation) => (
            <div
              key={annotation.id}
              className="rounded-lg border border-edge p-5 space-y-3"
            >
              {/* Verse ref + author */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-heading">
                    {formatVerseRef(annotation)}
                  </span>
                  <span className="text-sm text-muted ml-2">
                    ({annotation.translation.toUpperCase()})
                  </span>
                </div>
                <span className="text-xs text-muted">
                  by {annotation.authorDisplayName ?? "Unknown"}
                </span>
              </div>

              {/* Verse text (if available) */}
              {annotation.verseText && (
                <blockquote className="border-l-4 border-accent pl-3 text-sm text-muted italic">
                  {annotation.verseText}
                </blockquote>
              )}

              {/* Note content */}
              <div className="rounded-lg bg-surface-alt p-3 text-sm text-body leading-relaxed whitespace-pre-wrap">
                {annotation.contentMd}
              </div>

              {/* AI Screening results */}
              {annotation.aiScreeningPassed != null && (
                <AiScreeningBadge
                  passed={annotation.aiScreeningPassed}
                  flags={(annotation.aiScreeningFlags ?? []) as ScreeningFlag[]}
                />
              )}

              {/* Cross-references */}
              {annotation.crossReferences.length > 0 && (
                <p className="text-xs text-muted">
                  Cross-references:{" "}
                  {annotation.crossReferences.map((ref) => {
                    const refBookInfo = BOOK_BY_ID.get(ref.book);
                    const refName = refBookInfo?.name ?? ref.book;
                    return ref.verseStart === ref.verseEnd
                      ? `${refName} ${ref.chapter}:${ref.verseStart}`
                      : `${refName} ${ref.chapter}:${ref.verseStart}-${ref.verseEnd}`;
                  }).join(", ")}
                </p>
              )}

              {/* Actions */}
              {rejectingId === annotation.id ? (
                <div className="space-y-2">
                  <label htmlFor={`reject-reason-${annotation.id}`} className="block text-sm font-medium text-heading">
                    Reason for rejection
                  </label>
                  <textarea
                    id={`reject-reason-${annotation.id}`}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Explain why this note wasn't approved..."
                    className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-heading
                               placeholder:text-faint focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleReject(annotation.id)}
                      disabled={!rejectReason.trim() || actionInProgress === annotation.id}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white
                                 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed
                                 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      {actionInProgress === annotation.id ? "Rejecting..." : "Reject"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRejectingId(null); setRejectReason(""); }}
                      className="rounded-lg border border-input-border px-4 py-2 text-sm text-muted
                                 hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(annotation.id)}
                    disabled={actionInProgress === annotation.id}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white
                               hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed
                               focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {actionInProgress === annotation.id ? "Approving..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectingId(annotation.id)}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600
                               hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && annotations.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-4 text-lg text-muted">All caught up!</p>
          <p className="text-sm text-faint">No notes waiting for review.</p>
        </div>
      )}
    </div>
  );
}

/** Shows AI screening status and any flags for moderator context. */
function AiScreeningBadge({ passed, flags }: { passed: boolean; flags: ScreeningFlag[] }) {
  if (flags.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        AI screening: passed (no flags)
      </div>
    );
  }

  const severityColors: Record<string, string> = {
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  };

  return (
    <div className="space-y-1.5">
      <div className={`flex items-center gap-1.5 text-xs ${passed ? "text-yellow-600" : "text-red-600"}`}>
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        AI screening: {passed ? "passed with flags" : "flagged"}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {flags.map((flag, i) => (
          <span
            key={i}
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${severityColors[flag.severity] ?? ""}`}
            title={flag.message}
          >
            {flag.type}: {flag.message}
          </span>
        ))}
      </div>
    </div>
  );
}
