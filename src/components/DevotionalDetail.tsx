/**
 * DevotionalDetail — view and manage a single devotional bible.
 *
 * Shows metadata, lists entries with reorder/remove controls,
 * and provides an annotation picker to add notes.
 *
 * Grandmother Principle:
 * - "Add notes" not "Insert annotation entries"
 * - Up/down arrows for reordering (simple, no drag-and-drop)
 * - Confirmation before destructive actions
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import {
  getDevotionalBibleWithEntries,
  removeEntryFromDevotionalBible,
  reorderEntries,
  softDeleteDevotionalBible,
  submitDevotionalForPublishing,
  batchAddEntries,
} from "../lib/devotional-bibles";
import { SUPPORTED_TRANSLATIONS } from "../lib/constants";
import { BOOK_BY_ID } from "../lib/constants";
import type { AuthState } from "../types/auth";
import type { DevotionalBibleWithEntries, DevotionalBibleEntry } from "../types/devotional-bible";
import type { Annotation } from "../types/annotation";
import type { BookId } from "../types/bible";
import { AnnotationPicker } from "./AnnotationPicker";
import { Cc0Intercession } from "./Cc0Intercession";

interface DevotionalDetailProps {
  auth: AuthState;
  devotionalId: string;
}

export function DevotionalDetail({ auth, devotionalId }: DevotionalDetailProps) {
  const [devotional, setDevotional] = useState<DevotionalBibleWithEntries | null>(null);
  const [entryAnnotations, setEntryAnnotations] = useState<Map<string, Annotation>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteDevotional, setConfirmDeleteDevotional] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [showCc0Intercession, setShowCc0Intercession] = useState(false);

  const loadDevotional = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDevotionalBibleWithEntries(supabase, devotionalId);
      if (!data) {
        window.location.href = "/app/devotionals";
        return;
      }
      setDevotional(data);

      // Fetch annotation details for all entries
      if (data.entries.length > 0) {
        const ids = data.entries.map((e) => e.annotationId);
        const { data: annotations } = await supabase
          .from("annotations")
          .select("*")
          .in("id", ids);

        const map = new Map<string, Annotation>();
        for (const row of annotations ?? []) {
          map.set(row.id, {
            id: row.id,
            userId: row.user_id,
            translation: row.translation,
            anchor: {
              book: row.book as BookId,
              chapter: row.chapter,
              verseStart: row.verse_start,
              verseEnd: row.verse_end,
            },
            contentMd: row.content_md,
            isPublic: row.is_public,
            isEncrypted: row.is_encrypted ?? false,
            encryptionIv: row.encryption_iv ?? null,
            crossReferences: [],
            verseText: row.verse_text ?? null,
            publishStatus: row.publish_status ?? null,
            publishedAt: row.published_at ?? null,
            rejectionReason: row.rejection_reason ?? null,
            authorDisplayName: row.author_display_name ?? null,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            deletedAt: row.deleted_at,
          });
        }
        setEntryAnnotations(map);
      }
    } catch {
      setError("Couldn't load this devotional. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [devotionalId]);

  useEffect(() => {
    loadDevotional();
  }, [loadDevotional]);

  function formatVerseRef(annotation: Annotation): string {
    const bookInfo = BOOK_BY_ID.get(annotation.anchor.book);
    const name = bookInfo?.name ?? annotation.anchor.book;
    return annotation.anchor.verseStart === annotation.anchor.verseEnd
      ? `${name} ${annotation.anchor.chapter}:${annotation.anchor.verseStart}`
      : `${name} ${annotation.anchor.chapter}:${annotation.anchor.verseStart}-${annotation.anchor.verseEnd}`;
  }

  function translationName(translationId: string): string {
    const t = SUPPORTED_TRANSLATIONS.find((tr) => tr.id === translationId);
    return t?.name ?? translationId;
  }

  async function handleRemoveEntry(entryId: string) {
    setActionInProgress(true);
    setError(null);
    try {
      await removeEntryFromDevotionalBible(supabase, entryId);
      setDevotional((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          entries: prev.entries.filter((e) => e.id !== entryId),
          entryCount: prev.entryCount - 1,
        };
      });
      setConfirmDeleteId(null);
    } catch {
      setError("Couldn't remove this note. Please try again.");
    } finally {
      setActionInProgress(false);
    }
  }

  async function handleMoveEntry(entryId: string, direction: "up" | "down") {
    if (!devotional) return;
    const entries = [...devotional.entries];
    const index = entries.findIndex((e) => e.id === entryId);
    if (index < 0) return;

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= entries.length) return;

    // Swap
    [entries[index], entries[swapIndex]] = [entries[swapIndex], entries[index]];

    // Update locally immediately
    setDevotional((prev) => prev ? { ...prev, entries } : prev);

    // Persist
    try {
      await reorderEntries(supabase, devotional.id, entries.map((e) => e.id));
    } catch {
      // Revert on failure
      loadDevotional();
      setError("Couldn't reorder. Please try again.");
    }
  }

  async function handleDeleteDevotional() {
    setActionInProgress(true);
    setError(null);
    try {
      await softDeleteDevotionalBible(supabase, devotionalId);
      window.location.href = "/app/devotionals";
    } catch {
      setError("Couldn't delete this devotional. Please try again.");
      setActionInProgress(false);
    }
  }

  /** Initiates the sharing flow. Shows CC0 intercession if first time. */
  function handleShareClick() {
    if (!auth.displayName) {
      setError("Set a display name in Settings before sharing.");
      return;
    }
    const hasSeenCc0 = localStorage.getItem("oeb-has-seen-cc0-intercession") === "true";
    if (hasSeenCc0) {
      handlePublish();
    } else {
      setShowCc0Intercession(true);
    }
  }

  /** Submits the devotional for CC0 publishing. */
  async function handlePublish() {
    setShowCc0Intercession(false);
    setActionInProgress(true);
    setError(null);
    try {
      await submitDevotionalForPublishing(supabase, devotionalId, auth.displayName!);
      localStorage.setItem("oeb-has-seen-cc0-intercession", "true");
      loadDevotional(); // Refresh to show updated status
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit for sharing. Please try again.");
    } finally {
      setActionInProgress(false);
    }
  }

  async function handleAddAnnotations(annotationIds: string[]) {
    if (!devotional) return;
    setError(null);
    try {
      await batchAddEntries(supabase, devotional.id, annotationIds);
      setShowPicker(false);
      loadDevotional(); // Refresh to show new entries
    } catch {
      setError("Couldn't add notes. Please try again.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" role="status">
        <div className="animate-pulse h-8 w-64 rounded bg-edge" />
        <div className="animate-pulse h-4 w-96 rounded bg-edge" />
        <div className="space-y-3 mt-6">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="animate-pulse rounded-lg border border-edge p-4">
              <div className="h-4 w-32 rounded bg-edge mb-2" />
              <div className="h-3 w-full rounded bg-edge" />
            </div>
          ))}
        </div>
        <span className="sr-only">Loading devotional...</span>
      </div>
    );
  }

  if (!devotional) return null;

  const existingIds = new Set(devotional.entries.map((e) => e.annotationId));

  return (
    <div>
      {/* Back link */}
      <a
        href="/app/devotionals"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-heading transition-colors mb-4"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        My Devotionals
      </a>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-heading">{devotional.title}</h2>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                ${devotional.type === "original"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                }`}>
                {devotional.type === "original" ? "Original" : "Assembled"}
              </span>
              <span>{translationName(devotional.translation)}</span>
              <span>{devotional.entryCount} note{devotional.entryCount !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <a
            href={`/app/devotionals/edit/${devotional.id}`}
            className="rounded-lg border border-input-border px-3 py-1.5 text-sm text-body
                       hover:bg-surface-alt focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Edit details
          </a>
        </div>
        {devotional.description && (
          <p className="mt-2 text-muted">{devotional.description}</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent
                     hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring"
        >
          + Add notes
        </button>
        {!devotional.publishStatus && devotional.entryCount > 0 && (
          <button
            type="button"
            onClick={handleShareClick}
            disabled={actionInProgress}
            className="rounded-lg border border-accent px-3 py-1.5 text-sm font-medium text-accent
                       hover:bg-accent-soft disabled:opacity-50
                       focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Share with community
          </button>
        )}
        {devotional.publishStatus === "pending" && (
          <span className="text-sm text-yellow-600">Waiting for review</span>
        )}
        {devotional.publishStatus === "approved" && (
          <span className="text-sm text-green-600">Published</span>
        )}
        {!confirmDeleteDevotional ? (
          <button
            type="button"
            onClick={() => setConfirmDeleteDevotional(true)}
            className="ml-auto rounded-lg px-3 py-1.5 text-sm text-red-600
                       hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Delete
          </button>
        ) : (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-red-600">Move to recycle bin?</span>
            <button
              type="button"
              onClick={handleDeleteDevotional}
              disabled={actionInProgress}
              className="rounded-lg bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700
                         disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteDevotional(false)}
              className="rounded-lg border border-edge px-3 py-1 text-sm text-muted
                         hover:bg-surface-alt focus:outline-none focus:ring-2 focus:ring-ring"
            >
              No
            </button>
          </div>
        )}
      </div>

      {/* Entries list */}
      {devotional.entries.length > 0 ? (
        <div className="space-y-2">
          {devotional.entries.map((entry, index) => {
            const annotation = entryAnnotations.get(entry.annotationId);
            return (
              <EntryCard
                key={entry.id}
                entry={entry}
                annotation={annotation}
                index={index}
                totalEntries={devotional.entries.length}
                isConfirmingDelete={confirmDeleteId === entry.id}
                actionInProgress={actionInProgress}
                onMove={(dir) => handleMoveEntry(entry.id, dir)}
                onRemove={() => setConfirmDeleteId(entry.id)}
                onConfirmRemove={() => handleRemoveEntry(entry.id)}
                onCancelRemove={() => setConfirmDeleteId(null)}
                formatVerseRef={formatVerseRef}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-edge rounded-lg">
          <p className="text-muted">This devotional has no notes yet.</p>
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="mt-3 text-accent hover:underline focus:outline-none"
          >
            Add some to get started
          </button>
        </div>
      )}

      {/* Annotation picker modal */}
      {showPicker && (
        <AnnotationPicker
          devotionalBibleId={devotional.id}
          devotionalType={devotional.type}
          userId={auth.userId!}
          existingEntryAnnotationIds={existingIds}
          onAdd={handleAddAnnotations}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* CC0 Intercession — first-publish education flow */}
      {showCc0Intercession && (
        <Cc0Intercession
          onAccept={handlePublish}
          onCancel={() => setShowCc0Intercession(false)}
        />
      )}
    </div>
  );
}

function EntryCard({
  entry,
  annotation,
  index,
  totalEntries,
  isConfirmingDelete,
  actionInProgress,
  onMove,
  onRemove,
  onConfirmRemove,
  onCancelRemove,
  formatVerseRef,
}: {
  entry: DevotionalBibleEntry;
  annotation: Annotation | undefined;
  index: number;
  totalEntries: number;
  isConfirmingDelete: boolean;
  actionInProgress: boolean;
  onMove: (direction: "up" | "down") => void;
  onRemove: () => void;
  onConfirmRemove: () => void;
  onCancelRemove: () => void;
  formatVerseRef: (a: Annotation) => string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-edge p-3 transition-colors hover:border-accent">
      {/* Reorder arrows */}
      <div className="flex flex-col gap-0.5 pt-1">
        <button
          type="button"
          onClick={() => onMove("up")}
          disabled={index === 0}
          className="rounded p-0.5 text-muted hover:text-heading disabled:opacity-25
                     focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Move up"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onMove("down")}
          disabled={index === totalEntries - 1}
          className="rounded p-0.5 text-muted hover:text-heading disabled:opacity-25
                     focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Move down"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>

      {/* Annotation content */}
      <div className="flex-1 min-w-0">
        {annotation ? (
          <>
            <span className="font-medium text-heading text-sm">{formatVerseRef(annotation)}</span>
            <p className={`text-sm text-muted line-clamp-2 mt-0.5${annotation.isEncrypted ? " italic" : ""}`}>
              {annotation.isEncrypted ? "Locked note" : annotation.contentMd}
            </p>
          </>
        ) : (
          <span className="text-sm text-faint italic">Loading...</span>
        )}
      </div>

      {/* Remove button / confirmation */}
      {isConfirmingDelete ? (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-red-600">Remove?</span>
          <button
            type="button"
            onClick={onConfirmRemove}
            disabled={actionInProgress}
            className="rounded px-2 py-0.5 text-xs bg-red-600 text-white hover:bg-red-700
                       disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={onCancelRemove}
            className="rounded px-2 py-0.5 text-xs border border-edge text-muted
                       hover:bg-surface-alt focus:outline-none focus:ring-1 focus:ring-ring"
          >
            No
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded p-1 text-faint hover:text-red-600 transition-colors
                     focus:outline-none focus:ring-1 focus:ring-red-500"
          aria-label="Remove this note"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
