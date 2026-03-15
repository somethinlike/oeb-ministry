/**
 * Tests for TranslationUpload — the upload wizard for user Bible translations.
 *
 * Covers the initial "pick" step: drop zone rendering, file input configuration,
 * and keyboard accessibility. Also covers the backup prompt flow when encryption
 * is set up but not yet unlocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TranslationUpload } from "./TranslationUpload";

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

  describe("backup prompt", () => {
    const mockOnUnlock = vi.fn();

    it("shows backup prompt when encryption is set up but locked", async () => {
      render(
        <TranslationUpload
          onSaved={mockOnSaved}
          hasEncryption={true}
          cryptoKey={null}
          onUnlock={mockOnUnlock}
          userId="user-123"
          canBackup={true}
        />,
      );

      // Simulate file selection via the hidden input
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const file = new File(["test content"], "bible.txt", { type: "text/plain" });
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Should see the backup prompt, NOT the parsing state
      expect(
        await screen.findByText("Back up this translation?"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Enter your passphrase to save an encrypted backup/),
      ).toBeInTheDocument();

      // Should have skip and cancel buttons
      expect(screen.getByText(/Skip/)).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();

      // Should have a passphrase input
      expect(screen.getByPlaceholderText("Your passphrase")).toBeInTheDocument();
    });

    it("skips backup prompt when encryption is already unlocked", async () => {
      // Use a real CryptoKey-like object (truthy value)
      const fakeCryptoKey = {} as CryptoKey;

      render(
        <TranslationUpload
          onSaved={mockOnSaved}
          hasEncryption={true}
          cryptoKey={fakeCryptoKey}
          onUnlock={mockOnUnlock}
          userId="user-123"
          canBackup={true}
        />,
      );

      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const file = new File(["test content"], "bible.txt", { type: "text/plain" });
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Should NOT show backup prompt — should go straight to parsing/error
      await waitFor(() => {
        expect(screen.queryByText("Back up this translation?")).not.toBeInTheDocument();
      });
    });

    it("skips backup prompt when no encryption is set up", async () => {
      render(
        <TranslationUpload
          onSaved={mockOnSaved}
          hasEncryption={false}
          userId="user-123"
        />,
      );

      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const file = new File(["test content"], "bible.txt", { type: "text/plain" });
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Should NOT show backup prompt
      await waitFor(() => {
        expect(screen.queryByText("Back up this translation?")).not.toBeInTheDocument();
      });
    });

    it("proceeds to parsing after user clicks skip", async () => {
      render(
        <TranslationUpload
          onSaved={mockOnSaved}
          hasEncryption={true}
          cryptoKey={null}
          onUnlock={mockOnUnlock}
          userId="user-123"
          canBackup={true}
        />,
      );

      // Select a file to trigger the backup prompt
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const file = new File(["test content"], "bible.txt", { type: "text/plain" });
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Wait for backup prompt
      await screen.findByText("Back up this translation?");

      // Click skip
      const skipButton = screen.getByText(/Skip/);
      await userEvent.click(skipButton);

      // Should leave the backup prompt (either parsing or error state)
      await waitFor(() => {
        expect(screen.queryByText("Back up this translation?")).not.toBeInTheDocument();
      });
    });

    it("calls onUnlock when user submits passphrase", async () => {
      mockOnUnlock.mockResolvedValue(true);

      render(
        <TranslationUpload
          onSaved={mockOnSaved}
          hasEncryption={true}
          cryptoKey={null}
          onUnlock={mockOnUnlock}
          userId="user-123"
          canBackup={true}
        />,
      );

      // Select a file to trigger the backup prompt
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const file = new File(["test content"], "bible.txt", { type: "text/plain" });
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Wait for backup prompt
      await screen.findByText("Back up this translation?");

      // Type passphrase and submit
      const passphraseInput = screen.getByPlaceholderText("Your passphrase");
      await userEvent.type(passphraseInput, "my-secret-phrase");

      const unlockButton = screen.getByRole("button", { name: "Unlock" });
      await userEvent.click(unlockButton);

      // Should have called onUnlock with the passphrase
      expect(mockOnUnlock).toHaveBeenCalledWith("my-secret-phrase");
    });

    it("shows error when passphrase is wrong", async () => {
      mockOnUnlock.mockResolvedValue(false);

      render(
        <TranslationUpload
          onSaved={mockOnSaved}
          hasEncryption={true}
          cryptoKey={null}
          onUnlock={mockOnUnlock}
          userId="user-123"
          canBackup={true}
        />,
      );

      // Select a file to trigger the backup prompt
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const file = new File(["test content"], "bible.txt", { type: "text/plain" });
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Wait for backup prompt
      await screen.findByText("Back up this translation?");

      // Type wrong passphrase and submit
      const passphraseInput = screen.getByPlaceholderText("Your passphrase");
      await userEvent.type(passphraseInput, "wrong-phrase");

      const unlockButton = screen.getByRole("button", { name: "Unlock" });
      await userEvent.click(unlockButton);

      // Should show error, stay on the backup prompt
      expect(
        await screen.findByText(/passphrase didn/),
      ).toBeInTheDocument();
      expect(screen.getByText("Back up this translation?")).toBeInTheDocument();
    });

    it("cancel returns to the file picker", async () => {
      render(
        <TranslationUpload
          onSaved={mockOnSaved}
          hasEncryption={true}
          cryptoKey={null}
          onUnlock={mockOnUnlock}
          userId="user-123"
          canBackup={true}
        />,
      );

      // Select a file to trigger the backup prompt
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const file = new File(["test content"], "bible.txt", { type: "text/plain" });
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Wait for backup prompt
      await screen.findByText("Back up this translation?");

      // Click cancel
      await userEvent.click(screen.getByText("Cancel"));

      // Should return to the drop zone
      expect(
        await screen.findByText("Drop a file here, or click to browse"),
      ).toBeInTheDocument();
    });
  });
});
