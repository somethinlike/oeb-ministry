/**
 * Tests for KeybindingEditor — custom shortcut editor UI.
 *
 * Verifies:
 * - Renders all command categories and commands
 * - Shows current bindings from preset
 * - Shows "modified" indicator for overridden bindings
 * - Calls onOverrideChange when key is captured
 * - Shows "Reset all" button when overrides exist
 * - Calls onResetAll when clicked
 * - Displays conflict warnings for duplicate keys
 * - Key recorder shows on click, cancels on Escape
 */

import { render, screen, fireEvent, within } from "@testing-library/react";
import { KeybindingEditor } from "./KeybindingEditor";
import { COMMANDS, PRESET_BINDINGS, formatBinding } from "../lib/commands";

describe("KeybindingEditor", () => {
  const defaultProps = {
    preset: "default" as const,
    customOverrides: {} as Record<string, string>,
    onOverrideChange: vi.fn(),
    onResetAll: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all category headings", () => {
    render(<KeybindingEditor {...defaultProps} />);
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Reading")).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByText("Word Choices")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("renders all commands", () => {
    render(<KeybindingEditor {...defaultProps} />);
    for (const cmd of COMMANDS) {
      expect(screen.getByText(cmd.label)).toBeInTheDocument();
    }
  });

  it("shows formatted key for bound commands", () => {
    render(<KeybindingEditor {...defaultProps} />);
    // system.palette is bound in default preset as "mod+shift+p"
    const paletteBinding = PRESET_BINDINGS.default.find(
      (b) => b.commandId === "system.palette",
    );
    if (paletteBinding) {
      const formatted = formatBinding(paletteBinding.key);
      expect(screen.getByText(formatted)).toBeInTheDocument();
    }
  });

  it("shows 'none' for unbound commands", () => {
    render(<KeybindingEditor {...defaultProps} />);
    // Most translation toggle commands are not bound in the default preset
    const noneElements = screen.getAllByText("none");
    expect(noneElements.length).toBeGreaterThan(0);
  });

  it("does not show 'Reset all' when no overrides exist", () => {
    render(<KeybindingEditor {...defaultProps} />);
    expect(screen.queryByText(/Reset all/)).not.toBeInTheDocument();
  });

  it("shows 'Reset all' button when overrides exist", () => {
    render(
      <KeybindingEditor
        {...defaultProps}
        customOverrides={{ "annotation.save": "mod+enter" }}
      />,
    );
    expect(screen.getByText(/Reset all/)).toBeInTheDocument();
  });

  it("calls onResetAll when 'Reset all' is clicked", () => {
    const onResetAll = vi.fn();
    render(
      <KeybindingEditor
        {...defaultProps}
        customOverrides={{ "annotation.save": "mod+enter" }}
        onResetAll={onResetAll}
      />,
    );
    fireEvent.click(screen.getByText(/Reset all/));
    expect(onResetAll).toHaveBeenCalledOnce();
  });

  it("shows 'modified' indicator for overridden bindings", () => {
    render(
      <KeybindingEditor
        {...defaultProps}
        customOverrides={{ "annotation.save": "mod+enter" }}
      />,
    );
    expect(screen.getByText("modified")).toBeInTheDocument();
  });

  it("enters key recording mode on button click", () => {
    render(<KeybindingEditor {...defaultProps} />);
    // Click the binding button for "Save Note" (annotation.save)
    const saveBinding = PRESET_BINDINGS.default.find(
      (b) => b.commandId === "annotation.save",
    );
    if (saveBinding) {
      const formatted = formatBinding(saveBinding.key);
      fireEvent.click(screen.getByText(formatted));
      expect(screen.getByText(/Press a key/)).toBeInTheDocument();
    }
  });

  it("cancels recording on Escape", () => {
    render(<KeybindingEditor {...defaultProps} />);
    const saveBinding = PRESET_BINDINGS.default.find(
      (b) => b.commandId === "annotation.save",
    );
    if (saveBinding) {
      const formatted = formatBinding(saveBinding.key);
      fireEvent.click(screen.getByText(formatted));
      expect(screen.getByText(/Press a key/)).toBeInTheDocument();

      // Press Escape to cancel
      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByText(/Press a key/)).not.toBeInTheDocument();
    }
  });

  it("captures a new key combo and calls onOverrideChange", () => {
    const onOverrideChange = vi.fn();
    render(
      <KeybindingEditor
        {...defaultProps}
        onOverrideChange={onOverrideChange}
      />,
    );
    const saveBinding = PRESET_BINDINGS.default.find(
      (b) => b.commandId === "annotation.save",
    );
    if (saveBinding) {
      const formatted = formatBinding(saveBinding.key);
      fireEvent.click(screen.getByText(formatted));

      // Press Mod+Enter to set new binding
      fireEvent.keyDown(document, { key: "Enter", ctrlKey: true });
      expect(onOverrideChange).toHaveBeenCalledWith("annotation.save", "mod+enter");
    }
  });

  it("shows conflict warning when two commands share a key", () => {
    // Override two different commands to the same key
    render(
      <KeybindingEditor
        {...defaultProps}
        customOverrides={{
          "reader.nextVerse": "mod+s",
          // annotation.save is already mod+s in default preset
        }}
      />,
    );
    // Should see "Already used by" warnings
    const warnings = screen.getAllByText(/Already used by/);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("shows preset name in description", () => {
    render(<KeybindingEditor {...defaultProps} />);
    expect(screen.getByText(/Based on Default preset/)).toBeInTheDocument();
  });

  it("shows Vim preset name when vim is active", () => {
    render(<KeybindingEditor {...defaultProps} preset="vim" />);
    expect(screen.getByText(/Based on Vim preset/)).toBeInTheDocument();
  });
});
