/**
 * AnnotationPanel — create/edit/view an annotation.
 *
 * This is the main "write a note" interface. It combines:
 * - Markdown editor (for content)
 * - Cross-reference picker (for related verses)
 * - Save/delete buttons
 *
 * Grandmother Principle:
 * - "Save your note" not "Persist annotation"
 * - Confirmation before delete
 * - Clear error messages if something goes wrong
 */

import { useState } from "react";
import { MarkdownEditor } from "./MarkdownEditor";
import {
  CrossReferencePicker,
  type CrossRefEntry,
} from "./CrossReferencePicker";
import { VerseCitePicker } from "./VerseCitePicker";
import { supabase } from "../lib/supabase";
import {
  createAnnotation,
  updateAnnotation,
  softDeleteAnnotation,
} from "../lib/annotations";
import {
  saveAnnotationLocally,
  addToSyncQueue,
  type OfflineAnnotation,
} from "../lib/offline-store";
import type { Annotation, AnnotationFormData } from "../types/annotation";
import type { BookId } from "../types/bible";
import { BOOK_BY_ID } from "../lib/constants";

interface AnnotationPanelProps {
  /** The user's ID (from auth) */
  userId: string;
  /** Bible translation */
  translation: string;
  /** Book being annotated */
  book: string;
  /** Chapter being annotated */
  chapter: number;
  /** Start verse of the anchor */
  verseStart: number;
  /** End verse of the anchor */
  verseEnd: number;
  /** Existing annotation to edit (null for new) */
  existing?: Annotation | null;
  /** Called after save or delete to refresh the parent view */
  onComplete?: () => void;
  /** Workspace mode: called with the saved annotation for in-place list update */
  onSaved?: (annotation: Annotation) => void;
  /** Workspace mode: called with the deleted annotation ID for in-place list update */
  onDeleted?: (id: string) => void;
}

