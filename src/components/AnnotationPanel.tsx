/**
 * AnnotationPanel — create/edit/view an annotation.
 *
 * This is the main "write a note" interface. It combines:
 * - Markdown editor (for content)
 * - Cross-reference picker (for related verses)
 * - Lock toggle (client-side encryption)
 * - Save/delete buttons
 *
 * Grandmother Principle:
 * - "Save your note" not "Persist annotation"
 * - "Lock this note" not "Encrypt annotation"
 * - Confirmation before delete
 * - Clear error messages if something goes wrong
 */

import { useState, useEffect, useCallback } from "react";
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
import { loadChapter } from "../lib/bible-loader";
import { extractVerseText } from "../lib/verse-text";
import { useEncryption } from "./EncryptionProvider";
import { UnlockPrompt } from "./EncryptionSetup";
import {
  encryptContent,
  decryptContent,
  uint8ToBase64,
  base64ToUint8,
} from "../lib/crypto";

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
  const isEncryptedNote = existing?.isEncrypted ?? false;

  // For encrypted notes, content starts empty — filled by the decryption effect.
  // For plaintext notes, content starts with the existing value.
  const [content, setContent] = useState(
    isEncryptedNote ? "" : (existing?.contentMd ?? ""),
  );
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

  // ── Encryption state ──
  const {
    hasEncryption,
    isUnlocked,
    cryptoKey,
  } = useEncryption();

  // Whether the user wants this note locked (encrypted on save)
  const [locked, setLocked] = useState(isEncryptedNote);
  // Whether the editor content is ready to display (false while decrypting)
  const [contentReady, setContentReady] = useState(!isEncryptedNote);
  // Modal visibility
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);

  // Auto-decrypt encrypted notes when the CryptoKey becomes available.
  // This fires after the user enters their passphrase in the UnlockPrompt.
  useEffect(() => {
    if (!isEncryptedNote || contentReady || !cryptoKey || !existing?.encryptionIv) return;

    decryptContent(
      base64ToUint8(existing.contentMd),
      cryptoKey,
      base64ToUint8(existing.encryptionIv),
    )
      .then((plaintext) => {
        setContent(plaintext);
        setContentReady(true);
      })
      .catch(() => {
        setError("Couldn't unlock this note. The passphrase may be wrong.");
      });
  }, [isEncryptedNote, contentReady, cryptoKey, existing?.contentMd, existing?.encryptionIv]);

  /** Toggle the lock state. Only reachable when hasEncryption is true. */
  const handleToggleLock = useCallback(() => {
    if (locked) {
      // Turning lock off — content stays as plaintext
      setLocked(false);
      return;
    }
    // Need key in memory to encrypt on save
    if (!isUnlocked) {
      setShowUnlockPrompt(true);
      return;
    }
    setLocked(true);
  }, [locked, isUnlocked]);

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
      // Capture the verse text — non-fatal if it fails
      let verseText: string | undefined;
      try {
        const chapterData = await loadChapter(translation, book as BookId, chapter);
        if (chapterData) {
          verseText = extractVerseText(chapterData, verseStart, verseEnd) ?? undefined;
        }
      } catch {
        // Verse text capture is best-effort — don't block the save
      }

      // Encrypt content if the note is locked and the key is in memory
      let contentToSave = content;
      let isEncrypted = false;
      let encryptionIv: string | null = null;

      if (locked && cryptoKey) {
        const encrypted = await encryptContent(content, cryptoKey);
        contentToSave = uint8ToBase64(encrypted.ciphertext);
        isEncrypted = true;
        encryptionIv = uint8ToBase64(encrypted.iv);
      }

      const formData: AnnotationFormData = {
        translation,
        anchor: {
          book: book as BookId,
          chapter,
          verseStart,
          verseEnd,
        },
        contentMd: contentToSave,
        crossReferences: crossRefs,
        verseText,
        isEncrypted,
        encryptionIv,
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
      isEncrypted: formData.isEncrypted ?? false,
      encryptionIv: formData.encryptionIv ?? null,
      crossReferences: formData.crossReferences.map((ref) => ({
        book: ref.book,
        chapter: ref.chapter,
        verseStart: ref.verseStart,
        verseEnd: ref.verseEnd,
      })),
      verseText: formData.verseText ?? null,
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
      isEncrypted: formData.isEncrypted ?? false,
      encryptionIv: formData.encryptionIv ?? null,
      crossReferences: formData.crossReferences.map((ref, index) => ({
        // Temporary IDs for UI rendering — real IDs created on sync
        id: `offline-${id}-xref-${index}`,
        annotationId: id,
        book: ref.book as BookId,
        chapter: ref.chapter,
        verseStart: ref.verseStart,
        verseEnd: ref.verseEnd,
      })),
      verseText: formData.verseText ?? null,
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
          isEncrypted: existing.isEncrypted,
          encryptionIv: existing.encryptionIv,
          crossReferences: existing.crossReferences.map((ref) => ({
            book: ref.book,
            chapter: ref.chapter,
            verseStart: ref.verseStart,
            verseEnd: ref.verseEnd,
          })),
          verseText: existing.verseText ?? null,
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
    <>
      <div className="space-y-6">
        {/* Header — shows which verse(s) this note is for */}
        <div>
          <h3 className="text-lg font-semibold text-heading">
            {justDeleted
              ? "Moved to Recycle Bin"
              : existing
                ? "Edit your note"
                : "Write a note"}
          </h3>
          <p className="text-sm text-muted mt-1">{verseLabel}</p>
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

        {/* Locked note — enter passphrase to read.
            Shown when opening an encrypted note without the key in memory. */}
        {isEncryptedNote && !contentReady && (
          <div className="rounded-lg border border-edge bg-surface-alt p-6 text-center space-y-3">
            <svg
              className="mx-auto h-8 w-8 text-muted"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p className="text-sm text-heading font-medium">
              This note is locked
            </p>
            <p className="text-xs text-muted">
              Enter your passphrase to read and edit it.
            </p>
            <button
              type="button"
              onClick={() => setShowUnlockPrompt(true)}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent
                         hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Unlock
            </button>
          </div>
        )}

        {/* Editor + controls — shown when content is ready (always for plaintext, after decrypt for locked) */}
        {contentReady && (
          <>
            {/* Markdown editor — with Cite button wired to VerseCitePicker */}
            <MarkdownEditor
              initialContent={content}
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

            {/* Lock toggle — only shown when user has set up encryption in Settings.
                Grandma never sees this. Tier 1 language: "Lock this note" not "Encrypt". */}
            {hasEncryption && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleLock}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium
                              transition-colors focus:outline-none focus:ring-2 focus:ring-ring
                              ${locked
                                ? "bg-surface-alt border border-edge text-heading"
                                : "text-muted hover:bg-surface-hover border border-transparent"
                              }`}
                  aria-pressed={locked}
                >
                  {locked ? (
                    <>
                      {/* Closed padlock icon */}
                      <svg
                        className="h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Locked
                    </>
                  ) : (
                    <>
                      {/* Open padlock icon */}
                      <svg
                        className="h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                      </svg>
                      Lock this note
                    </>
                  )}
                </button>
                {locked && (
                  <span className="text-xs text-muted">Only you can read this note</span>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-accent px-6 py-2.5 font-medium text-on-accent
                           hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed
                           focus:outline-none focus:ring-2 focus:ring-ring"
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
                  className="rounded-lg px-4 py-2.5 text-sm text-muted
                             hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-ring"
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
                    className="rounded px-3 py-1.5 text-sm text-muted
                               hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Unlock prompt — rendered outside the main panel div since it
          uses fixed positioning for full-screen overlay. */}
      {showUnlockPrompt && (
        <UnlockPrompt
          onUnlocked={() => {
            setShowUnlockPrompt(false);
            // If unlocking to turn on the lock toggle (not to decrypt an existing note),
            // set locked = true. For existing encrypted notes, the decryption useEffect
            // fires automatically once the key is in memory.
            if (!isEncryptedNote || contentReady) {
              setLocked(true);
            }
          }}
          onCancel={() => setShowUnlockPrompt(false)}
        />
      )}
    </>
  );
}
