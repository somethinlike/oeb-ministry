/**
 * Tests for TranslationPicker — custom dropdown for switching Bible translations.
 *
 * Verifies:
 * - Renders trigger button with current translation abbreviation
 * - Shows full name on the trigger (desktop text)
 * - Opens dropdown on click
 * - Shows all translations in dropdown with abbreviations
 * - Highlights the currently selected translation
 * - Calls switchTranslation when a different option is clicked
 * - Closes on Escape
 * - Closes on outside click
 * - Closes after selecting an option
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { TranslationPicker } from "./TranslationPicker";
import { defaultMockContext } from "./__test-helpers";
import type { WorkspaceContextValue } from "../../types/workspace";

// Mock useWorkspace to return controlled values
let mockContextValue: WorkspaceContextValue;
vi.mock("./WorkspaceProvider", () => ({
  useWorkspace: () => mockContextValue,
}));

// Mock companion components — tested separately
vi.mock("./TranslationInfoIcon", () => ({
  TranslationInfoIcon: () => <div data-testid="translation-info-icon" />,
}));

vi.mock("./TranslationFirstOpenPopup", () => ({
  TranslationFirstOpenPopup: () => <div data-testid="translation-first-open-popup" />,
}));

describe("TranslationPicker", () => {
  beforeEach(() => {
    mockContextValue = defaultMockContext({ translation: "oeb-us" });
  });

  it("renders the trigger button", () => {
    render(<TranslationPicker />);
    expect(
      screen.getByRole("button", { name: /choose a bible translation/i }),
    ).toBeInTheDocument();
  });

  it("shows abbreviation on the trigger", () => {
    render(<TranslationPicker />);
    expect(screen.getByText("OEB")).toBeInTheDocument();
  });

  it("shows full name on the trigger (desktop text)", () => {
    render(<TranslationPicker />);
    // The full name is inside a hidden md:inline span — still in the DOM
    expect(
      screen.getByText(/Open English Bible/),
    ).toBeInTheDocument();
  });

  it("does not show dropdown initially", () => {
    render(<TranslationPicker />);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens dropdown on click", () => {
    render(<TranslationPicker />);
    fireEvent.click(
      screen.getByRole("button", { name: /choose a bible translation/i }),
    );
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("shows all translations in dropdown with abbreviations", () => {
    render(<TranslationPicker />);
    fireEvent.click(
      screen.getByRole("button", { name: /choose a bible translation/i }),
    );
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    // Each option should contain its abbreviation
    expect(options[0]).toHaveTextContent("OEB");
    expect(options[1]).toHaveTextContent("KJV");
    expect(options[2]).toHaveTextContent("DRA");
  });

  it("marks the current translation as selected", () => {
    render(<TranslationPicker />);
    fireEvent.click(
      screen.getByRole("button", { name: /choose a bible translation/i }),
    );
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(options[1]).toHaveAttribute("aria-selected", "false");
    expect(options[2]).toHaveAttribute("aria-selected", "false");
  });

  it("calls switchTranslation when a different option is clicked", () => {
    render(<TranslationPicker />);
    fireEvent.click(
      screen.getByRole("button", { name: /choose a bible translation/i }),
    );
    const options = screen.getAllByRole("option");
    fireEvent.click(options[1]); // KJV
    expect(mockContextValue.switchTranslation).toHaveBeenCalledWith("kjv1611");
  });

  it("does not call switchTranslation when clicking the already-selected option", () => {
    render(<TranslationPicker />);
    fireEvent.click(
      screen.getByRole("button", { name: /choose a bible translation/i }),
    );
    const options = screen.getAllByRole("option");
    fireEvent.click(options[0]); // OEB — already selected
    expect(mockContextValue.switchTranslation).not.toHaveBeenCalled();
  });

  it("closes dropdown after selecting an option", () => {
    render(<TranslationPicker />);
    fireEvent.click(
      screen.getByRole("button", { name: /choose a bible translation/i }),
    );
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    const options = screen.getAllByRole("option");
    fireEvent.click(options[1]);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes on Escape", () => {
    render(<TranslationPicker />);
    fireEvent.click(
      screen.getByRole("button", { name: /choose a bible translation/i }),
    );
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes on outside click", () => {
    render(
      <div>
        <span data-testid="outside">Outside</span>
        <TranslationPicker />
      </div>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /choose a bible translation/i }),
    );
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows the correct abbreviation when KJV is selected", () => {
    mockContextValue = defaultMockContext({ translation: "kjv1611" });
    render(<TranslationPicker />);
    expect(screen.getByText("KJV")).toBeInTheDocument();
    expect(screen.getByText(/King James Version/)).toBeInTheDocument();
  });

  it("renders companion components", () => {
    render(<TranslationPicker />);
    expect(screen.getByTestId("translation-info-icon")).toBeInTheDocument();
    expect(screen.getByTestId("translation-first-open-popup")).toBeInTheDocument();
  });
});
