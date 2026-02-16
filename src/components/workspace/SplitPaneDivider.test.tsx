/**
 * Tests for SplitPaneDivider — draggable resize handle between panes.
 *
 * Verifies:
 * - Renders with correct ARIA role and label
 * - Is focusable (tabIndex=0)
 */

import { render, screen } from "@testing-library/react";
import { useRef } from "react";
import { SplitPaneDivider } from "./SplitPaneDivider";

// Wrapper that provides a container ref
function DividerWithContainer(
  props: Omit<
    React.ComponentProps<typeof SplitPaneDivider>,
    "containerRef"
  >,
) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} style={{ width: 800 }}>
      <SplitPaneDivider {...props} containerRef={ref} />
    </div>
  );
}

describe("SplitPaneDivider", () => {
  it("renders with separator role", () => {
    render(
      <DividerWithContainer onResize={vi.fn()} onResizeEnd={vi.fn()} />,
    );
    const separator = screen.getByRole("separator");
    expect(separator).toBeInTheDocument();
  });

  it("has accessible label", () => {
    render(
      <DividerWithContainer onResize={vi.fn()} onResizeEnd={vi.fn()} />,
    );
    const separator = screen.getByRole("separator");
    expect(separator).toHaveAttribute("aria-label", "Resize panes");
  });

  it("has vertical orientation", () => {
    render(
      <DividerWithContainer onResize={vi.fn()} onResizeEnd={vi.fn()} />,
    );
    const separator = screen.getByRole("separator");
    expect(separator).toHaveAttribute("aria-orientation", "vertical");
  });

  it("is focusable for keyboard access", () => {
    render(
      <DividerWithContainer onResize={vi.fn()} onResizeEnd={vi.fn()} />,
    );
    const separator = screen.getByRole("separator");
    expect(separator).toHaveAttribute("tabIndex", "0");
  });
});
