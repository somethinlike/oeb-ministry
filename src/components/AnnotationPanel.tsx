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
import { supabase } from "../lib/supabase";
import {
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
} from "../lib/annotations";
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

      if (existing) {
        await updateAnnotation(supabase, existing.id, formData);
      } else {
        await createAnnotation(supabase, userId, formData);
      }

      onComplete?.();
    } catch (err) {
      setError("Couldn't save your note. Please try again.");
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existing) return;

    setDeleting(true);
    setError(null);

    try {
      await deleteAnnotation(supabase, existing.id);
      onComplete?.();
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
          {existing ? "Edit your note" : "Write a note"}
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

      {/* Markdown editor */}
      <MarkdownEditor
        initialContent={existing?.contentMd ?? ""}
        onChange={setContent}
        placeholder="Write your thoughts about this verse..."
      />

      {/* Cross-references */}
      <CrossReferencePicker
        references={crossRefs}
        onChange={setCrossRefs}
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
          {saving ? "Saving..." : "Save your note"}
        </button>

        {existing && !showDeleteConfirm && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-lg px-4 py-2.5 text-sm text-red-600
                       hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Delete
          </button>
        )}

        {/* Delete confirmation — Grandmother Principle: confirm before irreversible action */}
        {showDeleteConfirm && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-600">Delete this note?</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white
                         hover:bg-red-700 disabled:opacity-50
                         focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {deleting ? "Deleting..." : "Yes, delete"}
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
