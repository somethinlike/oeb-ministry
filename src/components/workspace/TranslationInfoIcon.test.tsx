/**
 * Tests for TranslationInfoIcon — circled "i" link with tooltip.
 *
 * Verifies:
 * - Renders an accessible link to /translations
 * - Tooltip appears on hover and focus
 * - Tooltip disappears on mouse leave and blur
 * - Correct ARIA linkage (aria-describedby → tooltip id)
 */

import { render, screen, fireEvent, act } from "@testing-library/react";
import { TranslationInfoIcon } from "./TranslationInfoIcon";

describe("TranslationInfoIcon", () => {
  it("renders a link to /translations", () => {
    render(<TranslationInfoIcon />);
    const link = screen.getByRole("link", {
      name: "Learn about Bible translations",
    });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/translations");
  });

  it("displays 'i' as the icon text", () => {
    render(<TranslationInfoIcon />);
    const link = screen.getByRole("link", {
      name: "Learn about Bible translations",
    });
    expect(link).toHaveTextContent("i");
  });

  it("shows tooltip on mouse enter", () => {
    render(<TranslationInfoIcon />);
    // Tooltip should not be visible initially
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    // Hover over the wrapper span
    const wrapper = screen.getByRole("link", {
      name: "Learn about Bible translations",
    }).parentElement!;
    fireEvent.mouseEnter(wrapper);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent(/Visit our Translations page/);
  });

  it("hides tooltip on mouse leave after delay", () => {
    vi.useFakeTimers();
    render(<TranslationInfoIcon />);

    const wrapper = screen.getByRole("link", {
      name: "Learn about Bible translations",
    }).parentElement!;

    // Show tooltip
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    // Start hiding
    fireEvent.mouseLeave(wrapper);

    // Still visible during delay
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    // After delay, tooltip should be gone
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("shows tooltip on focus", () => {
    render(<TranslationInfoIcon />);
    const link = screen.getByRole("link", {
      name: "Learn about Bible translations",
    });

    fireEvent.focus(link);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("hides tooltip on blur", () => {
    render(<TranslationInfoIcon />);
    const link = screen.getByRole("link", {
      name: "Learn about Bible translations",
    });

    fireEvent.focus(link);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.blur(link);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("sets aria-describedby when tooltip is visible", () => {
    render(<TranslationInfoIcon />);
    const link = screen.getByRole("link", {
      name: "Learn about Bible translations",
    });

    // No aria-describedby when tooltip hidden
    expect(link).not.toHaveAttribute("aria-describedby");

    // Focus to show tooltip
    fireEvent.focus(link);
    const tooltip = screen.getByRole("tooltip");

    // aria-describedby should reference the tooltip's id
    expect(link).toHaveAttribute("aria-describedby", tooltip.id);
  });
});
