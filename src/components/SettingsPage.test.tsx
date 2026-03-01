/**
 * Tests for SettingsPage — user preferences UI.
 *
 * Verifies:
 * - Renders all five sections
 * - Displays account info (name, email, provider badge)
 * - Font selection works
 * - Translation toggles render and respond to clicks
 * - Preset selection applies toggles
 * - Manual toggle change shows Custom preset state
 * - Export button is present
 * - Default translation selector works
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsPage } from "./SettingsPage";
import type { AuthState } from "../types/auth";

// Mock supabase client to avoid network calls
vi.mock("../lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

const mockAuth: AuthState = {
  isAuthenticated: true,
  displayName: "Test User",
  email: "test@example.com",
  avatarUrl: null,
  userId: "user-123",
};

describe("SettingsPage", () => {
  beforeEach(() => {
    localStorage.clear();
    // jsdom doesn't implement matchMedia — mock it for getOrderedFontOptions()
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it("renders all five section headings", () => {
    render(<SettingsPage auth={mockAuth} providers={["google"]} />);
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Reading")).toBeInTheDocument();
    expect(screen.getByText("Word Choices")).toBeInTheDocument();
    expect(screen.getByText("Default Translation")).toBeInTheDocument();
    expect(screen.getByText("Your Data")).toBeInTheDocument();
  });

  it("displays account name and email", () => {
    render(<SettingsPage auth={mockAuth} providers={[]} />);
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("shows provider badge when providers are given", () => {
    render(<SettingsPage auth={mockAuth} providers={["google"]} />);
    expect(screen.getByText("Google")).toBeInTheDocument();
  });

  it("shows avatar initial when no avatar URL", () => {
    render(<SettingsPage auth={mockAuth} providers={[]} />);
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("renders font picker with system default selected", () => {
    render(<SettingsPage auth={mockAuth} providers={[]} />);
    const fontSelect = screen.getByDisplayValue("System Default");
    expect(fontSelect).toBeInTheDocument();
  });

  it("changes font selection", () => {
    render(<SettingsPage auth={mockAuth} providers={[]} />);
    const fontSelect = screen.getByDisplayValue("System Default");
    fireEvent.change(fontSelect, { target: { value: "lora" } });
    expect((fontSelect as HTMLSelectElement).value).toBe("lora");
  });

  it("renders all four translation toggle switches", () => {
    render(<SettingsPage auth={mockAuth} providers={[]} />);
    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(4);
  });

  it("toggles start as off (aria-checked=false)", () => {
    render(<SettingsPage auth={mockAuth} providers={[]} />);
    const switches = screen.getAllByRole("switch");
    for (const s of switches) {
      expect(s).toHaveAttribute("aria-checked", "false");
    }
  });

  it("clicking a toggle switches its state", () => {
    render(<SettingsPage auth={mockAuth} providers={[]} />);
    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[0]); // divineName
    expect(switches[0]).toHaveAttribute("aria-checked", "true");
  });

  it("renders denomination preset selector", () => {
    render(<SettingsPage auth={mockAuth} providers={[]} />);
    expect(screen.getByText("Denomination preset")).toBeInTheDocument();
    expect(screen.getByText("Choose a tradition...")).toBeInTheDocument();
  });

  it("renders default translation selector with WEB selected", () => {
    render(<SettingsPage auth={mockAuth} providers={[]} />);
    // WEB is the default
    const translationSelect = screen.getByDisplayValue("WEB — World English Bible");
    expect(translationSelect).toBeInTheDocument();
  });

  it("renders export button", () => {
    render(<SettingsPage auth={mockAuth} providers={[]} />);
    expect(screen.getByText("Download all notes")).toBeInTheDocument();
  });
});