export function AnnotationPanel({
  userId,
  translation,
  book,
  chapter,
  verseStart,
  verseEnd,
  existing = null,
  onComplete,
  onSaved,
  onDeleted,
}: AnnotationPanelProps) {
  const [content, setContent] = useState(existing?.contentMd ?? "");
  const [crossRefs, setCrossRefs] = useState<CrossRefEntry[]>(
    existing?.crossReferences.map((ref) => ({
      book: ref.book,
      chapter: ref.chapter,
      verseStart: ref.verseStart,
      verseEnd: ref.verseEnd,
    })) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // After a successful delete, we stay on the panel so the user can
  // re-save the content if they change their mind (undo-like behavior).
  const [justDeleted, setJustDeleted] = useState(false);

  const bookInfo = BOOK_BY_ID.get(book as BookId);
  const verseLabel =
    verseStart === verseEnd
      ? `${bookInfo?.name ?? book} ${chapter}:${verseStart}`
      : `${bookInfo?.name ?? book} ${chapter}:${verseStart}-${verseEnd}`;

  async function handleSave() {
    if (!content.trim()) {
      setError("Please write something before saving.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const formData: AnnotationFormData = {
        translation,
        anchor: {
          book: book as BookId,
          chapter,
          verseStart,
          verseEnd,
        },
        contentMd: content,
        crossReferences: crossRefs,
      };

      let savedAnnotation: Annotation;

      // Always try Supabase first — navigator.onLine is unreliable on mobile
      // and service-worker pages. If the network call fails, fall back to
      // offline save (IndexedDB + sync queue).
      try {
        if (existing && !justDeleted) {
          savedAnnotation = await updateAnnotation(supabase, existing.id, formData);
        } else {
          savedAnnotation = await createAnnotation(supabase, userId, formData);
        }
      } catch {
        // Supabase call failed (network down, timeout, etc.) — save offline
        savedAnnotation = await saveOffline(formData);
      }

      // Notify workspace (if present) so the annotation list updates in-place
      onSaved?.(savedAnnotation);
      // If re-saving after a delete, revert to standard edit state
      if (justDeleted) {
        setJustDeleted(false);
      } else {
        onComplete?.();
      }
    } catch (err) {
      setError("Couldn't save your note. Please try again.");
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  /**
   * Saves an annotation to IndexedDB and queues it for sync.
   * Returns an Annotation object so the workspace UI can update in-place.
   */
  async function saveOffline(formData: AnnotationFormData): Promise<Annotation> {
    const now = new Date().toISOString();
    const isUpdate = !!existing;
    const id = isUpdate ? existing!.id : crypto.randomUUID();

    // Build the local annotation record
    const offlineRecord: OfflineAnnotation = {
      id,
      userId,
      translation: formData.translation,
      book: formData.anchor.book,
      chapter: formData.anchor.chapter,
      verseStart: formData.anchor.verseStart,
      verseEnd: formData.anchor.verseEnd,
      contentMd: formData.contentMd,
      isPublic: false,
      crossReferences: formData.crossReferences.map((ref) => ({
        book: ref.book,
        chapter: ref.chapter,
        verseStart: ref.verseStart,
        verseEnd: ref.verseEnd,
      })),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
      syncStatus: isUpdate ? "pending_update" : "pending_create",
    };

    // Save to IndexedDB
    await saveAnnotationLocally(offlineRecord);

    // Queue for sync when connectivity returns.
    // Strip syncStatus from the data since SyncQueueItem.data
    // uses Omit<OfflineAnnotation, "syncStatus">
    const { syncStatus: _, ...syncData } = offlineRecord;
    await addToSyncQueue({
      id: crypto.randomUUID(),
      operation: isUpdate ? "update" : "create",
      annotationId: id,
      data: syncData,
      queuedAt: now,
    });

    // Return a full Annotation so the workspace UI updates immediately
    return {
      id,
      userId,
      translation: formData.translation,
      anchor: formData.anchor,
      contentMd: formData.contentMd,
      isPublic: false,
      crossReferences: formData.crossReferences.map((ref, index) => ({
        // Temporary IDs for UI rendering — real IDs created on sync
        id: `offline-${id}-xref-${index}`,
        annotationId: id,
        book: ref.book as BookId,
        chapter: ref.chapter,
        verseStart: ref.verseStart,
        verseEnd: ref.verseEnd,
      })),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
    };
  }

  async function handleDelete() {
    if (!existing) return;

    setDeleting(true);
    setError(null);

    try {
      // Always try Supabase first — fall back to offline delete if it fails
      let deletedOnline = false;
      try {
        await softDeleteAnnotation(supabase, existing.id);
        deletedOnline = true;
      } catch {
        // Supabase call failed — queue for offline deletion
      }

      if (!deletedOnline) {
        const now = new Date().toISOString();
        const deleteRecord: OfflineAnnotation = {
          id: existing.id,
          userId: existing.userId,
          translation: existing.translation,
          book: existing.anchor.book,
          chapter: existing.anchor.chapter,
          verseStart: existing.anchor.verseStart,
          verseEnd: existing.anchor.verseEnd,
          contentMd: existing.contentMd,
          isPublic: existing.isPublic,
          crossReferences: existing.crossReferences.map((ref) => ({
            book: ref.book,
            chapter: ref.chapter,
            verseStart: ref.verseStart,
            verseEnd: ref.verseEnd,
          })),
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
          deletedAt: now,
          syncStatus: "pending_delete",
        };
        await saveAnnotationLocally(deleteRecord);
        await addToSyncQueue({
          id: crypto.randomUUID(),
          operation: "delete",
          annotationId: existing.id,
          queuedAt: now,
        });
      }
      // Notify workspace so the annotation list updates in-place
      onDeleted?.(existing.id);
      // Stay on the panel with the content still visible — the user
      // can re-save if they change their mind, or navigate away.
      setJustDeleted(true);
    } catch (err) {
      setError("Couldn't delete your note. Please try again.");
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header — shows which verse(s) this note is for */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          {justDeleted
            ? "Moved to Recycle Bin"
            : existing
              ? "Edit your note"
              : "Write a note"}
        </h3>
        <p className="text-sm text-gray-500 mt-1">{verseLabel}</p>
      </div>

      {/* Error message */}
      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Markdown editor — with Cite button wired to VerseCitePicker */}
      <MarkdownEditor
        initialContent={existing?.contentMd ?? ""}
        onChange={setContent}
        placeholder="Write your thoughts about this verse..."
        extraToolbarSlot={({ insertText }) => (
          <VerseCitePicker
            anchorBook={book as BookId}
            anchorChapter={chapter}
            anchorVerseStart={verseStart}
            anchorVerseEnd={verseEnd}
            crossReferences={crossRefs}
            translation={translation}
            onCite={insertText}
          />
        )}
      />

      {/* Cross-references */}
      <CrossReferencePicker
        references={crossRefs}
        onChange={setCrossRefs}
        anchorBook={book as BookId}
        anchorChapter={chapter}
        anchorVerseStart={verseStart}
        anchorVerseEnd={verseEnd}
      />

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {saving
            ? "Saving..."
            : justDeleted
              ? "Save Recently Deleted Note"
              : "Save your note"}
        </button>

        {/* Post-delete state: link back to My Notes instead of delete controls.
            Uses <a> so middle-click (open in new tab) works as expected. */}
        {justDeleted && (
          <a
            href="/app/search"
            className="rounded-lg px-4 py-2.5 text-sm text-gray-600
                       hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Return to My Notes
          </a>
        )}

        {/* Normal state: delete button and confirmation */}
        {existing && !justDeleted && !showDeleteConfirm && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-lg px-4 py-2.5 text-sm text-red-600
                       hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Delete
          </button>
        )}

        {/* Delete confirmation — Grandmother Principle: confirm before action */}
        {showDeleteConfirm && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-600">Move to Recycle Bin?</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white
                         hover:bg-red-700 disabled:opacity-50
                         focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {deleting ? "Moving..." : "Yes, move it"}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded px-3 py-1.5 text-sm text-gray-600
                         hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
