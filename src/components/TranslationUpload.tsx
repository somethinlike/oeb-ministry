/**
 * TranslationUpload — upload wizard for user Bible translations.
 *
 * Flow:
 * 1. File picker + drag-and-drop (accepts .epub and .txt)
 * 2. If encryption is set up but locked → backup prompt (unlock or skip)
 * 3. Parse the file and show preview (book/chapter counts, warnings)
 * 4. User enters a name and abbreviation
 * 5. Save to IndexedDB (+ auto-backup if unlocked)
 *
 * Grandmother Principle:
 * - Clear instructions, large drop zone
 * - Explicit backup prompt so users know a passphrase is needed
 * - Preview shows exactly what was found before saving
 * - Warnings are shown but don't block saving
 * - Progress feedback during parsing
 */

import { useState, useRef, useCallback } from "react";
import type { ParseResult } from "../types/user-translation";
import type { UserTranslationManifest } from "../types/user-translation";
import { parseEpub } from "../lib/epub-parser";
import { parseTextBible } from "../lib/text-parser";
import { saveUserTranslation, getUserTranslationManifest } from "../lib/user-translations";
import { backupTranslation } from "../lib/translation-backup";
import { supabase } from "../lib/supabase";
import { getDb } from "../lib/idb";
import type { StoredUserChapter } from "../types/user-translation";

interface TranslationUploadProps {
  /** Called after a translation is successfully saved */
  onSaved: () => void;
  /** User ID (needed for server backup) */
  userId?: string | null;
  /** CryptoKey for encrypting the backup (null = backup disabled) */
  cryptoKey?: CryptoKey | null;
  /** Whether the user has the required role for backup */
  canBackup?: boolean;
  /** Whether encryption has been set up (user has a passphrase) */
  hasEncryption?: boolean;
  /** Attempt to unlock with a passphrase. Returns true on success. */
  onUnlock?: (passphrase: string) => Promise<boolean>;
}

type UploadStep = "pick" | "backup-prompt" | "parsing" | "preview" | "saving" | "done" | "error";

