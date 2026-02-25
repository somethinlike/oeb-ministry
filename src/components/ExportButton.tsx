/**
 * ExportButton — download annotations as Markdown files.
 *
 * Two modes:
 * 1. Single annotation → downloads one .md file
 * 2. All annotations → downloads a .zip file
 *
 * Grandmother Principle:
 * - "Download your notes" not "Export annotations as Markdown"
 * - Simple button with download icon
 * - Loading state while generating the zip
 */

import { useState } from "react";
import { supabase } from "../lib/supabase";
import {
  annotationToMarkdown,
  annotationFilename,
  exportAnnotationsAsZip,
} from "../lib/export";
import type { Annotation } from "../types/annotation";
import type { BookId } from "../types/bible";

interface ExportButtonProps {
  /** Export a single annotation (if provided) */
  annotation?: Annotation;
  /** User ID for batch export */
  userId?: string;
  /** Visual variant */
  variant?: "primary" | "secondary";
}

export function ExportButton({
  annotation,
  userId,
  variant = "secondary",
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);

    try {
      if (annotation) {
        // Single annotation download
        const md = annotationToMarkdown(annotation);
        const filename = annotationFilename(annotation);
        downloadFile(md, filename, "text/markdown");
      } else if (userId) {
        // Batch export — fetch all user annotations and zip them
        const { data, error } = await supabase
          .from("annotations")
          .select("*")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .order("book")
          .order("chapter")
          .order("verse_start");

        if (error) throw error;

        const annotations: Annotation[] = (data ?? []).map((row) => ({
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
          crossReferences: [],
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          deletedAt: row.deleted_at,
        }));

        if (annotations.length === 0) {
          alert("You don't have any notes to download yet.");
          return;
        }

        const blob = await exportAnnotationsAsZip(annotations);
        downloadBlob(blob, "oeb-ministry-notes.zip");
      }
    } catch (err) {
      console.error("Export failed:", err);
      alert("Something went wrong downloading your notes. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const buttonClass =
    variant === "primary"
      ? "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      : "rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50";

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className={buttonClass}
      aria-label={
        annotation ? "Download this note" : "Download all your notes"
      }
    >
      {loading ? (
        "Preparing download..."
      ) : (
        <>
          <span aria-hidden="true">&#8595; </span>
          {annotation ? "Download" : "Download all notes"}
        </>
      )}
    </button>
  );
}

/** Triggers a file download from a string. */
function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}

/** Triggers a file download from a Blob. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
