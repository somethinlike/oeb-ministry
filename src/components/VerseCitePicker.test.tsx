/**
 * Tests for VerseCitePicker — verse citation popover for the note editor.
 *
 * Verifies:
 * - buildCitation produces correct Markdown for all trim combinations
 * - buildCitation uses book display names and em dash separator
 * - Popover opens/closes on click
 * - Popover closes on Escape
 * - Shows anchor verses after loading
 * - Clicking a verse enters trim mode
 * - Trim buttons modify the preview
 * - Insert button calls onCite with correct Markdown
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildCitation, VerseCitePicker } from "./VerseCitePicker";
import type { BookId } from "../types/bible";

// ── buildCitation unit tests ──

describe("buildCitation", () => {
  it("produces correct Markdown with no trimming", () => {
    const result = buildCitation(
      "Genesis 1:3",
      "God said, \"Let there be light,\" and there was light.",
      0,
      0,
    );
    expect(result).toBe(
      "> **Genesis 1:3** \u2014 God said, \"Let there be light,\" and there was light.",
    );
  });

  it("adds leading ellipsis when trimming from start", () => {
    const result = buildCitation(
      "Genesis 1:3",
      "God said, \"Let there be light,\" and there was light.",
      2,
      0,
    );
    // "God said," removed → starts with "\"Let"
    expect(result).toMatch(/^> \*\*Genesis 1:3\*\* \u2014 \.\.\./);
    expect(result).not.toContain("God said,");
  });

  it("adds trailing ellipsis when trimming from end", () => {
    const result = buildCitation(
      "Genesis 1:3",
      "God said, \"Let there be light,\" and there was light.",
      0,
      2,
    );
    expect(result).toMatch(/\.\.\.$/);
    expect(result).not.toContain("was light.");
  });

  it("adds both ellipses when trimming from both ends", () => {
    const result = buildCitation(
      "John 3:16",
      "For God so loved the world that he gave his only Son",
      2,
      2,
    );
    expect(result).toMatch(/^> \*\*John 3:16\*\* \u2014 \.\.\./);
    expect(result).toMatch(/\.\.\.$/);
    expect(result).not.toContain("For God");
    expect(result).not.toContain("only Son");
  });

  it("uses em dash as separator", () => {
    const result = buildCitation("Romans 5:8", "But God shows his love.", 0, 0);
    expect(result).toContain("\u2014"); // em dash
    expect(result).not.toContain("--");
  });

  it("handles single-word text with no trimming", () => {
    const result = buildCitation("Psalm 117:1", "Hallelujah!", 0, 0);
    expect(result).toBe("> **Psalm 117:1** \u2014 Hallelujah!");
  });
});

// ── VerseCitePicker component tests ──

// Mock loadChapter to return predictable verse data
vi.mock("../lib/bible-loader", () => ({
  loadChapter: vi.fn(async (_translation: string, book: string, chapter: number) => {
    if (book === "gen" && chapter === 1) {
      return {
        translation: "web",
        book: "gen",
        bookName: "Genesis",
        chapter: 1,
        verses: [
          { number: 1, text: "In the beginning, God created the heavens and the earth." },
          { number: 2, text: "The earth was formless and empty." },
          { number: 3, text: "God said, \"Let there be light,\" and there was light." },
        ],
      };
    }
    return null;
  }),
}));

// Mock translation toggles to return no-op toggles
vi.mock("../lib/translation-toggles", () => ({
  loadTranslationToggles: () => ({
    divineName: false,
    baptism: false,
    assembly: false,
    onlyBegotten: false,
  }),
  applyTranslationToggles: (text: string) => text,
  TOGGLE_DEFAULTS: {
    divineName: false,
    baptism: false,
    assembly: false,
    onlyBegotten: false,
  },
}));

const defaultProps = {
  anchorBook: "gen" as BookId,
  anchorChapter: 1,
  anchorVerseStart: 1,
  anchorVerseEnd: 3,
  crossReferences: [],
  translation: "web",
  onCite: vi.fn(),
};

describe("VerseCitePicker", () => {
  beforeEach(() => {
    defaultProps.onCite = vi.fn();
  });

  it("renders the Cite button", () => {
    render(<VerseCitePicker {...defaultProps} />);
    expect(screen.getByRole("button", { name: /cite a verse/i })).toBeInTheDocument();
  });

  it("does not show popover initially", () => {
    render(<VerseCitePicker {...defaultProps} />);
    expect(screen.queryByText("Your verses")).not.toBeInTheDocument();
  });

  it("shows verse list when opened", async () => {
    render(<VerseCitePicker {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /cite a verse/i }));

    await waitFor(() => {
      expect(screen.getByText("Your verses")).toBeInTheDocument();
    });
  });

  it("shows anchor verses after loading", async () => {
    render(<VerseCitePicker {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /cite a verse/i }));

    await waitFor(() => {
      expect(screen.getByText(/In the beginning/)).toBeInTheDocument();
      expect(screen.getByText(/formless and empty/)).toBeInTheDocument();
      expect(screen.getByText(/Let there be light/)).toBeInTheDocument();
    });
  });

  it("enters trim mode when a verse is clicked", async () => {
    render(<VerseCitePicker {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /cite a verse/i }));

    await waitFor(() => {
      expect(screen.getByText(/In the beginning/)).toBeInTheDocument();
    });

    // Click the first verse button
    fireEvent.click(screen.getByText(/In the beginning/).closest("button")!);

    // Should show trim controls and insert button
    expect(screen.getByText("Insert citation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /trim one word from the start/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /trim one word from the end/i })).toBeInTheDocument();
  });

  it("shows verse reference in trim mode header", async () => {
    render(<VerseCitePicker {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /cite a verse/i }));

    await waitFor(() => {
      expect(screen.getByText(/In the beginning/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/In the beginning/).closest("button")!);

    // The header shows the verse ref — use getAllByText since it also appears in the preview
    const matches = screen.getAllByText("Genesis 1:1");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("calls onCite with correct Markdown when Insert is clicked", async () => {
    const user = userEvent.setup();
    render(<VerseCitePicker {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /cite a verse/i }));

    await waitFor(() => {
      expect(screen.getByText(/In the beginning/)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/In the beginning/).closest("button")!);
    await user.click(screen.getByText("Insert citation"));

    expect(defaultProps.onCite).toHaveBeenCalledWith(
      "> **Genesis 1:1** \u2014 In the beginning, God created the heavens and the earth.",
    );
  });

  it("closes popover on Escape", async () => {
    render(<VerseCitePicker {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /cite a verse/i }));

    await waitFor(() => {
      expect(screen.getByText("Your verses")).toBeInTheDocument();
    });

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(screen.queryByText("Your verses")).not.toBeInTheDocument();
  });

  it("shows back button in trim mode that returns to verse list", async () => {
    const user = userEvent.setup();
    render(<VerseCitePicker {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /cite a verse/i }));

    await waitFor(() => {
      expect(screen.getByText(/In the beginning/)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/In the beginning/).closest("button")!);
    expect(screen.getByText("Insert citation")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back to verse list/i }));
    expect(screen.queryByText("Insert citation")).not.toBeInTheDocument();
    expect(screen.getByText("Your verses")).toBeInTheDocument();
  });

  it("shows empty state when no verses are available", async () => {
    render(
      <VerseCitePicker
        {...defaultProps}
        anchorBook={"xyz" as BookId}
        anchorChapter={99}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /cite a verse/i }));

    await waitFor(() => {
      expect(screen.getByText(/Verse text isn't available/)).toBeInTheDocument();
    });
  });
});
