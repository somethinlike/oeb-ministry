/**
 * Tests for TranslationUpload — the upload wizard for user Bible translations.
 *
 * Covers the initial "pick" step: drop zone rendering, file input configuration,
 * and keyboard accessibility. Also verifies that file selection goes straight
 * to parsing without any intermediate prompts.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TranslationUpload } from "./TranslationUpload";
import type { ParseResult } from "../types/user-translation";

// ── Module mocks ──
// The component imports these at the top level, so we mock them
// before any test renders the component.
vi.mock("../lib/epub-parser", () => ({
  parseEpub: vi.fn(),
}));
vi.mock("../lib/text-parser", () => ({
  parseTextBible: vi.fn(),
}));
vi.mock("../lib/user-translations", () => ({
  saveUserTranslation: vi.fn().mockResolvedValue(undefined),
  getUserTranslationManifest: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../lib/supabase", () => ({
  supabase: {},
}));
vi.mock("../lib/translation-backup", () => ({
  backupTranslation: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../lib/idb", () => ({
  getDb: vi.fn(),
}));

import { parseTextBible } from "../lib/text-parser";
import { getUserTranslationManifest } from "../lib/user-translations";

describe("TranslationUpload", () => {
  const mockOnSaved = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders drop zone with upload instructions", () => {
    render(<TranslationUpload onSaved={mockOnSaved} />);

    // The primary instruction text visible to the user
    expect(
      screen.getByText("Drop a file here, or click to browse"),
    ).toBeInTheDocument();

    // The secondary helper text about supported formats
    expect(
      screen.getByText("Supports .epub and .txt Bible files"),
    ).toBeInTheDocument();
  });

  it("shows file input that accepts .epub and .txt", () => {
    render(<TranslationUpload onSaved={mockOnSaved} />);

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    expect(fileInput).toBeInTheDocument();
    expect(fileInput.accept).toBe(".epub,.txt");
  });

  it("drop zone is keyboard accessible (label element, tabIndex=0)", () => {
    render(<TranslationUpload onSaved={mockOnSaved} />);

    // The drop zone uses a <label> with aria-label for native file input activation
    const dropZone = screen.getByLabelText("Upload a Bible translation file");

    expect(dropZone).toBeInTheDocument();
    expect(dropZone).toHaveAttribute("tabindex", "0");
  });

  describe("file selection", () => {
    it("goes straight to parsing when a file is selected (no backup prompt)", async () => {
      render(
        <TranslationUpload
          onSaved={mockOnSaved}
          userId="user-123"
          canBackup={true}
        />,
      );

      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const file = new File(["test content"], "bible.txt", { type: "text/plain" });
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Should go straight to parsing — no backup prompt
      await waitFor(() => {
        expect(screen.queryByText("Back up this translation?")).not.toBeInTheDocument();
      });
      // Drop zone should be gone (we moved past "pick" step)
      expect(screen.queryByText("Drop a file here, or click to browse")).not.toBeInTheDocument();
    });
  });

  describe("merge detection", () => {
    /** Helper: parse result with one book */
    const mockParseResult: ParseResult = {
      books: [{
        bookId: "jhn" as any,
        originalName: "John",
        chapters: [{ chapter: 1, verses: [{ number: 1, text: "Test." }] }],
      }],
      warnings: [],
    };

    /** Helper: upload a .txt file and wait for preview */
    async function uploadFileAndWaitForPreview() {
      const file = new File(["test content"], "NRSVUE.txt", { type: "text/plain" });
      vi.mocked(parseTextBible).mockResolvedValue(mockParseResult);

      render(<TranslationUpload onSaved={mockOnSaved} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Wait for preview step to render
      await waitFor(() => {
        expect(screen.getByText(/Found in NRSVUE.txt/)).toBeInTheDocument();
      });
    }

    it("shows merge banner when abbreviation matches existing translation", async () => {
      // Simulate an existing translation with the same abbreviation
      vi.mocked(getUserTranslationManifest).mockResolvedValue({
        translation: "user-nrsvue",
        name: "NRSVUE",
        abbreviation: "NRSVUE",
        language: "en",
        license: "Personal use",
        books: [
          { id: "gen", name: "Genesis", chapters: 50, testament: "OT" },
          { id: "exo", name: "Exodus", chapters: 40, testament: "OT" },
        ],
        uploadedAt: "2026-03-01T00:00:00Z",
        originalFilename: "nrsvue-ot.txt",
        fileType: "text",
      });

      await uploadFileAndWaitForPreview();

      // Should show merge banner with book counts
      expect(screen.getByText(/Adding to your existing NRSVUE translation/)).toBeInTheDocument();
      expect(screen.getByText(/2 existing books/)).toBeInTheDocument();
    });

    it("shows 'Merge into translation' button during merge", async () => {
      vi.mocked(getUserTranslationManifest).mockResolvedValue({
        translation: "user-nrsvue",
        name: "NRSVUE",
        abbreviation: "NRSVUE",
        language: "en",
        license: "Personal use",
        books: [{ id: "gen", name: "Genesis", chapters: 50, testament: "OT" }],
        uploadedAt: "2026-03-01T00:00:00Z",
        originalFilename: "nrsvue-ot.txt",
        fileType: "text",
      });

      await uploadFileAndWaitForPreview();

      // Save button should say "Merge" instead of "Save"
      expect(screen.getByRole("button", { name: "Merge into translation" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Save translation" })).not.toBeInTheDocument();
    });
  });
});
