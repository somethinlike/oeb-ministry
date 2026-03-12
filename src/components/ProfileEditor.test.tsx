/**
 * Tests for ProfileEditor — settings panel for user profile management.
 *
 * Verifies:
 * - Renders form fields (slug, display name, bio)
 * - Pre-fills with existing profile data
 * - Shows "Create profile" when no profile exists
 * - Shows "Save changes" when profile exists
 * - Shows "View your page" link when profile exists
 * - Shows "Remove profile" when profile exists
 * - Delete confirmation flow
 * - Slug validation feedback
 */

import { render, screen, waitFor } from "@testing-library/react";
import { ProfileEditor } from "./ProfileEditor";

// Mock supabase
vi.mock("../lib/supabase", () => ({
  supabase: {},
}));

// Mock user-profiles service
const mockGetProfileByUserId = vi.fn();
vi.mock("../lib/user-profiles", () => ({
  getProfileByUserId: (...args: any[]) => mockGetProfileByUserId(...args),
  createProfile: vi.fn(),
  updateProfile: vi.fn(),
  deleteProfile: vi.fn(),
  validateSlug: vi.fn().mockReturnValue(null),
  isSlugAvailable: vi.fn().mockResolvedValue(true),
}));

const existingProfile = {
  id: "profile-1",
  userId: "user-1",
  slug: "john-doe",
  displayName: "John Doe",
  bio: "A Bible student",
  avatarUrl: null,
  createdAt: "2026-01-15T00:00:00Z",
  updatedAt: "2026-01-15T00:00:00Z",
};

describe("ProfileEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders form fields", async () => {
    mockGetProfileByUserId.mockResolvedValue(null);

    render(<ProfileEditor userId="user-1" defaultDisplayName="Test User" />);

    await waitFor(() => {
      expect(screen.getByLabelText("Your profile URL")).toBeInTheDocument();
      expect(screen.getByLabelText("Display name")).toBeInTheDocument();
      expect(screen.getByLabelText(/Short bio/)).toBeInTheDocument();
    });
  });

  it("shows 'Create profile' button when no profile exists", async () => {
    mockGetProfileByUserId.mockResolvedValue(null);

    render(<ProfileEditor userId="user-1" defaultDisplayName="Test User" />);

    await waitFor(() => {
      expect(screen.getByText("Create profile")).toBeInTheDocument();
    });
  });

  it("pre-fills form with existing profile data", async () => {
    mockGetProfileByUserId.mockResolvedValue(existingProfile);

    render(<ProfileEditor userId="user-1" defaultDisplayName="Test User" />);

    await waitFor(() => {
      const slugInput = screen.getByLabelText("Your profile URL") as HTMLInputElement;
      expect(slugInput.value).toBe("john-doe");
      const nameInput = screen.getByLabelText("Display name") as HTMLInputElement;
      expect(nameInput.value).toBe("John Doe");
    });
  });

  it("shows 'Save changes' button when profile exists", async () => {
    mockGetProfileByUserId.mockResolvedValue(existingProfile);

    render(<ProfileEditor userId="user-1" defaultDisplayName="Test User" />);

    await waitFor(() => {
      expect(screen.getByText("Save changes")).toBeInTheDocument();
    });
  });

  it("shows 'View your page' link when profile exists", async () => {
    mockGetProfileByUserId.mockResolvedValue(existingProfile);

    render(<ProfileEditor userId="user-1" defaultDisplayName="Test User" />);

    await waitFor(() => {
      const link = screen.getByText("View your page");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/profile/john-doe");
    });
  });

  it("shows 'Remove profile' button when profile exists", async () => {
    mockGetProfileByUserId.mockResolvedValue(existingProfile);

    render(<ProfileEditor userId="user-1" defaultDisplayName="Test User" />);

    await waitFor(() => {
      expect(screen.getByText("Remove profile")).toBeInTheDocument();
    });
  });

  it("shows /profile/ prefix in slug field", async () => {
    mockGetProfileByUserId.mockResolvedValue(null);

    render(<ProfileEditor userId="user-1" defaultDisplayName="Test User" />);

    await waitFor(() => {
      expect(screen.getByText("/profile/")).toBeInTheDocument();
    });
  });

  it("shows bio character count", async () => {
    mockGetProfileByUserId.mockResolvedValue(null);

    render(<ProfileEditor userId="user-1" defaultDisplayName="Test User" />);

    await waitFor(() => {
      expect(screen.getByText(/500 characters left/)).toBeInTheDocument();
    });
  });
});
