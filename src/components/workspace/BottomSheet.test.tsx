/**
 * Tests for BottomSheet — mobile annotation panel that slides up from bottom.
 *
 * Verifies:
 * - Renders as an accessible dialog
 * - Renders children content
 * - Shows minimize button when expanded
 * - Hides minimize button when at peek height
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottomSheet } from "./BottomSheet";

describe("BottomSheet", () => {
  it("renders with dialog role and accessible label", () => {
    render(
      <BottomSheet>
        <p>Notes</p>
      </BottomSheet>,
    );
    const dialog = screen.getByRole("dialog", {
      name: /your notes/i,
    });
    expect(dialog).toBeInTheDocument();
  });

  it("renders children content", () => {
    render(
      <BottomSheet>
        <p>Annotation sidebar here</p>
      </BottomSheet>,
    );
    expect(
      screen.getByText("Annotation sidebar here"),
    ).toBeInTheDocument();
  });

  it("shows header text", () => {
    render(
      <BottomSheet>
        <p>Content</p>
      </BottomSheet>,
    );
    expect(screen.getByText("Your Notes")).toBeInTheDocument();
  });

  it("does not show minimize button when at peek (default)", () => {
    render(
      <BottomSheet>
        <p>Content</p>
      </BottomSheet>,
    );
    expect(
      screen.queryByRole("button", { name: /minimize/i }),
    ).not.toBeInTheDocument();
  });

  it("shows minimize button when expanded", () => {
    // expanded prop triggers auto-expand from peek to half
    render(
      <BottomSheet expanded>
        <p>Content</p>
      </BottomSheet>,
    );
    expect(
      screen.getByRole("button", { name: /minimize/i }),
    ).toBeInTheDocument();
  });

  it("clicking minimize returns to peek state", async () => {
    const user = userEvent.setup();
    render(
      <BottomSheet expanded>
        <p>Content</p>
      </BottomSheet>,
    );

    const minimizeBtn = screen.getByRole("button", { name: /minimize/i });
    await user.click(minimizeBtn);

    // After minimizing, the button should disappear (we're back at peek)
    expect(
      screen.queryByRole("button", { name: /minimize/i }),
    ).not.toBeInTheDocument();
  });
});
