/**
 * Tests for TranslationToggleMenu — the word-swap preferences dropdown.
 *
 * Verifies:
 * - Renders the trigger button
 * - Opens popover on click
 * - Shows all four toggle labels
 * - Toggle switches reflect current state
 * - Calls onToggleChange with correct key
 * - Closes on Escape
 * - Closes on outside click
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { TranslationToggleMenu } from "./TranslationToggleMenu";
import { TOGGLE_DEFAULTS, type TranslationToggles } from "../../lib/translation-toggles";

const defaultProps = {
  toggles: { ...TOGGLE_DEFAULTS } as TranslationToggles,
  onToggleChange: vi.fn(),
};

describe("TranslationToggleMenu", () => {
  beforeEach(() => {
    defaultProps.onToggleChange = vi.fn();
  });

  it("renders the Wording button", () => {
    render(<TranslationToggleMenu {...defaultProps} />);
    expect(screen.getByText("Wording")).toBeInTheDocument();
  });

  it("does not show popover initially", () => {
    render(<TranslationToggleMenu {...defaultProps} />);
    expect(screen.queryByText("Word choices")).not.toBeInTheDocument();
  });

  it("opens popover on click", () => {
    render(<TranslationToggleMenu {...defaultProps} />);
    fireEvent.click(screen.getByText("Wording"));
    expect(screen.getByText("Word choices")).toBeInTheDocument();
  });

  it("shows all four toggle labels when open", () => {
    render(<TranslationToggleMenu {...defaultProps} />);
    fireEvent.click(screen.getByText("Wording"));
    expect(screen.getByText("God's name")).toBeInTheDocument();
    expect(screen.getByText("Baptize or immerse")).toBeInTheDocument();
    expect(screen.getByText("Church or assembly")).toBeInTheDocument();
    // "Only begotten" appears as both the row label and the switch's off-label,
    // so we check that at least one instance exists
    expect(screen.getAllByText("Only begotten").length).toBeGreaterThanOrEqual(1);
  });

  it("reflects toggle off state with aria-checked=false", () => {
    render(<TranslationToggleMenu {...defaultProps} />);
    fireEvent.click(screen.getByText("Wording"));
    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(4);
    for (const s of switches) {
      expect(s).toHaveAttribute("aria-checked", "false");
    }
  });

  it("reflects toggle on state with aria-checked=true", () => {
    const toggles: TranslationToggles = {
      divineName: true,
      baptism: false,
      assembly: true,
      onlyBegotten: false,
    };
    render(
      <TranslationToggleMenu
        toggles={toggles}
        onToggleChange={defaultProps.onToggleChange}
      />,
    );
    fireEvent.click(screen.getByText("Wording"));
    const switches = screen.getAllByRole("switch");
    expect(switches[0]).toHaveAttribute("aria-checked", "true");
    expect(switches[1]).toHaveAttribute("aria-checked", "false");
    expect(switches[2]).toHaveAttribute("aria-checked", "true");
    expect(switches[3]).toHaveAttribute("aria-checked", "false");
  });

  it("calls onToggleChange with correct key when a toggle is clicked", () => {
    render(<TranslationToggleMenu {...defaultProps} />);
    fireEvent.click(screen.getByText("Wording"));
    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[1]); // baptism is the second toggle
    expect(defaultProps.onToggleChange).toHaveBeenCalledWith("baptism");
  });

  it("closes on Escape", () => {
    render(<TranslationToggleMenu {...defaultProps} />);
    fireEvent.click(screen.getByText("Wording"));
    expect(screen.getByText("Word choices")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByText("Word choices"), { key: "Escape" });
    expect(screen.queryByText("Word choices")).not.toBeInTheDocument();
  });

  it("closes on outside click", () => {
    render(
      <div>
        <span data-testid="outside">Outside</span>
        <TranslationToggleMenu {...defaultProps} />
      </div>,
    );
    fireEvent.click(screen.getByText("Wording"));
    expect(screen.getByText("Word choices")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByText("Word choices")).not.toBeInTheDocument();
  });

  it("shows active count badge when toggles are on", () => {
    const toggles: TranslationToggles = {
      divineName: true,
      baptism: true,
      assembly: false,
      onlyBegotten: false,
    };
    render(
      <TranslationToggleMenu
        toggles={toggles}
        onToggleChange={defaultProps.onToggleChange}
      />,
    );
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("does not show badge when no toggles are active", () => {
    render(<TranslationToggleMenu {...defaultProps} />);
    // Badge would show a number — shouldn't be present
    expect(screen.queryByText("1")).not.toBeInTheDocument();
    expect(screen.queryByText("2")).not.toBeInTheDocument();
    expect(screen.queryByText("3")).not.toBeInTheDocument();
    expect(screen.queryByText("4")).not.toBeInTheDocument();
  });
});
