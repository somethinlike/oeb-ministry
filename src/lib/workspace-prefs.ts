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

interface WorkspacePrefs {
  /** Reader pane width as a fraction (0.3–0.7). Default 0.6 */
  splitRatio: number;
  /** Whether panes are swapped (reader on right). Default false */
  swapped: boolean;
}

const DEFAULTS: WorkspacePrefs = {
  splitRatio: 0.6,
  swapped: false,
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
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Storage unavailable — silently ignore
  }
}
