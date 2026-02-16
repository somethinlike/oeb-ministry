/**
 * Tests for TranslationFirstOpenPopup — progressive-dismissal callout.
 *
 * Verifies:
 * - Does not show when triggerOpen is false
 * - Shows when triggerOpen becomes true (first interaction)
 * - Opacity decreases with each click-away (100% → 90% → 80%)
 * - Disappears permanently after 3rd dismissal
 * - Persists dismissal state in localStorage
 * - Does not show if already dismissed in localStorage
 * - Escape key counts as a dismissal click
 * - Contains a link to /translations
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { TranslationFirstOpenPopup } from "./TranslationFirstOpenPopup";

const STORAGE_KEY = "oeb-translation-info-dismissed";

describe("TranslationFirstOpenPopup", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("does not render when triggerOpen is false", () => {
    render(<TranslationFirstOpenPopup triggerOpen={false} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders when triggerOpen is true", () => {
    render(<TranslationFirstOpenPopup triggerOpen={true} />);
    const popup = screen.getByRole("status");
    expect(popup).toBeInTheDocument();
    expect(popup).toHaveTextContent(/Each Bible translation has its own story/);
  });

  it("contains a link to /translations", () => {
    render(<TranslationFirstOpenPopup triggerOpen={true} />);
    const link = screen.getByRole("link", {
      name: /Visit our Translations page/,
    });
    expect(link).toHaveAttribute("href", "/translations");
  });

  it("starts at full opacity", () => {
    render(<TranslationFirstOpenPopup triggerOpen={true} />);
    const popup = screen.getByRole("status");
    expect(popup.className).toContain("opacity-100");
  });

  it("reduces opacity on first click-away", () => {
    render(<TranslationFirstOpenPopup triggerOpen={true} />);

    // Click outside the popup
    fireEvent.mouseDown(document.body);

    const popup = screen.getByRole("status");
    expect(popup.className).toContain("opacity-90");
  });

  it("reduces opacity further on second click-away", () => {
    render(<TranslationFirstOpenPopup triggerOpen={true} />);

    fireEvent.mouseDown(document.body);
    fireEvent.mouseDown(document.body);

    const popup = screen.getByRole("status");
    expect(popup.className).toContain("opacity-80");
  });

  it("disappears after third click-away", () => {
    render(<TranslationFirstOpenPopup triggerOpen={true} />);

    fireEvent.mouseDown(document.body);
    fireEvent.mouseDown(document.body);
    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("persists dismissal in localStorage after 3 click-aways", () => {
    render(<TranslationFirstOpenPopup triggerOpen={true} />);

    fireEvent.mouseDown(document.body);
    fireEvent.mouseDown(document.body);
    fireEvent.mouseDown(document.body);

    expect(localStorage.getItem(STORAGE_KEY)).toBe("true");
  });

  it("does not show if already dismissed in localStorage", () => {
    localStorage.setItem(STORAGE_KEY, "true");
    render(<TranslationFirstOpenPopup triggerOpen={true} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("Escape key counts as a dismissal", () => {
    render(<TranslationFirstOpenPopup triggerOpen={true} />);

    // First dismiss via Escape
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("status").className).toContain("opacity-90");

    // Second dismiss via Escape
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("status").className).toContain("opacity-80");

    // Third dismiss via Escape — popup disappears
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not dismiss on click inside the popup", () => {
    render(<TranslationFirstOpenPopup triggerOpen={true} />);
    const popup = screen.getByRole("status");

    // Click inside the popup — should NOT dismiss
    fireEvent.mouseDown(popup);

    // Still at full opacity
    expect(popup.className).toContain("opacity-100");
  });

  it("has aria-live='polite' for screen readers", () => {
    render(<TranslationFirstOpenPopup triggerOpen={true} />);
    const popup = screen.getByRole("status");
    expect(popup).toHaveAttribute("aria-live", "polite");
  });
});
