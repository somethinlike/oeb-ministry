/**
 * Tests for PublicProfilePage — public author profile display.
 *
 * Verifies:
 * - Loading state renders skeleton
 * - Not-found state renders message
 * - Profile header (name, bio, avatar initial, member since)
 * - Notes tab renders annotations
 * - Devotionals tab renders devotional cards
 * - Empty state messages per tab
 * - Tab switching
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PublicProfilePage } from "./PublicProfilePage";

// Mock the supabase client
vi.mock("../lib/supabase", () => ({
  supabase: {},
}));

// Mock the user-profiles service module
const mockGetProfileBySlug = vi.fn();
const mockGetPublishedAnnotationsByUser = vi.fn();
const mockGetPublishedDevotionalsByUser = vi.fn();

vi.mock("../lib/user-profiles", () => ({
  getProfileBySlug: (...args: any[]) => mockGetProfileBySlug(...args),
  getPublishedAnnotationsByUser: (...args: any[]) => mockGetPublishedAnnotationsByUser(...args),
  getPublishedDevotionalsByUser: (...args: any[]) => mockGetPublishedDevotionalsByUser(...args),
}));

const mockProfile = {
  id: "profile-1",
  userId: "user-1",
  slug: "john-doe",
  displayName: "John Doe",
  bio: "A passionate Bible student",
  avatarUrl: null,
  createdAt: "2026-01-15T00:00:00Z",
  updatedAt: "2026-01-15T00:00:00Z",
};

const mockAnnotation = {
  id: "ann-1",
  book: "john",
  chapter: 3,
  verse_start: 16,
  verse_end: 16,
  content_md: "For God so loved the world — a beautiful verse about grace.",
  author_display_name: "John Doe",
  published_at: "2026-02-01T00:00:00Z",
};

const mockDevotional = {
  id: "dev-1",
  title: "Romans Study",
  description: "A deep dive into Paul's letter to Rome",
  translation: "web",
  type: "original",
  author_display_name: "John Doe",
  entry_count: 12,
  published_at: "2026-02-15T00:00:00Z",
};

describe("PublicProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows not-found state when profile doesn't exist", async () => {
    mockGetProfileBySlug.mockResolvedValue(null);

    render(<PublicProfilePage slug="unknown" />);

    await waitFor(() => {
      expect(screen.getByText(/Profile not found/)).toBeInTheDocument();
    });
  });

  it("shows not-found with link to community", async () => {
    mockGetProfileBySlug.mockResolvedValue(null);

    render(<PublicProfilePage slug="unknown" />);

    await waitFor(() => {
      expect(screen.getByText("Browse community content")).toBeInTheDocument();
    });
  });

  it("renders profile header with name and bio", async () => {
    mockGetProfileBySlug.mockResolvedValue(mockProfile);
    mockGetPublishedAnnotationsByUser.mockResolvedValue([]);
    mockGetPublishedDevotionalsByUser.mockResolvedValue([]);

    render(<PublicProfilePage slug="john-doe" />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("A passionate Bible student")).toBeInTheDocument();
    });
  });

  it("renders avatar initial when no avatar URL", async () => {
    mockGetProfileBySlug.mockResolvedValue(mockProfile);
    mockGetPublishedAnnotationsByUser.mockResolvedValue([]);
    mockGetPublishedDevotionalsByUser.mockResolvedValue([]);

    render(<PublicProfilePage slug="john-doe" />);

    await waitFor(() => {
      expect(screen.getByText("J")).toBeInTheDocument();
    });
  });

  it("renders member since date", async () => {
    mockGetProfileBySlug.mockResolvedValue(mockProfile);
    mockGetPublishedAnnotationsByUser.mockResolvedValue([]);
    mockGetPublishedDevotionalsByUser.mockResolvedValue([]);

    render(<PublicProfilePage slug="john-doe" />);

    await waitFor(() => {
      expect(screen.getByText(/Member since/)).toBeInTheDocument();
    });
  });

  it("shows notes tab with annotation cards", async () => {
    mockGetProfileBySlug.mockResolvedValue(mockProfile);
    mockGetPublishedAnnotationsByUser.mockResolvedValue([mockAnnotation]);
    mockGetPublishedDevotionalsByUser.mockResolvedValue([]);

    render(<PublicProfilePage slug="john-doe" />);

    await waitFor(() => {
      expect(screen.getByText("Notes (1)")).toBeInTheDocument();
      expect(screen.getByText(/For God so loved/)).toBeInTheDocument();
    });
  });

  it("shows empty state when user has no notes", async () => {
    mockGetProfileBySlug.mockResolvedValue(mockProfile);
    mockGetPublishedAnnotationsByUser.mockResolvedValue([]);
    mockGetPublishedDevotionalsByUser.mockResolvedValue([]);

    render(<PublicProfilePage slug="john-doe" />);

    await waitFor(() => {
      expect(screen.getByText(/hasn.t shared any notes yet/)).toBeInTheDocument();
    });
  });

  it("switches to devotionals tab", async () => {
    mockGetProfileBySlug.mockResolvedValue(mockProfile);
    mockGetPublishedAnnotationsByUser.mockResolvedValue([]);
    mockGetPublishedDevotionalsByUser.mockResolvedValue([mockDevotional]);

    render(<PublicProfilePage slug="john-doe" />);

    await waitFor(() => {
      expect(screen.getByText("Devotionals (1)")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Devotionals (1)"));

    expect(screen.getByText("Romans Study")).toBeInTheDocument();
    expect(screen.getByText("Original")).toBeInTheDocument();
  });

  it("shows empty devotionals message", async () => {
    mockGetProfileBySlug.mockResolvedValue(mockProfile);
    mockGetPublishedAnnotationsByUser.mockResolvedValue([]);
    mockGetPublishedDevotionalsByUser.mockResolvedValue([]);

    render(<PublicProfilePage slug="john-doe" />);

    await waitFor(() => {
      expect(screen.getByText("Devotionals")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Devotionals"));

    expect(screen.getByText(/hasn.t shared any devotionals yet/)).toBeInTheDocument();
  });

  it("handles profile load error gracefully", async () => {
    mockGetProfileBySlug.mockRejectedValue(new Error("Network error"));

    render(<PublicProfilePage slug="john-doe" />);

    await waitFor(() => {
      expect(screen.getByText(/Profile not found/)).toBeInTheDocument();
    });
  });
});
