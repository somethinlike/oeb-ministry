/**
 * Tests for FloatingPanel — draggable floating window for annotation sidebar.
 *
 * Verifies:
 * - Renders as an accessible dialog
 * - Shows dock button that calls the onDock callback
 * - Renders its children content
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FloatingPanel } from "./FloatingPanel";

describe("FloatingPanel", () => {
  it("renders with dialog role and accessible label", () => {
    render(
      <FloatingPanel onDock={vi.fn()}>
        <p>Test content</p>
      </FloatingPanel>,
    );
    const dialog = screen.getByRole("dialog", {
      name: /your notes/i,
    });
    expect(dialog).toBeInTheDocument();
  });

  it("renders children content", () => {
    render(
      <FloatingPanel onDock={vi.fn()}>
        <p>Annotation list goes here</p>
      </FloatingPanel>,
    );
    expect(
      screen.getByText("Annotation list goes here"),
    ).toBeInTheDocument();
  });

  it("calls onDock when dock button is clicked", async () => {
    const user = userEvent.setup();
    const onDock = vi.fn();
    render(
      <FloatingPanel onDock={onDock}>
        <p>Content</p>
      </FloatingPanel>,
    );

    const dockButton = screen.getByRole("button", {
      name: /dock notes panel back/i,
    });
    await user.click(dockButton);
    expect(onDock).toHaveBeenCalledOnce();
  });

  it("shows 'Dock' label on the dock button", () => {
    render(
      <FloatingPanel onDock={vi.fn()}>
        <p>Content</p>
      </FloatingPanel>,
    );
    expect(screen.getByText("Dock")).toBeInTheDocument();
  });
});
