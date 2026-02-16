/**
 * Tests for AnnotationSidebar — the right pane of the workspace.
 *
 * Verifies:
 * - Shows annotation list by default
 * - Shows sign-in prompt when user is not authenticated
 * - Shows back button and editor in editor view
 * - Calls showAnnotationList when back button is clicked
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnnotationSidebar } from "./AnnotationSidebar";
import { defaultMockContext, makeAnnotation } from "./__test-helpers";
import type { WorkspaceContextValue } from "../../types/workspace";

// Mock useWorkspace to return controlled values
let mockContextValue: WorkspaceContextValue;
vi.mock("./WorkspaceProvider", () => ({
  useWorkspace: () => mockContextValue,
}));

// Mock ChapterAnnotationList — already tested separately
vi.mock("./ChapterAnnotationList", () => ({
  ChapterAnnotationList: () => (
    <div data-testid="chapter-annotation-list">Annotation List</div>
  ),
}));

// Mock AnnotationPanel — complex component with Supabase dependency
vi.mock("../AnnotationPanel", () => ({
  AnnotationPanel: (props: { verseStart: number; verseEnd: number }) => (
    <div data-testid="annotation-panel">
      Editor for verses {props.verseStart}-{props.verseEnd}
    </div>
  ),
}));

describe("AnnotationSidebar", () => {
  beforeEach(() => {
    mockContextValue = defaultMockContext();
  });

  it("shows annotation list in default list view", () => {
    mockContextValue = defaultMockContext({ sidebarView: "list" });
    render(<AnnotationSidebar />);
    expect(
      screen.getByTestId("chapter-annotation-list"),
    ).toBeInTheDocument();
  });

  it("shows annotation list when user is not authenticated", () => {
    mockContextValue = defaultMockContext({ userId: null });
    render(<AnnotationSidebar />);
    expect(
      screen.getByTestId("chapter-annotation-list"),
    ).toBeInTheDocument();
  });

  it("shows editor when sidebarView is 'editor' with new annotation", () => {
    mockContextValue = defaultMockContext({
      sidebarView: "editor",
      selection: { start: 5, end: 7 },
      editingAnnotation: null,
    });
    render(<AnnotationSidebar />);
    expect(screen.getByTestId("annotation-panel")).toBeInTheDocument();
    expect(screen.getByText(/Editor for verses 5-7/)).toBeInTheDocument();
  });

  it("shows editor with existing annotation verse range", () => {
    const ann = makeAnnotation({
      anchor: { book: "jhn" as any, chapter: 3, verseStart: 10, verseEnd: 12 },
    });
    mockContextValue = defaultMockContext({
      sidebarView: "editor",
      editingAnnotation: ann,
    });
    render(<AnnotationSidebar />);
    expect(screen.getByText(/Editor for verses 10-12/)).toBeInTheDocument();
  });

  it("shows back button in editor view", () => {
    mockContextValue = defaultMockContext({
      sidebarView: "editor",
      selection: { start: 1, end: 1 },
    });
    render(<AnnotationSidebar />);
    expect(
      screen.getByRole("button", { name: /back to notes/i }),
    ).toBeInTheDocument();
  });

  it("calls showAnnotationList when back button is clicked", async () => {
    const user = userEvent.setup();
    const showAnnotationList = vi.fn();
    mockContextValue = defaultMockContext({
      sidebarView: "editor",
      selection: { start: 1, end: 1 },
      showAnnotationList,
    });
    render(<AnnotationSidebar />);

    await user.click(
      screen.getByRole("button", { name: /back to notes/i }),
    );
    expect(showAnnotationList).toHaveBeenCalledOnce();
  });
});
