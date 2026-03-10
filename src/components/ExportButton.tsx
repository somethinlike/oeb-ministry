/**
 * ExportButton — download annotations as a dual-format zip (HTML + Markdown).
 *
 * Two modes:
 * 1. Single annotation → downloads one .md file (no translation picker)
 * 2. Batch mode → translation dropdown + download button → downloads zip
 *
 * Grandmother Principle:
 * - "Download your notes" not "Export annotations"
 * - Translation dropdown with clear labels
 * - Button disabled until user explicitly picks a translation
 */

import { useState } from "react";
import { supabase } from "../lib/supabase";
import {
  annotationToMarkdown,
  annotationFilename,
  exportAnnotationsAsZip,
  resolveVerseText,
  type ExportContext,
} from "../lib/export";
import { loadTranslationToggles } from "../lib/translation-toggles";
import { SUPPORTED_TRANSLATIONS } from "../lib/constants";
import type { Annotation } from "../types/annotation";
import type { BookId } from "../types/bible";
import type { ChapterData } from "../types/bible";

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
  const [selectedTranslation, setSelectedTranslation] = useState("");

  // Single-annotation mode: simple download button, no dropdown
  if (annotation) {
    return (
      <button
        type="button"
        onClick={() => handleSingleExport(annotation)}
        disabled={loading}
        className={buttonClass(variant)}
        aria-label="Download this note"
      >
        {loading ? (
          "Preparing download..."
        ) : (
          <>
            <span aria-hidden="true">&#8595; </span>
            Download
          </>
        )}
      </button>
    );
  }

  // Batch mode: translation dropdown + download button
  const translationInfo = SUPPORTED_TRANSLATIONS.find(
    (t) => t.id === selectedTranslation,
  );

  async function handleBatchExport() {
    if (!userId || !selectedTranslation) return;

    setLoading(true);

    try {
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
        isEncrypted: row.is_encrypted ?? false,
        encryptionIv: row.encryption_iv ?? null,
        crossReferences: [],
        verseText: row.verse_text ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at,
      }));

      if (annotations.length === 0) {
        alert("You don't have any notes to download yet.");
        return;
      }

      const toggles = loadTranslationToggles();
      const context: ExportContext = {
        annotations,
        translationId: selectedTranslation,
        translationName: translationInfo?.name ?? selectedTranslation,
        toggles,
      };

      const blob = await exportAnnotationsAsZip(context);
      downloadBlob(blob, "oeb-ministry-notes.zip");
    } catch (err) {
      console.error("Export failed:", err);
      alert("Something went wrong downloading your notes. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSingleExport(ann: Annotation) {
    setLoading(true);
    try {
      const toggles = loadTranslationToggles();
      const chapterCache = new Map<string, ChapterData | null>();
      const verseText = await resolveVerseText(
        ann,
        ann.translation,
        toggles,
        chapterCache,
      );
      const tInfo = SUPPORTED_TRANSLATIONS.find((t) => t.id === ann.translation);
      const md = annotationToMarkdown(ann, verseText, tInfo?.name ?? ann.translation);
      const filename = annotationFilename(ann);
      downloadFile(md, filename, "text/markdown");
    } catch (err) {
      console.error("Export failed:", err);
      alert("Something went wrong downloading your note. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <select
        value={selectedTranslation}
        onChange={(e) => setSelectedTranslation(e.target.value)}
        className="rounded-lg border border-input-border bg-panel px-3 py-2 text-sm text-heading
                   focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        aria-label="Choose a translation for export"
      >
        <option value="" disabled>
          Choose a translation...
        </option>
        {SUPPORTED_TRANSLATIONS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.abbreviation} — {t.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={handleBatchExport}
        disabled={loading || !selectedTranslation}
        className={buttonClass(variant)}
        aria-label="Download all your notes"
      >
        {loading ? (
          "Preparing download..."
        ) : (
          <>
            <span aria-hidden="true">&#8595; </span>
            Download all notes
          </>
        )}
      </button>
    </div>
  );
}

function buttonClass(variant: "primary" | "secondary"): string {
  return variant === "primary"
    ? "rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
    : "rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-body hover:bg-surface-alt focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed";
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
