/**
 * Workspace — the top-level split-pane Bible reader + annotation sidebar.
 *
 * This is the "desk" where reading and annotating happen side by side.
 *
 * Layout modes (desktop ≥1024px):
 * - **Docked:** resizable split-pane (reader + sidebar) with draggable divider
 * - **Undocked:** reader fills full width, sidebar floats as a draggable window
 *
 * Mobile (<1024px): full-screen reader + bottom sheet for annotations
 *
 * Split ratio, side preference, and dock state persist to localStorage.
 */

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { WorkspaceProvider, useWorkspace } from "./WorkspaceProvider";
import { EncryptionProvider } from "../EncryptionProvider";
import { AudioProvider, useAudioContext } from "../AudioProvider";
import { AudioTimingEditor } from "../AudioTimingEditor";
import { KeyboardManager, KeybindHintToast } from "../KeyboardManager";
import type { KeybindingPreset } from "../../lib/commands";
import { WorkspaceToolbar } from "./WorkspaceToolbar";
import { ReaderPane } from "./ReaderPane";
import { AnnotationSidebar } from "./AnnotationSidebar";
import { SplitPaneDivider } from "./SplitPaneDivider";
import { FloatingPanel } from "./FloatingPanel";
import { BottomSheet } from "./BottomSheet";
import {
  loadWorkspacePrefs,
  saveWorkspacePrefs,
  type ReaderLayout,
  type ReaderFont,
  type AnnotationDotStyle,
} from "../../lib/workspace-prefs";
import {
  loadTranslationToggles,
  saveTranslationToggles,
  type TranslationToggles,
} from "../../lib/translation-toggles";
import type { ReaderSettingsProps } from "./ReaderSettingsPopover";

interface WorkspaceProps {
  translation: string;
  book: string;
  chapter: number;
  userId: string | null;
  /** User's email — used by credential managers when saving the encryption passphrase */
  userEmail: string | null;
}

