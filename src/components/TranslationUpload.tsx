/**
 * TranslationUpload — upload wizard for user Bible translations.
 *
 * Flow:
 * 1. File picker + drag-and-drop (accepts .epub and .txt)
 * 2. Parse the file
 * 3. Choose translation — pick an existing one (merge/replace) or create new
 * 4. Preview parsed content, then save to IndexedDB (+ auto-backup)
 *
 * Grandmother Principle:
 * - Clear instructions, large drop zone
 * - Translation choice is the first decision after parsing — not buried
 * - Preview shows exactly what was found before saving
 * - Warnings are shown but don't block saving
 * - Backup happens silently when encryption is unlocked (no interruption)
 */

import { useState, useRef, useCallback, useEffect } from "react";
import type { ParseResult } from "../types/user-translation";
import type { UserTranslationManifest } from "../types/user-translation";
import { parseEpub } from "../lib/epub-parser";
import { parseTextBible } from "../lib/text-parser";
import { saveUserTranslation, getUserTranslationManifest, getUserTranslationManifests } from "../lib/user-translations";
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
}

type UploadStep = "pick" | "parsing" | "select" | "saving" | "done" | "error";

/** Whether the user is adding to an existing translation or creating a new one */
type SelectionMode = "existing" | "new";

export function TranslationUpload({
  onSaved, userId, cryptoKey, canBackup,
}: TranslationUploadProps) {
  const [step, setStep] = useState<UploadStep>("pick");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState<"epub" | "text">("text");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Translation selection state
  const [existingManifests, setExistingManifests] = useState<UserTranslationManifest[]>([]);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("new");
  const [selectedTranslationId, setSelectedTranslationId] = useState<string | null>(null);
  const [mergeMode, setMergeMode] = useState<"merge" | "replace">("merge");

  // New translation fields
  const [newName, setNewName] = useState("");
  const [newAbbreviation, setNewAbbreviation] = useState("");
  const [abbrConflict, setAbbrConflict] = useState(false);

  /** Called when a file is selected or dropped. Goes straight to parsing. */
  const onFileSelected = useCallback((file: File) => {
    parseFile(file);
  }, []);

  /** Parse the selected file, load existing translations, and move to select. */
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

      // Load existing translations so the user can pick one
      const manifests = await getUserTranslationManifests();
      setExistingManifests(manifests);

      // Default: if translations already exist, start on "existing" mode
      // so the user sees their options first. Otherwise start on "new".
      if (manifests.length > 0) {
        setSelectionMode("existing");
        setSelectedTranslationId(manifests[0].translation);
      } else {
        setSelectionMode("new");
      }

      // Pre-fill new translation fields from filename
      const baseName = file.name.replace(/\.(epub|txt)$/i, "");
      setNewName(baseName);
      setNewAbbreviation(baseName.slice(0, 6).toUpperCase());
      setAbbrConflict(false);

      setStep("select");
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong parsing the file.",
      );
      setStep("error");
    }
  }, []);

  /** Check if the new abbreviation conflicts with an existing translation */
  async function checkAbbrConflict(abbr: string) {
    const idBase = abbr.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!idBase) { setAbbrConflict(false); return; }
    const existing = await getUserTranslationManifest(`user-${idBase}`);
    setAbbrConflict(existing !== undefined);
  }

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

  async function handleSave() {
    if (!parseResult) return;

    // Determine which translation we're saving into
    let translationId: string;
    let manifestName: string;
    let manifestAbbr: string;
    let saveMode: "merge" | "replace";

    if (selectionMode === "existing" && selectedTranslationId) {
      // Saving into an existing translation
      const existing = existingManifests.find((m) => m.translation === selectedTranslationId);
      if (!existing) return;
      translationId = existing.translation;
      manifestName = existing.name;
      manifestAbbr = existing.abbreviation;
      saveMode = mergeMode;
    } else {
      // Creating a new translation
      if (!newName.trim() || !newAbbreviation.trim()) return;
      const idBase = newAbbreviation.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      translationId = `user-${idBase}`;
      manifestName = newName.trim();
      manifestAbbr = newAbbreviation.trim().toUpperCase();
      saveMode = "merge"; // New translation, so merge is the same as fresh save
    }

    setStep("saving");
    try {
      const manifest: UserTranslationManifest = {
        translation: translationId,
        name: manifestName,
        abbreviation: manifestAbbr,
        language: "en",
        license: "Personal use",
        books: [], // Will be computed by saveUserTranslation
        uploadedAt: new Date().toISOString(),
        originalFilename: fileName,
        fileType,
      };

      await saveUserTranslation(manifest, parseResult, saveMode);

      // Auto-backup to Supabase if encryption is unlocked
      const shouldBackup = userId && cryptoKey && canBackup;
      if (shouldBackup) {
        try {
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
    setNewName("");
    setNewAbbreviation("");
    setErrorMsg("");
    setExistingManifests([]);
    setSelectionMode("new");
    setSelectedTranslationId(null);
    setMergeMode("merge");
    setAbbrConflict(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── File picker / drop zone ──
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

  // ── Translation selection + preview ──
  if (step === "select" && parseResult) {
    const totalChapters = parseResult.books.reduce(
      (sum, b) => sum + b.chapters.length, 0,
    );
    const totalVerses = parseResult.books.reduce(
      (sum, b) => sum + b.chapters.reduce((cs, c) => cs + c.verses.length, 0), 0,
    );

    const selectedExisting = selectionMode === "existing"
      ? existingManifests.find((m) => m.translation === selectedTranslationId) ?? null
      : null;

    // Can we save? Either a valid existing selection or valid new fields
    const canSave = selectionMode === "existing"
      ? selectedTranslationId !== null
      : newName.trim().length > 0 && newAbbreviation.trim().length > 0 && !abbrConflict;

    // Build the save button label
    let saveLabel = "Save translation";
    if (selectionMode === "existing" && selectedExisting) {
      saveLabel = mergeMode === "replace"
        ? `Replace ${selectedExisting.abbreviation}`
        : `Add books to ${selectedExisting.abbreviation}`;
    }

    return (
      <div className="space-y-5">
        {/* ── Parsed content preview ── */}
        <div className="rounded-lg border border-edge bg-surface-alt p-4">
          <p className="text-sm font-medium text-heading mb-2">
            Found in {fileName}:
          </p>
          <div className="flex gap-6 text-sm text-body">
            <span>{parseResult.books.length} books</span>
            <span>{totalChapters} chapters</span>
            <span>{totalVerses.toLocaleString()} verses</span>
          </div>
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

        {/* ── Translation selection ── */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-heading">
            Which translation is this?
          </legend>

          {/* Existing translations */}
          {existingManifests.length > 0 && (
            <div className="space-y-2">
              {existingManifests.map((m) => (
                <label
                  key={m.translation}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    selectionMode === "existing" && selectedTranslationId === m.translation
                      ? "border-accent bg-accent-soft"
                      : "border-edge hover:border-accent/50 hover:bg-surface-alt"
                  }`}
                >
                  <input
                    type="radio"
                    name="translation-target"
                    value={m.translation}
                    checked={selectionMode === "existing" && selectedTranslationId === m.translation}
                    onChange={() => {
                      setSelectionMode("existing");
                      setSelectedTranslationId(m.translation);
                    }}
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-heading">{m.abbreviation}</span>
                    <span className="text-sm text-body"> — {m.name}</span>
                    <p className="text-xs text-muted">
                      {m.books.length} book{m.books.length === 1 ? "" : "s"} uploaded
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Create new translation */}
          <label
            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
              selectionMode === "new"
                ? "border-accent bg-accent-soft"
                : "border-edge hover:border-accent/50 hover:bg-surface-alt"
            }`}
          >
            <input
              type="radio"
              name="translation-target"
              value="__new__"
              checked={selectionMode === "new"}
              onChange={() => {
                setSelectionMode("new");
                setSelectedTranslationId(null);
              }}
              className="shrink-0 mt-0.5"
            />
            <span className="text-sm font-medium text-heading">Create a new translation</span>
          </label>

          {/* New translation fields — only visible when "new" is selected */}
          {selectionMode === "new" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pl-7">
              <div>
                <label htmlFor="translation-name" className="block text-sm font-medium text-heading mb-1">
                  Name
                </label>
                <input
                  id="translation-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
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
                  value={newAbbreviation}
                  onChange={(e) => setNewAbbreviation(e.target.value)}
                  onBlur={(e) => checkAbbrConflict(e.target.value)}
                  placeholder="e.g., NRSV"
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                    abbrConflict
                      ? "border-amber-400 focus:border-amber-500"
                      : "border-input-border focus:border-ring"
                  }`}
                  maxLength={10}
                />
                {abbrConflict && (
                  <p className="mt-1 text-xs text-amber-600">
                    You already have a translation with this abbreviation. Choose a different one, or select it above to add books to it.
                  </p>
                )}
              </div>
            </div>
          )}
        </fieldset>

        {/* Merge/replace options — only when an existing translation is selected */}
        {selectionMode === "existing" && selectedExisting && (
          <fieldset className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-2">
            <legend className="sr-only">Choose how to handle existing books</legend>
            <p className="text-sm text-blue-800 font-medium">
              {selectedExisting.abbreviation} already has {selectedExisting.books.length} book{selectedExisting.books.length === 1 ? "" : "s"}.
            </p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="merge-mode"
                value="merge"
                checked={mergeMode === "merge"}
                onChange={() => setMergeMode("merge")}
                className="mt-0.5"
              />
              <span className="text-sm text-blue-900">
                <span className="font-medium">Add</span> — keep existing books, add new ones alongside them
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="merge-mode"
                value="replace"
                checked={mergeMode === "replace"}
                onChange={() => setMergeMode("replace")}
                className="mt-0.5"
              />
              <span className="text-sm text-blue-900">
                <span className="font-medium">Replace</span> — remove all existing books and start fresh with this upload
              </span>
            </label>
          </fieldset>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveLabel}
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
    const wasExisting = selectionMode === "existing"
      ? existingManifests.find((m) => m.translation === selectedTranslationId) ?? null
      : null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-green-700">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">
            {wasExisting
              ? (mergeMode === "replace" ? "Translation replaced!" : "Books added!")
              : "Translation saved!"
            }
            {" "}You can now select it in the reader.
          </span>
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
