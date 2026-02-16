/**
 * Tests for ChapterAnnotationList — displays annotations for the current chapter.
 *
 * Verifies:
 * - Shows sign-in prompt when no user is authenticated
 * - Shows loading skeleton during fetch
 * - Shows empty state when no annotations exist
 * - Renders annotation cards with verse labels and previews
 * - Shows "Write a note" button only when verses are selected
 * - Calls editAnnotation when an annotation card is clicked
 * - Calls startNewAnnotation when "Write a note" is clicked
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChapterAnnotationList } from "./ChapterAnnotationList";
import { defaultMockContext, makeAnnotation } from "./__test-helpers";
import type { WorkspaceContextValue } from "../../types/workspace";

// Mock useWorkspace to return controlled values
let mockContextValue: WorkspaceContextValue;
vi.mock("./WorkspaceProvider", () => ({
  useWorkspace: () => mockContextValue,
}));

describe("ChapterAnnotationList", () => {
  beforeEach(() => {
    mockContextValue = defaultMockContext();
  });

  it("shows sign-in prompt when user is not authenticated", () => {
    mockContextValue = defaultMockContext({ userId: null });
    render(<ChapterAnnotationList />);
    expect(
      screen.getByText(/sign in to create and view/i),
    ).toBeInTheDocument();
  });

  it("shows loading skeleton while annotations are loading", () => {
    mockContextValue = defaultMockContext({ annotationsLoading: true });
    render(<ChapterAnnotationList />);
    expect(
      screen.getByRole("status", { name: /loading notes/i }),
    ).toBeInTheDocument();
  });

  it("shows empty state when no annotations exist", () => {
    mockContextValue = defaultMockContext({ annotations: [] });
    render(<ChapterAnnotationList />);
    expect(
      screen.getByText(/no notes for this chapter/i),
    ).toBeInTheDocument();
  });

  it("renders annotation cards with verse labels", () => {
    const ann = makeAnnotation({
      anchor: { book: "jhn" as any, chapter: 3, verseStart: 16, verseEnd: 18 },
      contentMd: "A profound verse about love.",
    });
    mockContextValue = defaultMockContext({ annotations: [ann] });
    render(<ChapterAnnotationList />);

    // Should show a range label like "John 3:16-18"
    expect(screen.getByText(/John 3:16-18/)).toBeInTheDocument();
    expect(
      screen.getByText(/A profound verse about love/),
    ).toBeInTheDocument();
  });

  it("renders single-verse label without range", () => {
    const ann = makeAnnotation({
      anchor: { book: "jhn" as any, chapter: 3, verseStart: 16, verseEnd: 16 },
    });
    mockContextValue = defaultMockContext({ annotations: [ann] });
    render(<ChapterAnnotationList />);

    expect(screen.getByText(/John 3:16$/)).toBeInTheDocument();
  });

  it("shows annotation count in header", () => {
    const annotations = [
      makeAnnotation({ id: "a1" }),
      makeAnnotation({ id: "a2" }),
    ];
    mockContextValue = defaultMockContext({ annotations });
    render(<ChapterAnnotationList />);
    expect(screen.getByText("(2)")).toBeInTheDocument();
  });

  it("truncates long annotation content", () => {
    const longContent = "A".repeat(200);
    const ann = makeAnnotation({ contentMd: longContent });
    mockContextValue = defaultMockContext({ annotations: [ann] });
    render(<ChapterAnnotationList />);

    // Content should be truncated with ellipsis
    const preview = screen.getByText(/\.\.\.$/);
    expect(preview).toBeInTheDocument();
  });

  it("does not show 'Write a note' button when no verses selected", () => {
    mockContextValue = defaultMockContext({ selection: null });
    render(<ChapterAnnotationList />);
    expect(
      screen.queryByRole("button", { name: /write a note/i }),
    ).not.toBeInTheDocument();
  });

  it("shows 'Write a note' button when verses are selected", () => {
    mockContextValue = defaultMockContext({
      selection: { start: 16, end: 18 },
    });
    render(<ChapterAnnotationList />);
    expect(
      screen.getByRole("button", { name: /write a note/i }),
    ).toBeInTheDocument();
  });

  it("calls startNewAnnotation when 'Write a note' is clicked", async () => {
    const user = userEvent.setup();
    const startNewAnnotation = vi.fn();
    mockContextValue = defaultMockContext({
      selection: { start: 16, end: 18 },
      startNewAnnotation,
    });
    render(<ChapterAnnotationList />);

    await user.click(
      screen.getByRole("button", { name: /write a note/i }),
    );
    expect(startNewAnnotation).toHaveBeenCalledOnce();
  });

  it("calls editAnnotation when an annotation card is clicked", async () => {
    const user = userEvent.setup();
    const editAnnotation = vi.fn();
    const ann = makeAnnotation();
    mockContextValue = defaultMockContext({
      annotations: [ann],
      editAnnotation,
    });
    render(<ChapterAnnotationList />);

    await user.click(
      screen.getByRole("button", { name: /edit note for/i }),
    );
    expect(editAnnotation).toHaveBeenCalledWith(ann);
  });
});