export function Workspace({
  translation,
  book,
  chapter,
  userId,
  userEmail,
}: WorkspaceProps) {
  // Load persisted preferences (split ratio + swapped sides + undocked)
  const [prefs] = useState(() => loadWorkspacePrefs());
  const [splitRatio, setSplitRatio] = useState(prefs.splitRatio);
  const [swapped, setSwapped] = useState(prefs.swapped);
  const [undocked, setUndocked] = useState(prefs.undocked);
  const [readerLayout, setReaderLayout] = useState<ReaderLayout>(prefs.readerLayout);
  const [readerFont, setReaderFont] = useState<ReaderFont>(prefs.readerFont);
  const [annotationDots, setAnnotationDots] = useState<AnnotationDotStyle>(prefs.annotationDots);
  const [cleanView, setCleanView] = useState(prefs.cleanView);
  const [translationToggles, setTranslationToggles] = useState<TranslationToggles>(
    () => loadTranslationToggles(),
  );

  // Ref to the split container — divider needs it to calculate ratio
  const containerRef = useRef<HTMLDivElement>(null);

  const handleResize = useCallback((ratio: number) => {
    setSplitRatio(ratio);
  }, []);

  const handleResizeEnd = useCallback((ratio: number) => {
    setSplitRatio(ratio);
    saveWorkspacePrefs({ splitRatio: ratio });
  }, []);

  const toggleSwap = useCallback(() => {
    setSwapped((prev) => {
      const next = !prev;
      saveWorkspacePrefs({ swapped: next });
      return next;
    });
  }, []);

  const handleUndock = useCallback(() => {
    setUndocked(true);
    saveWorkspacePrefs({ undocked: true });
  }, []);

  const handleDock = useCallback(() => {
    setUndocked(false);
    saveWorkspacePrefs({ undocked: false });
  }, []);

  const toggleReaderLayout = useCallback(() => {
    setReaderLayout((prev) => {
      const next: ReaderLayout = prev === "centered" ? "columns" : "centered";
      saveWorkspacePrefs({ readerLayout: next });
      return next;
    });
  }, []);

  const handleFontChange = useCallback((font: ReaderFont) => {
    setReaderFont(font);
    saveWorkspacePrefs({ readerFont: font });
  }, []);

  const handleEnterCleanView = useCallback(() => {
    setCleanView(true);
    saveWorkspacePrefs({ cleanView: true });
  }, []);

  const handleExitCleanView = useCallback(() => {
    setCleanView(false);
    saveWorkspacePrefs({ cleanView: false });
  }, []);

  const handleAnnotationDotsChange = useCallback((style: AnnotationDotStyle) => {
    setAnnotationDots(style);
    saveWorkspacePrefs({ annotationDots: style });
  }, []);

  const handleToggleChange = useCallback((key: keyof TranslationToggles) => {
    setTranslationToggles((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveTranslationToggles(next);
      return next;
    });
  }, []);

  // Build CSS grid template from the split ratio.
  // The divider gets a fixed 8px (0.5rem) column.
  const readerFr = `${splitRatio}fr`;
  const sidebarFr = `${1 - splitRatio}fr`;
  const gridTemplate = swapped
    ? `${sidebarFr} 0.5rem ${readerFr}`
    : `${readerFr} 0.5rem ${sidebarFr}`;

  // Settings props for the clean-view cog popover
  const settingsProps: ReaderSettingsProps = {
    readerLayout,
    onToggleReaderLayout: toggleReaderLayout,
    readerFont,
    onFontChange: handleFontChange,
    annotationDots,
    onAnnotationDotsChange: handleAnnotationDotsChange,
    translationToggles,
    onToggleChange: handleToggleChange,
    onExitCleanView: handleExitCleanView,
  };

  // Determine which pane goes first based on swap state
  const readerPane = (
    <ReaderPane
      readerLayout={readerLayout}
      translationToggles={translationToggles}
      readerFont={readerFont}
      annotationDots={annotationDots}
      cleanView={cleanView}
      settingsProps={settingsProps}
    />
  );
  const leftPane = swapped ? <AnnotationSidebar /> : readerPane;
  const rightPane = swapped ? readerPane : <AnnotationSidebar />;

  // Load keybinding preset + custom overrides from user preferences (localStorage)
  const [keybindPreset] = useState<KeybindingPreset>(() => {
    try {
      const stored = localStorage.getItem("oeb-user-prefs");
      const parsed = stored ? JSON.parse(stored) : {};
      if (["default", "vscode", "vim"].includes(parsed.keybindingPreset)) {
        return parsed.keybindingPreset as KeybindingPreset;
      }
    } catch { /* default */ }
    return "default";
  });

  const [customKeybindings] = useState<Record<string, string> | undefined>(() => {
    try {
      const stored = localStorage.getItem("oeb-user-prefs");
      const parsed = stored ? JSON.parse(stored) : {};
      if (parsed.customKeybindings && typeof parsed.customKeybindings === "object") {
        return parsed.customKeybindings as Record<string, string>;
      }
    } catch { /* default */ }
    return undefined;
  });

  return (
    <EncryptionProvider userId={userId} userEmail={userEmail}>
    <AudioProvider book={book} chapter={chapter}>
    <WorkspaceProvider
      translation={translation}
      book={book}
      chapter={chapter}
      userId={userId}
    >
      <WorkspaceKeyboardWrapper
        keybindPreset={keybindPreset}
        customKeybindings={customKeybindings}
        toggleSwap={toggleSwap}
        toggleReaderLayout={toggleReaderLayout}
        handleEnterCleanView={handleEnterCleanView}
        handleAnnotationDotsChange={handleAnnotationDotsChange}
        annotationDots={annotationDots}
        handleUndock={handleUndock}
        handleDock={handleDock}
        undocked={undocked}
        handleToggleChange={handleToggleChange}
      >
      <div className="flex flex-col h-full rounded-lg border border-edge bg-panel shadow-sm">
        {/* Toolbar: breadcrumbs + undock/swap + translation picker.
             Hidden in clean view — settings move to cog in chapter nav. */}
        {!cleanView && (
          <WorkspaceToolbar
            swapped={swapped}
            onToggleSwap={toggleSwap}
            undocked={undocked}
            onUndock={handleUndock}
            onDock={handleDock}
            readerLayout={readerLayout}
            onToggleReaderLayout={toggleReaderLayout}
            translationToggles={translationToggles}
            onToggleChange={handleToggleChange}
            readerFont={readerFont}
            onFontChange={handleFontChange}
            annotationDots={annotationDots}
            onAnnotationDotsChange={handleAnnotationDotsChange}
            onEnterCleanView={handleEnterCleanView}
          />
        )}

        {/* Split pane area */}
        <div
          ref={containerRef}
          className="flex-1 min-h-0"
        >
          {/* Mobile: full-screen reader + bottom sheet for annotations */}
          <div className="lg:hidden h-full min-h-0 overflow-hidden">
            <ReaderPane readerLayout={readerLayout} translationToggles={translationToggles} readerFont={readerFont} annotationDots={annotationDots} cleanView={cleanView} settingsProps={settingsProps} />
            <MobileBottomSheet />
          </div>

          {/* Desktop: docked split-pane OR full-width reader (when undocked) */}
          {undocked ? (
            // Undocked: reader takes full width
            <div className="hidden lg:block h-full min-h-0 overflow-hidden">
              <ReaderPane readerLayout={readerLayout} translationToggles={translationToggles} readerFont={readerFont} annotationDots={annotationDots} cleanView={cleanView} settingsProps={settingsProps} />
            </div>
          ) : (
            // Docked: split pane with divider
            <div
              className="hidden lg:grid h-full min-h-0"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              <div className="min-h-0 overflow-hidden">
                {leftPane}
              </div>
              <SplitPaneDivider
                containerRef={containerRef}
                onResize={handleResize}
                onResizeEnd={handleResizeEnd}
              />
              <div className="min-h-0 overflow-hidden">
                {rightPane}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating annotation panel — rendered outside the main container */}
      {undocked && (
        <div className="hidden lg:block">
          <FloatingPanel onDock={handleDock}>
            <AnnotationSidebar hideHeader />
          </FloatingPanel>
        </div>
      )}

      {/* Audio timing editor — full-screen modal */}
      <AudioEditorModal />
    </WorkspaceKeyboardWrapper>
    </WorkspaceProvider>
    </AudioProvider>
    </EncryptionProvider>
  );
}

/**
 * WorkspaceKeyboardWrapper — lives inside WorkspaceProvider so it can
 * use useWorkspace() to handle commands, then wraps children with KeyboardManager.
 */
function WorkspaceKeyboardWrapper({
  keybindPreset,
  customKeybindings,
  toggleSwap,
  toggleReaderLayout,
  handleEnterCleanView,
  handleAnnotationDotsChange,
  annotationDots,
  handleUndock,
  handleDock,
  undocked,
  handleToggleChange,
  children,
}: {
  keybindPreset: KeybindingPreset;
  customKeybindings?: Record<string, string>;
  toggleSwap: () => void;
  toggleReaderLayout: () => void;
  handleEnterCleanView: () => void;
  handleAnnotationDotsChange: (style: AnnotationDotStyle) => void;
  annotationDots: AnnotationDotStyle;
  handleUndock: () => void;
  handleDock: () => void;
  undocked: boolean;
  handleToggleChange: (key: keyof TranslationToggles) => void;
  children: ReactNode;
}) {
  const {
    chapter,
    navigateChapter,
    selection,
    setSelection,
    startNewAnnotation,
    sidebarView,
    annotations,
  } = useWorkspace();

  const handleCommand = useCallback((commandId: string): boolean => {
    switch (commandId) {
      // Navigation
      case "nav.readBible":
        window.location.href = "/app/read";
        return true;
      case "nav.myNotes":
        window.location.href = "/app/search";
        return true;
      case "nav.community":
        window.location.href = "/app/community";
        return true;
      case "nav.settings":
        window.location.href = "/app/settings";
        return true;
      case "nav.nextChapter":
        navigateChapter(chapter + 1);
        return true;
      case "nav.prevChapter":
        if (chapter > 1) navigateChapter(chapter - 1);
        return true;

      // Reader
      case "reader.nextVerse": {
        const current = selection?.end ?? 0;
        setSelection({ start: current + 1, end: current + 1 });
        return true;
      }
      case "reader.prevVerse": {
        const current = selection?.start ?? 2;
        if (current <= 1) return true;
        setSelection({ start: current - 1, end: current - 1 });
        return true;
      }
      case "reader.clearSelection":
        setSelection(null);
        return true;
      case "reader.toggleLayout":
        toggleReaderLayout();
        return true;
      case "reader.focusMode":
        handleEnterCleanView();
        return true;
      case "reader.cycleDots": {
        const cycle: AnnotationDotStyle[] = ["blue", "subtle", "hidden"];
        const idx = cycle.indexOf(annotationDots);
        handleAnnotationDotsChange(cycle[(idx + 1) % cycle.length]);
        return true;
      }
      case "reader.swap":
        toggleSwap();
        return true;
      case "reader.undock":
        if (undocked) handleDock();
        else handleUndock();
        return true;

      // Annotations
      case "annotation.new":
        if (selection) startNewAnnotation();
        return true;

      // Translation toggles
      case "toggle.divineName":
        handleToggleChange("divineName");
        return true;
      case "toggle.baptism":
        handleToggleChange("baptism");
        return true;
      case "toggle.assembly":
        handleToggleChange("assembly");
        return true;
      case "toggle.onlyBegotten":
        handleToggleChange("onlyBegotten");
        return true;

      // System
      case "system.search":
        window.location.href = "/app/search";
        return true;
      case "system.signOut":
        window.location.href = "/auth/signout";
        return true;

      default:
        return false;
    }
  }, [
    chapter, navigateChapter, selection, setSelection, startNewAnnotation,
    toggleSwap, toggleReaderLayout, handleEnterCleanView,
    handleAnnotationDotsChange, annotationDots,
    handleUndock, handleDock, undocked, handleToggleChange,
  ]);

  return (
    <KeyboardManager
      preset={keybindPreset}
      customKeybindings={customKeybindings}
      isWorkspace={true}
      isEditing={sidebarView === "editor"}
      onCommand={handleCommand}
    >
      {children}
      <KeybindHintToast />
    </KeyboardManager>
  );
}

/**
 * MobileBottomSheet — small wrapper that reads workspace context
 * to know when to auto-expand (on verse selection).
 * Needs to be a separate component because it uses useWorkspace(),
 * which requires being inside WorkspaceProvider.
 */
function MobileBottomSheet() {
  const { selection } = useWorkspace();
  return (
    <BottomSheet expanded={selection !== null}>
      <AnnotationSidebar />
    </BottomSheet>
  );
}

/**
 * AudioEditorModal — renders AudioTimingEditor when isEditorOpen is true.
 *
 * Loads verse data independently (same pattern as ChapterReader) so the
 * timing editor has the verse text to display during marking.
 * Lives inside both AudioProvider and WorkspaceProvider for access to both contexts.
 */
function AudioEditorModal() {
  const { book, chapter, translation } = useWorkspace();
  const { isEditorOpen, closeEditor, activeTimingMap } = useAudioContext();
  const [verses, setVerses] = useState<Array<{ number: number; text: string }>>([]);

  // Load verses when the editor opens
  useEffect(() => {
    if (!isEditorOpen) return;

    // Use the same data source as ChapterReader
    const isUser = translation.startsWith("user-");
    if (isUser) {
      import("../../lib/user-translations").then(({ getUserTranslationChapter }) => {
        getUserTranslationChapter(translation, book, chapter).then((data) => {
          if (data) setVerses(data.verses);
        });
      });
    } else {
      fetch(`/bibles/${translation}/${book}/${chapter}.json`)
        .then((res) => res.json())
        .then((data) => setVerses(data.verses ?? []))
        .catch(() => setVerses([]));
    }
  }, [isEditorOpen, translation, book, chapter]);

  if (!isEditorOpen || verses.length === 0) return null;

  return (
    <AudioTimingEditor
      verses={verses}
      book={book as any}
      chapter={chapter}
      onClose={closeEditor}
      existingMap={activeTimingMap ?? undefined}
    />
  );
}
