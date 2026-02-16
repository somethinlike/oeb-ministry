// This file runs before every test. It adds custom matchers from
// @testing-library/jest-dom, like .toBeInTheDocument() and .toHaveTextContent().
// Without this, you'd need to import these matchers in every test file.
import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement Pointer Events API methods. Our drag-based
// components (BottomSheet, FloatingPanel, SplitPaneDivider) call
// setPointerCapture/releasePointerCapture on pointer down. Without
// these stubs, pointer events from userEvent.click() throw errors.
if (typeof HTMLElement.prototype.setPointerCapture === "undefined") {
  HTMLElement.prototype.setPointerCapture = () => {};
}
if (typeof HTMLElement.prototype.releasePointerCapture === "undefined") {
  HTMLElement.prototype.releasePointerCapture = () => {};
}
