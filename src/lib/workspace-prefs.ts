/**
 * Workspace preferences — persists layout preferences to localStorage.
 *
 * Stores:
 * - Split ratio (how wide the reader pane is, 0.3–0.7)
 * - Sides swapped (whether reader is on the right instead of left)
 *
 * All reads have safe fallbacks if localStorage is unavailable
 * (private browsing, storage full, SSR, etc.).
 */

const STORAGE_KEY = "oeb-workspace-prefs";

/** "centered" = max-width prose column; "columns" = full-width CSS multi-column */
export type ReaderLayout = "centered" | "columns";

/** How annotation dot indicators display next to verse numbers.
 * "blue" = original blue dots, "subtle" = gray dots, "hidden" = no dots */
export type AnnotationDotStyle = "blue" | "subtle" | "hidden";

/** Open-source bundled fonts for Bible reading. See src/lib/reader-fonts.ts for details. */
export type ReaderFont = "system" | "inter" | "source-sans" | "literata" | "source-serif" | "lora";

/** Valid font keys for validation on load */
const VALID_FONTS: ReadonlySet<string> = new Set([
  "system", "inter", "source-sans", "literata", "source-serif", "lora",
]);

/** Valid annotation dot style keys */
const VALID_DOT_STYLES: ReadonlySet<string> = new Set(["blue", "subtle", "hidden"]);

interface WorkspacePrefs {
  /** Reader pane width as a fraction (0.3–0.7). Default 0.6 */
  splitRatio: number;
  /** Whether panes are swapped (reader on right). Default false */
  swapped: boolean;
  /** Whether the annotation panel is undocked (floating window). Default false */
  undocked: boolean;
  /** Reader text layout mode. Default "centered" */
  readerLayout: ReaderLayout;
  /** Reader font for Bible text. Default "system" */
  readerFont: ReaderFont;
  /** How annotation dots display next to verse numbers. Default "blue" */
  annotationDots: AnnotationDotStyle;
  /** Whether clean view mode is active (hides toolbar, shows cog in nav). Default false */
  cleanView: boolean;
}

const DEFAULTS: WorkspacePrefs = {
  splitRatio: 0.6,
  swapped: false,
  undocked: false,
  readerLayout: "centered",
  readerFont: "system",
  annotationDots: "blue",
  cleanView: false,
};

/** Clamp split ratio to safe bounds */
function clampRatio(ratio: number): number {
  return Math.min(0.7, Math.max(0.3, ratio));
}

export function loadWorkspacePrefs(): WorkspacePrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<WorkspacePrefs>;
    return {
      splitRatio: clampRatio(parsed.splitRatio ?? DEFAULTS.splitRatio),
      swapped: typeof parsed.swapped === "boolean" ? parsed.swapped : DEFAULTS.swapped,
      undocked: typeof parsed.undocked === "boolean" ? parsed.undocked : DEFAULTS.undocked,
      readerLayout:
        parsed.readerLayout === "centered" || parsed.readerLayout === "columns"
          ? parsed.readerLayout
          : DEFAULTS.readerLayout,
      readerFont: VALID_FONTS.has(parsed.readerFont ?? "")
        ? (parsed.readerFont as ReaderFont)
        : DEFAULTS.readerFont,
      annotationDots: VALID_DOT_STYLES.has(parsed.annotationDots ?? "")
        ? (parsed.annotationDots as AnnotationDotStyle)
        : DEFAULTS.annotationDots,
      cleanView: typeof parsed.cleanView === "boolean" ? parsed.cleanView : DEFAULTS.cleanView,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveWorkspacePrefs(prefs: Partial<WorkspacePrefs>): void {
  try {
    const current = loadWorkspacePrefs();
    const merged: WorkspacePrefs = {
      splitRatio: clampRatio(prefs.splitRatio ?? current.splitRatio),
      swapped: prefs.swapped ?? current.swapped,
      undocked: prefs.undocked ?? current.undocked,
      readerLayout: prefs.readerLayout ?? current.readerLayout,
      readerFont: prefs.readerFont ?? current.readerFont,
      annotationDots: prefs.annotationDots ?? current.annotationDots,
      cleanView: prefs.cleanView ?? current.cleanView,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Storage unavailable — silently ignore
  }
}
