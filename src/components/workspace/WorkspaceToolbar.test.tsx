/**
 * Tests for WorkspaceToolbar — top bar with breadcrumbs and layout controls.
 *
 * Verifies:
 * - Renders breadcrumb navigation with correct book/chapter
 * - Shows "Pop out" button when docked, calls onUndock
 * - Shows "Dock" button when undocked, calls onDock
 * - Shows "Swap" button only when docked
 * - Calls onToggleSwap when swap button is clicked
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkspaceToolbar } from "./WorkspaceToolbar";
import { defaultMockContext } from "./__test-helpers";
import type { WorkspaceContextValue } from "../../types/workspace";

// Mock useWorkspace to return controlled values
let mockContextValue: WorkspaceContextValue;
vi.mock("./WorkspaceProvider", () => ({
  useWorkspace: () => mockContextValue,
}));

// Mock TranslationPicker since it also uses useWorkspace
vi.mock("./TranslationPicker", () => ({
  TranslationPicker: () => <div data-testid="translation-picker" />,
}));

const defaultProps = {
  swapped: false,
  onToggleSwap: vi.fn(),
  undocked: false,
  onUndock: vi.fn(),
  onDock: vi.fn(),
  readerLayout: "centered" as const,
  onToggleReaderLayout: vi.fn(),
};

describe("WorkspaceToolbar", () => {
  beforeEach(() => {
    mockContextValue = defaultMockContext();
  });

  it("renders breadcrumb navigation", () => {
    render(<WorkspaceToolbar {...defaultProps} />);
    expect(screen.getByRole("navigation", { name: /breadcrumb/i })).toBeInTheDocument();
  });

  it("shows book name in breadcrumbs", () => {
    render(<WorkspaceToolbar {...defaultProps} />);
    // "jhn" should resolve to "John" via BOOK_BY_ID
    expect(screen.getByText("John")).toBeInTheDocument();
  });

  it("shows chapter number in breadcrumbs", () => {
    render(<WorkspaceToolbar {...defaultProps} />);
    expect(screen.getByText("Chapter 3")).toBeInTheDocument();
  });

  it("shows 'Bible' as root breadcrumb link", () => {
    render(<WorkspaceToolbar {...defaultProps} />);
    const bibleLink = screen.getByRole("link", { name: "Bible" });
    expect(bibleLink).toHaveAttribute("href", "/app/read");
  });

  it("shows 'Pop out' button when docked", () => {
    render(<WorkspaceToolbar {...defaultProps} undocked={false} />);
    expect(
      screen.getByRole("button", { name: /pop notes out/i }),
    ).toBeInTheDocument();
  });

  it("calls onUndock when 'Pop out' is clicked", async () => {
    const user = userEvent.setup();
    const onUndock = vi.fn();
    render(
      <WorkspaceToolbar {...defaultProps} undocked={false} onUndock={onUndock} />,
    );
    await user.click(
      screen.getByRole("button", { name: /pop notes out/i }),
    );
    expect(onUndock).toHaveBeenCalledOnce();
  });

  it("shows 'Dock' button when undocked", () => {
    render(<WorkspaceToolbar {...defaultProps} undocked={true} />);
    expect(
      screen.getByRole("button", { name: /dock notes back/i }),
    ).toBeInTheDocument();
  });

  it("calls onDock when 'Dock' is clicked", async () => {
    const user = userEvent.setup();
    const onDock = vi.fn();
    render(
      <WorkspaceToolbar {...defaultProps} undocked={true} onDock={onDock} />,
    );
    await user.click(
      screen.getByRole("button", { name: /dock notes back/i }),
    );
    expect(onDock).toHaveBeenCalledOnce();
  });

  it("shows 'Swap' button when docked", () => {
    render(<WorkspaceToolbar {...defaultProps} undocked={false} />);
    expect(
      screen.getByRole("button", { name: /move bible text/i }),
    ).toBeInTheDocument();
  });

  it("hides 'Swap' button when undocked", () => {
    render(<WorkspaceToolbar {...defaultProps} undocked={true} />);
    expect(
      screen.queryByRole("button", { name: /move bible text/i }),
    ).not.toBeInTheDocument();
  });

  it("calls onToggleSwap when swap button is clicked", async () => {
    const user = userEvent.setup();
    const onToggleSwap = vi.fn();
    render(
      <WorkspaceToolbar
        {...defaultProps}
        undocked={false}
        onToggleSwap={onToggleSwap}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /move bible text/i }),
    );
    expect(onToggleSwap).toHaveBeenCalledOnce();
  });

  it("includes the translation picker", () => {
    render(<WorkspaceToolbar {...defaultProps} />);
    expect(screen.getByTestId("translation-picker")).toBeInTheDocument();
  });
});
