/**
 * Tests for TranslationUpload — the upload wizard for user Bible translations.
 *
 * Covers the initial "pick" step: drop zone rendering, file input configuration,
 * and keyboard accessibility. Parsing and later steps are tested via mocked
 * parser modules but the primary focus here is user-visible behavior of the
 * file picker UI.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

    // The file input is hidden (aria-hidden) but present in the DOM.
    // We query by role with hidden: true since it has aria-hidden="true".
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    expect(fileInput).toBeInTheDocument();
    expect(fileInput.accept).toBe(".epub,.txt");
  });

  it("drop zone is keyboard accessible (role='button', tabIndex=0)", () => {
    render(<TranslationUpload onSaved={mockOnSaved} />);

    // The drop zone has an aria-label for screen readers
    const dropZone = screen.getByRole("button", {
      name: "Upload a Bible translation file",
    });

    expect(dropZone).toBeInTheDocument();
    expect(dropZone).toHaveAttribute("tabindex", "0");
  });
});
