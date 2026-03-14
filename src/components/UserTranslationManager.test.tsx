/**
 * Tests for UserTranslationManager — lists and manages user-uploaded translations.
 *
 * Covers the loading state, empty state, populated list rendering, delete button
 * presence, and the confirmation/cancel flow for deletion. All IndexedDB
 * operations are mocked since tests run in jsdom without a real IndexedDB.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserTranslationManager } from "./UserTranslationManager";
import type { UserTranslationManifest } from "../types/user-translation";

// ── Module mocks ──
vi.mock("../lib/user-translations", () => ({
  getUserTranslationManifests: vi.fn(),
  getUserTranslationManifest: vi.fn().mockResolvedValue(undefined),
  deleteUserTranslation: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../lib/supabase", () => ({
  supabase: {},
}));
vi.mock("../lib/translation-backup", () => ({
  getBackupStatus: vi.fn().mockResolvedValue(new Map()),
  backupTranslation: vi.fn().mockResolvedValue(undefined),
  deleteBackup: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../lib/idb", () => ({
  getDb: vi.fn(),
}));

// Import the mocked functions so we can control their return values per test
import {
  getUserTranslationManifests,
  deleteUserTranslation,
} from "../lib/user-translations";

const mockedGetManifests = getUserTranslationManifests as ReturnType<typeof vi.fn>;
const mockedDelete = deleteUserTranslation as ReturnType<typeof vi.fn>;

// ── Test fixtures ──
const sampleManifests: UserTranslationManifest[] = [
  {
    translation: "user-nrsv",
    name: "New Revised Standard Version",
    abbreviation: "NRSV",
    language: "en",
    license: "Personal use",
    books: [
      { id: "gen", name: "Genesis", testament: "OT", chapters: 50 },
      { id: "exo", name: "Exodus", testament: "OT", chapters: 40 },
      { id: "lev", name: "Leviticus", testament: "OT", chapters: 27 },
    ] as any,
    uploadedAt: "2026-01-15T12:00:00Z",
    originalFilename: "nrsv.epub",
    fileType: "epub",
  },
  {
    translation: "user-kjv",
    name: "King James Version",
    abbreviation: "KJV",
    language: "en",
    license: "Public domain",
    books: [
      { id: "gen", name: "Genesis", testament: "OT", chapters: 50 },
    ] as any,
    uploadedAt: "2026-02-20T08:30:00Z",
    originalFilename: "kjv.txt",
    fileType: "text",
  },
];

describe("UserTranslationManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    // Make the promise hang so we can observe the loading state
    mockedGetManifests.mockReturnValue(new Promise(() => {}));

    render(<UserTranslationManager refreshKey={0} />);

    expect(screen.getByText("Loading your translations...")).toBeInTheDocument();
  });

  it('shows "No uploaded translations yet" when empty', async () => {
    mockedGetManifests.mockResolvedValue([]);

    render(<UserTranslationManager refreshKey={0} />);

    // Wait for the loading state to resolve
    await waitFor(() => {
      expect(
        screen.getByText(/No uploaded translations yet/),
      ).toBeInTheDocument();
    });
  });

  it("lists translations with abbreviation, name, and book count", async () => {
    mockedGetManifests.mockResolvedValue(sampleManifests);

    render(<UserTranslationManager refreshKey={0} />);

    await waitFor(() => {
      // Each translation shows its abbreviation and name
      expect(screen.getByText("NRSV")).toBeInTheDocument();
      expect(screen.getByText(/New Revised Standard Version/)).toBeInTheDocument();
      expect(screen.getByText("KJV")).toBeInTheDocument();
      expect(screen.getByText(/King James Version/)).toBeInTheDocument();
    });

    // Book counts are displayed for each translation
    expect(screen.getByText(/3 books/)).toBeInTheDocument();
    expect(screen.getByText(/1 books/)).toBeInTheDocument();
  });

  it("shows delete button for each translation", async () => {
    mockedGetManifests.mockResolvedValue(sampleManifests);

    render(<UserTranslationManager refreshKey={0} />);

    await waitFor(() => {
      // Delete buttons have aria-labels like "Delete New Revised Standard Version"
      expect(
        screen.getByRole("button", { name: "Delete New Revised Standard Version" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Delete King James Version" }),
      ).toBeInTheDocument();
    });
  });

  it("clicking delete shows confirmation with Yes and No buttons", async () => {
    mockedGetManifests.mockResolvedValue(sampleManifests);
    const user = userEvent.setup();

    render(<UserTranslationManager refreshKey={0} />);

    // Wait for list to render
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Delete New Revised Standard Version" }),
      ).toBeInTheDocument();
    });

    // Click the delete button for the first translation
    await user.click(
      screen.getByRole("button", { name: "Delete New Revised Standard Version" }),
    );

    // Confirmation prompt appears with "Delete?" text and Yes/No buttons
    expect(screen.getByText("Delete?")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirm delete New Revised Standard Version" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel delete" }),
    ).toBeInTheDocument();
  });

  it('clicking "No" cancels deletion and restores the delete button', async () => {
    mockedGetManifests.mockResolvedValue(sampleManifests);
    const user = userEvent.setup();

    render(<UserTranslationManager refreshKey={0} />);

    // Wait for list to render
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Delete New Revised Standard Version" }),
      ).toBeInTheDocument();
    });

    // Click delete to show confirmation
    await user.click(
      screen.getByRole("button", { name: "Delete New Revised Standard Version" }),
    );

    // Click "No" to cancel
    await user.click(screen.getByRole("button", { name: "Cancel delete" }));

    // Confirmation UI should be gone — the original delete button returns
    expect(screen.queryByText("Delete?")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete New Revised Standard Version" }),
    ).toBeInTheDocument();

    // The delete function should never have been called
    expect(mockedDelete).not.toHaveBeenCalled();
  });
});