export function TranslationUpload({
  onSaved, userId, cryptoKey, canBackup, hasEncryption, onUnlock,
}: TranslationUploadProps) {
  const [step, setStep] = useState<UploadStep>("pick");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState<"epub" | "text">("text");
  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Backup prompt state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [backupPassphrase, setBackupPassphrase] = useState("");
  const [backupUnlockError, setBackupUnlockError] = useState(false);
  const [backupUnlocking, setBackupUnlocking] = useState(false);
  // Tracks whether user explicitly skipped backup for this upload
  const [skippedBackup, setSkippedBackup] = useState(false);

  /** Called when a file is selected or dropped. May detour through backup prompt. */
  const onFileSelected = useCallback((file: File) => {
    // If encryption is set up but not yet unlocked, prompt before parsing
    if (hasEncryption && !cryptoKey && onUnlock) {
      setPendingFile(file);
      setFileName(file.name);
      setStep("backup-prompt");
      return;
    }
    // Otherwise go straight to parsing
    parseFile(file);
  }, [hasEncryption, cryptoKey, onUnlock]);

  /** Parse the selected file and move to preview. */
  const parseFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setStep("parsing");
    setErrorMsg("");

    try {
      let result: ParseResult;
      const ext = file.name.toLowerCase();

      if (ext.endsWith(".epub")) {
        setFileType("epub");
        result = await parseEpub(file);
      } else {
        setFileType("text");
        result = await parseTextBible(file);
      }

      if (result.books.length === 0) {
        setErrorMsg(
          result.warnings.length > 0
            ? `No Bible books found. ${result.warnings[0]}`
            : "No Bible books could be identified in this file.",
        );
        setStep("error");
        return;
      }

      setParseResult(result);
      // Default name from filename (strip extension)
      const baseName = file.name.replace(/\.(epub|txt)$/i, "");
      setName(baseName);
      setAbbreviation(baseName.slice(0, 6).toUpperCase());
      setStep("preview");
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong parsing the file.",
      );
      setStep("error");
    }
  }, []);

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  /** Handle passphrase unlock from the backup prompt. */
  async function handleBackupUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!backupPassphrase.trim() || !onUnlock) return;
    setBackupUnlocking(true);
    setBackupUnlockError(false);
    const ok = await onUnlock(backupPassphrase);
    setBackupUnlocking(false);
    if (ok) {
      // Unlocked — proceed to parsing with the pending file
      setBackupPassphrase("");
      if (pendingFile) parseFile(pendingFile);
    } else {
      setBackupUnlockError(true);
    }
  }

  /** User chose to skip backup — proceed with local-only save. */
  function handleSkipBackup() {
    setSkippedBackup(true);
    setBackupPassphrase("");
    if (pendingFile) parseFile(pendingFile);
  }

  async function handleSave() {
    if (!parseResult || !name.trim() || !abbreviation.trim()) return;

    setStep("saving");
    try {
      // Generate a URL-safe ID from the abbreviation
      const idBase = abbreviation.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      const translationId = `user-${idBase}`;

      const manifest: UserTranslationManifest = {
        translation: translationId,
        name: name.trim(),
        abbreviation: abbreviation.trim().toUpperCase(),
        language: "en",
        license: "Personal use",
        books: [], // Will be computed by saveUserTranslation
        uploadedAt: new Date().toISOString(),
        originalFilename: fileName,
        fileType,
      };

      await saveUserTranslation(manifest, parseResult);

      // Auto-backup to Supabase if unlocked and user didn't skip
      const shouldBackup = userId && cryptoKey && canBackup && !skippedBackup;
      if (shouldBackup) {
        try {
          // Read back the saved manifest (has computed book list) + all chapters
          const savedManifest = await getUserTranslationManifest(translationId);
          if (savedManifest) {
            const db = await getDb();
            const index = db.transaction("user-translation-chapters", "readonly").store.index("by-translation");
            const allChapters: StoredUserChapter[] = await index.getAll(translationId);
            await backupTranslation(supabase, userId, savedManifest, allChapters, cryptoKey);
          }
        } catch {
          // Backup is fire-and-forget — local save already succeeded
        }
      }

      setStep("done");
      onSaved();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Could not save the translation.",
      );
      setStep("error");
    }
  }

  function reset() {
    setStep("pick");
    setParseResult(null);
    setFileName("");
    setName("");
    setAbbreviation("");
    setErrorMsg("");
    setPendingFile(null);
    setBackupPassphrase("");
    setBackupUnlockError(false);
    setSkippedBackup(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── File picker / drop zone ──
  // Uses a native <label> + htmlFor so clicking anywhere in the zone
  // activates the file input without relying on programmatic .click(),
  // which Chrome can silently block on display:none inputs.
  if (step === "pick") {
    return (
      <div>
        <label
          htmlFor="translation-file-upload"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onKeyDown={(e) => {
            if (e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          tabIndex={0}
          className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
            dragging
              ? "border-accent bg-accent-soft"
              : "border-edge hover:border-accent hover:bg-surface-alt"
          }`}
          aria-label="Upload a Bible translation file"
        >
          {/* Upload icon */}
          <svg
            className="h-10 w-10 text-faint"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <p className="text-sm font-medium text-body">
            Drop a file here, or click to browse
          </p>
          <p className="text-xs text-muted">
            Supports .epub and .txt Bible files
          </p>
          <input
            id="translation-file-upload"
            ref={fileInputRef}
            type="file"
            accept=".epub,.txt"
            onChange={handleFileInput}
            className="sr-only"
          />
        </label>
      </div>
    );
  }

  // ── Backup prompt ──
  // Shown after file selection when encryption is set up but locked.
  // The user can unlock (enabling backup) or skip (local-only save).
  if (step === "backup-prompt") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-edge bg-surface-alt p-5">
          {/* Shield icon */}
          <div className="flex items-start gap-3">
            <svg
              className="h-6 w-6 shrink-0 text-accent mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-heading">
                Back up this translation?
              </p>
              <p className="text-sm text-muted mt-1">
                Enter your passphrase to save an encrypted backup to your account.
                Without it, this translation will only be stored on this device.
              </p>
            </div>
          </div>

          {/* Passphrase form */}
          <form onSubmit={handleBackupUnlock} className="mt-4">
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={backupPassphrase}
                onChange={(e) => { setBackupPassphrase(e.target.value); setBackupUnlockError(false); }}
                placeholder="Your passphrase"
                autoComplete="current-password"
                autoFocus
                className="flex-1 rounded-lg border border-input-border px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={backupUnlocking || !backupPassphrase.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                {backupUnlocking ? "Checking..." : "Unlock"}
              </button>
            </div>
            {backupUnlockError && (
              <p className="mt-2 text-xs text-red-600">
                That passphrase didn&rsquo;t work. Please try again.
              </p>
            )}
          </form>
        </div>

        {/* Skip + Cancel buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleSkipBackup}
            className="text-sm text-muted hover:text-body underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-ring rounded"
          >
            Skip — just save to this device
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-muted hover:bg-surface-alt focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Parsing state ──
  if (step === "parsing") {
    return (
      <div className="flex items-center gap-3 py-6" role="status" aria-label="Parsing file">
        <svg className="h-5 w-5 animate-spin text-accent" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-25" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-75" />
        </svg>
        <span className="text-sm text-body">Reading {fileName}...</span>
      </div>
    );
  }

  // ── Error state ──
  if (step === "error") {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
          <p className="text-sm text-red-700">{errorMsg}</p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-body hover:bg-surface-alt focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Preview + name/abbreviation ──
  if (step === "preview" && parseResult) {
    const totalChapters = parseResult.books.reduce(
      (sum, b) => sum + b.chapters.length, 0,
    );
    const totalVerses = parseResult.books.reduce(
      (sum, b) => sum + b.chapters.reduce((cs, c) => cs + c.verses.length, 0), 0,
    );

    return (
      <div className="space-y-4">
        {/* Skipped-backup notice so user knows what happened */}
        {skippedBackup && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span>This translation won&rsquo;t be backed up. You can enter your passphrase later to enable backups.</span>
          </div>
        )}

        {/* Stats */}
        <div className="rounded-lg border border-edge bg-surface-alt p-4">
          <p className="text-sm font-medium text-heading mb-2">
            Found in {fileName}:
          </p>
          <div className="flex gap-6 text-sm text-body">
            <span>{parseResult.books.length} books</span>
            <span>{totalChapters} chapters</span>
            <span>{totalVerses.toLocaleString()} verses</span>
          </div>
          {/* Book list */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {parseResult.books.map((b) => (
              <span
                key={b.bookId}
                className="inline-block rounded-full bg-panel border border-edge px-2 py-0.5 text-xs text-muted"
              >
                {b.originalName} ({b.chapters.length} ch)
              </span>
            ))}
          </div>
        </div>

        {/* Warnings */}
        {parseResult.warnings.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-amber-600 hover:text-amber-700 font-medium">
              {parseResult.warnings.length} warning{parseResult.warnings.length === 1 ? "" : "s"}
            </summary>
            <ul className="mt-2 space-y-1 text-amber-700">
              {parseResult.warnings.slice(0, 20).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
              {parseResult.warnings.length > 20 && (
                <li>...and {parseResult.warnings.length - 20} more</li>
              )}
            </ul>
          </details>
        )}

        {/* Name + abbreviation inputs */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="translation-name" className="block text-sm font-medium text-heading mb-1">
              Name
            </label>
            <input
              id="translation-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., New Revised Standard Version"
              className="w-full rounded-lg border border-input-border px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={100}
            />
          </div>
          <div>
            <label htmlFor="translation-abbr" className="block text-sm font-medium text-heading mb-1">
              Abbreviation
            </label>
            <input
              id="translation-abbr"
              type="text"
              value={abbreviation}
              onChange={(e) => setAbbreviation(e.target.value)}
              placeholder="e.g., NRSV"
              className="w-full rounded-lg border border-input-border px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={10}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || !abbreviation.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save translation
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-muted hover:bg-surface-alt focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Saving state ──
  if (step === "saving") {
    return (
      <div className="flex items-center gap-3 py-6" role="status">
        <svg className="h-5 w-5 animate-spin text-accent" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-25" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-75" />
        </svg>
        <span className="text-sm text-body">Saving to your browser...</span>
      </div>
    );
  }

  // ── Done state ──
  if (step === "done") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-green-700">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">Translation saved! You can now select it in the reader.</span>
        </div>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-muted hover:bg-surface-alt focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Upload another
        </button>
      </div>
    );
  }

  return null;
}
