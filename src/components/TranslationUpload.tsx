/**
 * TranslationUpload — upload wizard for user Bible translations.
 *
 * Flow:
 * 1. File picker + drag-and-drop (accepts .epub and .txt)
 * 2. Parse the file and show preview (book/chapter counts, warnings)
 * 3. User enters a name and abbreviation
 * 4. Save to IndexedDB
 *
 * Grandmother Principle:
 * - Clear instructions, large drop zone
 * - Preview shows exactly what was found before saving
 * - Warnings are shown but don't block saving
 * - Progress feedback during parsing
 */

import { useState, useRef, useCallback } from "react";
import type { ParseResult } from "../types/user-translation";
import type { UserTranslationManifest } from "../types/user-translation";
import { parseEpub } from "../lib/epub-parser";
import { parseTextBible } from "../lib/text-parser";
import { saveUserTranslation } from "../lib/user-translations";

interface TranslationUploadProps {
  /** Called after a translation is successfully saved */
  onSaved: () => void;
}

type UploadStep = "pick" | "parsing" | "preview" | "saving" | "done" | "error";

export function TranslationUpload({ onSaved }: TranslationUploadProps) {
  const [step, setStep] = useState<UploadStep>("pick");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState<"epub" | "text">("text");
  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
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
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── File picker / drop zone ──
  if (step === "pick") {
    return (
      <div>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          role="button"
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
            ref={fileInputRef}
            type="file"
            accept=".epub,.txt"
            onChange={handleFileInput}
            className="hidden"
            aria-hidden="true"
          />
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
