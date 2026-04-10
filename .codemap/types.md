# Types (generated 2026-04-08)

**Total types:** 159

## scripts/convert-kjv1611.ts

### BookMapping (interface)

| Field | Type | Optional |
|-------|------|----------|
| `sourceFile` | `string` |  |
| `bookId` | `string` |  |
| `testament` | `"OT" | "DC" | "NT"` |  |

### SourceBook (interface)

| Field | Type | Optional |
|-------|------|----------|
| `book` | `string` |  |
| `chapters` | `{` |  |
| `chapter` | `number` |  |
| `verses` | `{ verse: number` |  |
| `text` | `string }[]` |  |

## scripts/convert-oeb.ts

### BookMapping (interface)

| Field | Type | Optional |
|-------|------|----------|
| `usfmId` | `string` |  |
| `filePrefix` | `string` |  |
| `bookId` | `string` |  |
| `name` | `string` |  |
| `testament` | `"OT" | "DC" | "NT"` |  |

## scripts/convert-scrollmapper.ts

### TranslationConfig (interface)

| Field | Type | Optional |
|-------|------|----------|
| `sourceFile` | `string` |  |
| `id` | `string` |  |
| `name` | `string` |  |
| `license` | `string` |  |
| `hasApocrypha` | `boolean` |  |

### SourceData (interface)

| Field | Type | Optional |
|-------|------|----------|
| `translation` | `string` |  |
| `books` | `{` |  |
| `name` | `string` |  |
| `chapters` | `{` |  |
| `chapter` | `number` |  |
| | *...and 2 more fields* | |

## scripts/convert-web.ts

### BookMapping (interface)

| Field | Type | Optional |
|-------|------|----------|
| `filePrefix` | `string` |  |
| `usfmId` | `string` |  |
| `bookId` | `string` |  |
| `name` | `string` |  |
| `testament` | `"OT" | "DC" | "NT"` |  |

## scripts/download-bible.ts

### BibleApiVerse (interface)

| Field | Type | Optional |
|-------|------|----------|
| `book_id` | `string` |  |
| `book_name` | `string` |  |
| `chapter` | `number` |  |
| `verse` | `number` |  |
| `text` | `string` |  |

### BibleApiResponse (interface)

| Field | Type | Optional |
|-------|------|----------|
| `reference` | `string` |  |
| `verses` | `BibleApiVerse[]` |  |
| `text` | `string` |  |
| `translation_id` | `string` |  |
| `translation_name` | `string` |  |
| | *...and 1 more fields* | |

### ChapterOutput (interface)

| Field | Type | Optional |
|-------|------|----------|
| `translation` | `string` |  |
| `book` | `string` |  |
| `bookName` | `string` |  |
| `chapter` | `number` |  |
| `verses` | `{ number: number` |  |
| | *...and 1 more fields* | |

### BookEntry (interface)

| Field | Type | Optional |
|-------|------|----------|
| `id` | `string` |  |
| `name` | `string` |  |
| `chapters` | `number` |  |
| `testament` | `"OT" | "NT"` |  |

### ManifestOutput (interface)

| Field | Type | Optional |
|-------|------|----------|
| `translation` | `string` |  |
| `name` | `string` |  |
| `language` | `string` |  |
| `license` | `string` |  |
| `books` | `BookEntry[]` |  |

## src/components/AnnotationPanel.tsx

### AnnotationPanelProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `userId` | `string` |  |
| `translation` | `string` |  |
| `book` | `string` |  |
| `chapter` | `number` |  |
| `verseStart` | `number` |  |
| | *...and 5 more fields* | |

## src/components/AnnotationPicker.tsx

### AnnotationPickerProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `devotionalBibleId` | `string` |  |
| `devotionalType` | `DevotionalBibleType` |  |
| `userId` | `string` |  |
| `existingEntryAnnotationIds` | `Set<string>` |  |
| `onAdd` | `(annotationIds: string[]) => void` |  |
| | *...and 1 more fields* | |

**type** `Tab`

## src/components/AnnotationSearch.tsx

### AnnotationSearchProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `auth` | `AuthState` |  |

## src/components/AppNav.tsx

### AppNavProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `auth` | `AuthState` |  |

## src/components/AudioPlayerBar.tsx

### AudioPlayerBarProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `playback` | `AudioPlaybackControls` |  |
| `audioTranslation` | `string` | ? |
| `readerTranslation` | `string` | ? |
| `onClose` | `() => void` |  |
| `audioSource` | `"mp3" | "youtube"` | ? |
| | *...and 1 more fields* | |

## src/components/AudioProvider.tsx

### AudioContextValue (interface)

| Field | Type | Optional |
|-------|------|----------|
| `isEditorOpen` | `boolean` |  |
| `openEditor` | `() => void` |  |
| `closeEditor` | `() => void` |  |

### AudioProviderProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `book` | `string` |  |
| `chapter` | `number` |  |
| `children` | `ReactNode` |  |

## src/components/AudioTimingEditor.tsx

### AudioTimingEditorProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `verses` | `Verse[]` |  |
| `book` | `BookId` |  |
| `chapter` | `number` |  |
| `onClose` | `() => void` |  |
| `onSaved` | `() => void` | ? |
| | *...and 1 more fields* | |

**type** `EditorMode`

**type** `EditorPhase`

**type** `AudioSourceType`

## src/components/AuthGuard.tsx

### AuthGuardProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `serverAuth` | `AuthState | null` |  |
| `children` | `ReactNode` |  |

## src/components/AuthProvider.tsx

### AuthProviderProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `initialAuth` | `AuthState` |  |
| `children` | `ReactNode` |  |

## src/components/BookPicker.tsx

### BookPickerProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `translation` | `string` |  |

## src/components/Cc0Intercession.tsx

### Cc0IntercessionProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `onAccept` | `() => void` |  |
| `onCancel` | `() => void` |  |

### FigureCard (interface)

| Field | Type | Optional |
|-------|------|----------|
| `name` | `string` |  |
| `years` | `string` |  |
| `role` | `string` |  |
| `story` | `string` |  |

## src/components/ChapterPicker.tsx

### ChapterPickerProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `translation` | `string` |  |
| `book` | `string` |  |

## src/components/ChapterReader.tsx

### ChapterReaderProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `translation` | `string` |  |
| `book` | `string` |  |
| `chapter` | `number` |  |
| `selection` | `VerseSelection | null` | ? |
| `onVerseSelect` | `(selection: VerseSelection | null) => void` | ? |
| | *...and 9 more fields* | |

## src/components/CommandPalette.tsx

### CommandPaletteProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `isWorkspace` | `boolean` |  |
| `isEditing` | `boolean` |  |
| `preset` | `KeybindingPreset` |  |
| `onExecute` | `(commandId: string) => void` |  |
| `onClose` | `() => void` |  |

## src/components/CommunityTabs.tsx

### CommunityTabsProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `userId` | `string` |  |
| `defaultTab` | `"notes" | "devotionals"` | ? |

**type** `Tab`

## src/components/CrossReferencePicker.tsx

### RemovedRefRecord (interface)

| Field | Type | Optional |
|-------|------|----------|
| `ref` | `CrossRefEntry` |  |
| `removedAt` | `number` |  |

### CrossRefEntry (interface)

| Field | Type | Optional |
|-------|------|----------|
| `book` | `BookId` |  |
| `chapter` | `number` |  |
| `verseStart` | `number` |  |
| `verseEnd` | `number` |  |

### CrossReferencePickerProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `references` | `CrossRefEntry[]` |  |
| `onChange` | `(references: CrossRefEntry[]) => void` |  |
| `anchorBook` | `BookId` | ? |
| `anchorChapter` | `number` | ? |
| `anchorVerseStart` | `number` | ? |
| | *...and 1 more fields* | |

## src/components/DevotionalDetail.tsx

### DevotionalDetailProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `auth` | `AuthState` |  |
| `devotionalId` | `string` |  |

## src/components/DevotionalForm.tsx

### DevotionalFormProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `auth` | `AuthState` |  |
| `devotionalId` | `string` | ? |

## src/components/DevotionalList.tsx

### DevotionalListProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `auth` | `AuthState` |  |

## src/components/EncryptionProvider.tsx

### EncryptionContextValue (interface)

| Field | Type | Optional |
|-------|------|----------|
| `hasEncryption` | `boolean` |  |
| `isLoaded` | `boolean` |  |
| `isUnlocked` | `boolean` |  |
| `cryptoKey` | `CryptoKey | null` |  |
| `unlock` | `(passphrase: string) => Promise<boolean>` |  |
| | *...and 3 more fields* | |

### EncryptionProviderProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `userId` | `string | null` |  |
| `userEmail` | `string | null` | ? |
| `children` | `ReactNode` |  |

**type** `EncryptionRow`

## src/components/EncryptionSetup.tsx

### EncryptionSetupProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `onComplete` | `() => void` |  |
| `onCancel` | `() => void` |  |

### UnlockPromptProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `onUnlocked` | `() => void` |  |
| `onCancel` | `() => void` |  |

## src/components/ErrorBoundary.tsx

### ErrorBoundaryProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `children` | `ReactNode` |  |
| `message` | `string` | ? |

### ErrorBoundaryState (interface)

| Field | Type | Optional |
|-------|------|----------|
| `hasError` | `boolean` |  |

## src/components/ExportButton.tsx

### ExportButtonProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `annotation` | `Annotation` | ? |
| `userId` | `string` | ? |
| `variant` | `"primary" | "secondary"` | ? |
| `selectedAnnotations` | `Annotation[]` | ? |

## src/components/KeybindingEditor.tsx

### KeybindingEditorProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `preset` | `KeybindingPreset` |  |
| `customOverrides` | `Record<string, string>` |  |
| `onOverrideChange` | `(commandId: string, key: string) => void` |  |
| `onResetAll` | `() => void` |  |

### KeybindingRowProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `command` | `CommandDef` |  |
| `currentKey` | `string` |  |
| `presetKey` | `string` |  |
| `isModified` | `boolean` |  |
| `conflictCommands` | `string[]` | ? |
| | *...and 2 more fields* | |

### KeyRecorderProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `onCapture` | `(key: string | null) => void` |  |
| `buttonRef` | `React.RefObject<HTMLButtonElement | null>` |  |

## src/components/KeyboardManager.tsx

### KeyboardContextValue (interface)

| Field | Type | Optional |
|-------|------|----------|
| `preset` | `KeybindingPreset` |  |
| `vimMode` | `VimMode` |  |
| `paletteOpen` | `boolean` |  |
| `openPalette` | `() => void` |  |

### KeyboardManagerProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `preset` | `KeybindingPreset` |  |
| `customKeybindings` | `Record<string, string>` | ? |
| `isWorkspace` | `boolean` |  |
| `isEditing` | `boolean` |  |
| `onCommand` | `(commandId: string) => boolean` |  |
| | *...and 1 more fields* | |

**type** `VimMode`

## src/components/MarkdownEditor.tsx

### ToolbarSlotHelpers (interface)

| Field | Type | Optional |
|-------|------|----------|
| `insertText` | `(text: string) => void` |  |

### MarkdownEditorProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `initialContent` | `string` | ? |
| `onChange` | `(content: string) => void` |  |
| `placeholder` | `string` | ? |
| `extraToolbarSlot` | `(helpers: ToolbarSlotHelpers) => ReactNode` | ? |

### ToolbarAction (interface)

| Field | Type | Optional |
|-------|------|----------|
| `label` | `string` |  |
| `ariaLabel` | `string` |  |
| `icon` | `string` |  |
| `prefix` | `string` |  |
| `suffix` | `string` |  |
| | *...and 2 more fields* | |

## src/components/ModerationQueue.tsx

### ModerationQueueProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `auth` | `AuthState` |  |

## src/components/OfflineDownloads.tsx

### TranslationStatus (interface)

| Field | Type | Optional |
|-------|------|----------|
| `cachedBooks` | `number` |  |
| `totalBooks` | `number` |  |
| `downloading` | `boolean` |  |
| `progress` | `number` |  |
| `checking` | `boolean` |  |

## src/components/ProfileEditor.tsx

### ProfileEditorProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `userId` | `string` |  |
| `defaultDisplayName` | `string` |  |

## src/components/PublicProfilePage.tsx

### PublicProfilePageProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `slug` | `string` |  |

## src/components/PublishedDevotionalDetail.tsx

### PublishedDevotionalDetailProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `devotionalId` | `string` |  |
| `userId` | `string | null` |  |

## src/components/PublishedDevotionalsFeed.tsx

### PublishedDevotionalsFeedProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `userId` | `string | null` |  |

## src/components/PublishedNotes.tsx

### PublishedNotesProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `auth` | `AuthState` |  |

## src/components/RecycleBin.tsx

### RecycleBinProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `auth` | `AuthState` |  |

## src/components/SettingsPage.tsx

### SettingsPageProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `auth` | `AuthState` |  |
| `providers` | `string[]` |  |

## src/components/SignInForm.tsx

### SignInFormProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `returnUrl` | `string` |  |
| `showGuestOption` | `boolean` | ? |

## src/components/Skeleton.tsx

### SkeletonProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `lines` | `number` | ? |
| `className` | `string` | ? |

## src/components/TranslationRestore.tsx

### TranslationRestoreProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `userId` | `string` |  |
| `onRestored` | `() => void` |  |

## src/components/TranslationUpload.tsx

### TranslationUploadProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `onSaved` | `() => void` |  |
| `userId` | `string | null` | ? |
| `cryptoKey` | `CryptoKey | null` | ? |
| `canBackup` | `boolean` | ? |

**type** `UploadStep`

**type** `SelectionMode`

## src/components/UserTranslationManager.tsx

### UserTranslationManagerProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `refreshKey` | `number` |  |
| `userId` | `string | null` | ? |
| `cryptoKey` | `CryptoKey | null` | ? |
| `canBackup` | `boolean` | ? |

## src/components/VerseCitePicker.tsx

### CitableVerse (interface)

| Field | Type | Optional |
|-------|------|----------|
| `book` | `BookId` |  |
| `chapter` | `number` |  |
| `number` | `number` |  |
| `text` | `string` |  |
| `label` | `string` |  |

### VerseCitePickerProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `anchorBook` | `BookId` |  |
| `anchorChapter` | `number` |  |
| `anchorVerseStart` | `number` |  |
| `anchorVerseEnd` | `number` |  |
| `crossReferences` | `CrossRefEntry[]` |  |
| | *...and 2 more fields* | |

## src/components/YouTubePlayer.tsx

### YouTubePlayerProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `mode` | `"expanded" | "compact"` | ? |
| `containerId` | `string` |  |
| `className` | `string` | ? |

## src/components/workspace/AnnotationSidebar.tsx

### AnnotationSidebarProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `hideHeader` | `boolean` | ? |

## src/components/workspace/BottomSheet.tsx

### BottomSheetProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `children` | `ReactNode` |  |
| `expanded` | `boolean` | ? |

**type** `SnapPoint`

## src/components/workspace/ChapterAnnotationList.tsx

### ChapterAnnotationListProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `hideHeader` | `boolean` | ? |

## src/components/workspace/FloatingPanel.tsx

### FloatingPanelProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `children` | `ReactNode` |  |
| `onDock` | `() => void` |  |

## src/components/workspace/FontPicker.tsx

### FontPickerProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `readerFont` | `ReaderFont` |  |
| `onFontChange` | `(font: ReaderFont) => void` |  |

## src/components/workspace/ReaderPane.tsx

### ReaderPaneProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `readerLayout` | `ReaderLayout` | ? |
| `translationToggles` | `TranslationToggles` | ? |
| `readerFont` | `ReaderFont` | ? |
| `annotationDots` | `AnnotationDotStyle` | ? |
| `cleanView` | `boolean` | ? |
| | *...and 1 more fields* | |

## src/components/workspace/ReaderSettingsPopover.tsx

### ReaderSettingsProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `readerLayout` | `ReaderLayout` |  |
| `onToggleReaderLayout` | `() => void` |  |
| `readerFont` | `ReaderFont` |  |
| `onFontChange` | `(font: ReaderFont) => void` |  |
| `annotationDots` | `AnnotationDotStyle` |  |
| | *...and 4 more fields* | |

## src/components/workspace/SplitPaneDivider.tsx

### SplitPaneDividerProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `onResize` | `(ratio: number) => void` |  |
| `onResizeEnd` | `(ratio: number) => void` |  |
| `containerRef` | `React.RefObject<HTMLDivElement | null>` |  |

## src/components/workspace/TranslationFirstOpenPopup.tsx

### TranslationFirstOpenPopupProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `triggerOpen` | `boolean` |  |

## src/components/workspace/TranslationPicker.tsx

### TranslationPickerProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `compact` | `boolean` | ? |

## src/components/workspace/TranslationToggleMenu.tsx

### TranslationToggleMenuProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `toggles` | `TranslationToggles` |  |
| `onToggleChange` | `(key: keyof TranslationToggles) => void` |  |

## src/components/workspace/Workspace.tsx

### WorkspaceProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `translation` | `string` |  |
| `book` | `string` |  |
| `chapter` | `number` |  |
| `userId` | `string | null` |  |
| `userEmail` | `string | null` |  |

## src/components/workspace/WorkspaceProvider.tsx

### WorkspaceProviderProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `translation` | `string` |  |
| `book` | `string` |  |
| `chapter` | `number` |  |
| `userId` | `string | null` |  |
| `children` | `ReactNode` |  |

## src/components/workspace/WorkspaceToolbar.tsx

### WorkspaceToolbarProps (interface)

| Field | Type | Optional |
|-------|------|----------|
| `swapped` | `boolean` |  |
| `onToggleSwap` | `() => void` |  |
| `undocked` | `boolean` |  |
| `onUndock` | `() => void` |  |
| `onDock` | `() => void` |  |
| | *...and 9 more fields* | |

## src/hooks/useAudioPlayback.ts

### AudioPlaybackControls (interface)

| Field | Type | Optional |
|-------|------|----------|
| `isPlaying` | `boolean` |  |
| `currentTime` | `number` |  |
| `duration` | `number` |  |
| `playbackRate` | `number` |  |
| `volume` | `number` |  |
| | *...and 7 more fields* | |

## src/hooks/useAudioSync.ts

### AudioSyncState (interface)

| Field | Type | Optional |
|-------|------|----------|
| `activeVerse` | `number | null` |  |
| `playback` | `AudioPlaybackControls` |  |
| `availableTimingMaps` | `AudioTimingMap[]` |  |
| `activeTimingMap` | `AudioTimingMap | null` |  |
| `selectTimingMap` | `(id: string) => void` |  |
| | *...and 5 more fields* | |

## src/hooks/useYouTubePlayer.ts

### YTPlayerOptions (interface)

| Field | Type | Optional |
|-------|------|----------|
| `videoId` | `string` |  |
| `playerVars` | `Record<string, string | number>` | ? |
| `events` | `{` | ? |
| `onReady` | `(event: { target: YTPlayerInstance }) => void` | ? |
| `onStateChange` | `(event: { data: number }) => void` | ? |
| | *...and 1 more fields* | |

### YTPlayerInstance (interface)

*(empty)*

## src/lib/annotations.ts

**type** `DbClient`

## src/lib/audio-sync-cloud.ts

**type** `DbClient`

## src/lib/commands.ts

### CommandDef (interface)

| Field | Type | Optional |
|-------|------|----------|
| `id` | `string` |  |
| `label` | `string` |  |
| `description` | `string` |  |
| `category` | `CommandCategory` |  |
| `workspaceOnly` | `boolean` | ? |
| | *...and 1 more fields* | |

### Keybinding (interface)

| Field | Type | Optional |
|-------|------|----------|
| `commandId` | `string` |  |
| `key` | `string` |  |
| `vimNormalOnly` | `boolean` | ? |

**type** `CommandCategory`

**type** `KeybindingPreset`

## src/lib/denomination-presets.ts

### DenominationPreset (interface)

| Field | Type | Optional |
|-------|------|----------|
| `id` | `string` |  |
| `name` | `string` |  |
| `parentId` | `string | null` |  |
| `description` | `string` |  |
| `toggles` | `Partial<TranslationToggles>` |  |

## src/lib/devotional-bibles.ts

**type** `DbClient`

## src/lib/export.ts

### ExportContext (interface)

| Field | Type | Optional |
|-------|------|----------|
| `annotations` | `Annotation[]` |  |
| `translationId` | `string` |  |
| `translationName` | `string` |  |
| `toggles` | `TranslationToggles` |  |

## src/lib/health.ts

### HealthStatus (interface)

| Field | Type | Optional |
|-------|------|----------|
| `status` | `"ok" | "error"` |  |
| `timestamp` | `number` |  |

## src/lib/offline-store.ts

### OfflineCrossReference (interface)

| Field | Type | Optional |
|-------|------|----------|
| `book` | `string` |  |
| `chapter` | `number` |  |
| `verseStart` | `number` |  |
| `verseEnd` | `number` |  |

### OfflineAnnotation (interface)

| Field | Type | Optional |
|-------|------|----------|
| `id` | `string` |  |
| `userId` | `string` |  |
| `translation` | `string` |  |
| `book` | `string` |  |
| `chapter` | `number` |  |
| | *...and 12 more fields* | |

### SyncQueueItem (interface)

| Field | Type | Optional |
|-------|------|----------|
| `id` | `string` |  |
| `operation` | `"create" | "update" | "delete"` |  |
| `annotationId` | `string` |  |
| `data` | `Omit<OfflineAnnotation, "syncStatus">` | ? |
| `queuedAt` | `string` |  |

## src/lib/preference-sync.ts

### UserPreferences (interface)

| Field | Type | Optional |
|-------|------|----------|
| `readerFont` | `ReaderFont` | ? |
| `annotationDots` | `AnnotationDotStyle` | ? |
| `readerLayout` | `ReaderLayout` | ? |
| `divineName` | `boolean` | ? |
| `baptism` | `boolean` | ? |
| | *...and 8 more fields* | |

## src/lib/reader-fonts.ts

### FontOption (interface)

| Field | Type | Optional |
|-------|------|----------|
| `key` | `ReaderFont` |  |
| `label` | `string` |  |
| `family` | `string` |  |
| `category` | `"sans" | "serif"` |  |

## src/lib/sync-engine.ts

### SyncResult (interface)

| Field | Type | Optional |
|-------|------|----------|
| `processed` | `number` |  |
| `succeeded` | `number` |  |
| `failed` | `number` |  |
| `errors` | `string[]` |  |

## src/lib/theme.ts

**type** `ColorMode`

**type** `ColorTheme`

## src/lib/translation-backup.ts

### TranslationBackup (interface)

| Field | Type | Optional |
|-------|------|----------|
| `id` | `string` |  |
| `translationId` | `string` |  |
| `name` | `string` |  |
| `abbreviation` | `string` |  |
| `language` | `string` |  |
| | *...and 6 more fields* | |

**type** `DbClient`

## src/lib/translation-info.ts

### TranslationInfo (interface)

| Field | Type | Optional |
|-------|------|----------|
| `id` | `string` |  |
| `name` | `string` |  |
| `yearPublished` | `number` |  |
| `yearEdition` | `number` | ? |
| `tradition` | `"Catholic" | "Protestant" | "Ecumenical"` |  |
| | *...and 8 more fields* | |

## src/lib/translation-toggles.ts

### TranslationToggles (interface)

| Field | Type | Optional |
|-------|------|----------|
| `divineName` | `boolean` |  |
| `baptism` | `boolean` |  |
| `assembly` | `boolean` |  |
| `onlyBegotten` | `boolean` |  |

## src/lib/user-profiles.ts

**type** `DbClient`

## src/lib/verse-ref.ts

**type** `ParseResult`

## src/lib/verse-selection.ts

### VerseSelection (interface)

| Field | Type | Optional |
|-------|------|----------|
| `start` | `number` |  |
| `end` | `number` |  |

## src/lib/workspace-prefs.ts

### WorkspacePrefs (interface)

| Field | Type | Optional |
|-------|------|----------|
| `splitRatio` | `number` |  |
| `swapped` | `boolean` |  |
| `undocked` | `boolean` |  |
| `readerLayout` | `ReaderLayout` |  |
| `readerFont` | `ReaderFont` |  |
| | *...and 5 more fields* | |

**type** `ReaderLayout`

**type** `AnnotationDotStyle`

**type** `ReaderFont`

## src/types/annotation.ts

### VerseAnchor (interface)

| Field | Type | Optional |
|-------|------|----------|
| `book` | `BookId` |  |
| `chapter` | `number` |  |
| `verseStart` | `number` |  |
| `verseEnd` | `number` |  |

### CrossReference (interface)

| Field | Type | Optional |
|-------|------|----------|
| `id` | `string` |  |
| `annotationId` | `string` |  |
| `book` | `BookId` |  |
| `chapter` | `number` |  |
| `verseStart` | `number` |  |
| | *...and 1 more fields* | |

### Annotation (interface)

| Field | Type | Optional |
|-------|------|----------|
| `id` | `string` |  |
| `userId` | `string` |  |
| `translation` | `string` |  |
| `anchor` | `VerseAnchor` |  |
| `contentMd` | `string` |  |
| | *...and 15 more fields* | |

### AnnotationFormData (interface)

| Field | Type | Optional |
|-------|------|----------|
| `translation` | `string` |  |
| `anchor` | `VerseAnchor` |  |
| `contentMd` | `string` |  |
| `crossReferences` | `Omit<CrossReference, "id" | "annotationId">[]` |  |
| `verseText` | `string` | ? |
| | *...and 2 more fields* | |

## src/types/audio-sync.ts

### VerseTiming (interface)

| Field | Type | Optional |
|-------|------|----------|
| `verseNumber` | `number` |  |
| `startTime` | `number` |  |
| `endTime` | `number` |  |

### AudioTimingMap (interface)

| Field | Type | Optional |
|-------|------|----------|
| `id` | `string` |  |
| `audioSource` | `"mp3" | "youtube"` |  |
| `sourceId` | `string` |  |
| `audioTranslation` | `string` |  |
| `book` | `BookId` |  |
| | *...and 3 more fields* | |

### AudioPlaybackState (interface)

| Field | Type | Optional |
|-------|------|----------|
| `isPlaying` | `boolean` |  |
| `currentTime` | `number` |  |
| `duration` | `number` |  |
| `playbackRate` | `number` |  |
| `volume` | `number` |  |
| | *...and 1 more fields* | |

## src/types/auth.ts

### AuthState (interface)

| Field | Type | Optional |
|-------|------|----------|
| `isAuthenticated` | `boolean` |  |
| `displayName` | `string | null` |  |
| `email` | `string | null` |  |
| `avatarUrl` | `string | null` |  |
| `userId` | `string | null` |  |

**type** `AuthProvider`

## src/types/bible.ts

### VerseRef (interface)

| Field | Type | Optional |
|-------|------|----------|
| `translation` | `string` |  |
| `book` | `BookId` |  |
| `chapter` | `number` |  |
| `verse` | `number` |  |

### Verse (interface)

| Field | Type | Optional |
|-------|------|----------|
| `number` | `number` |  |
| `text` | `string` |  |

### ChapterData (interface)

| Field | Type | Optional |
|-------|------|----------|
| `translation` | `string` |  |
| `book` | `BookId` |  |
| `bookName` | `string` |  |
| `chapter` | `number` |  |
| `verses` | `Verse[]` |  |

### BookInfo (interface)

| Field | Type | Optional |
|-------|------|----------|
| `id` | `BookId` |  |
| `name` | `string` |  |
| `chapters` | `number` |  |
| `testament` | `Testament` |  |

### TranslationManifest (interface)

| Field | Type | Optional |
|-------|------|----------|
| `translation` | `string` |  |
| `name` | `string` |  |
| `language` | `string` |  |
| `license` | `string` |  |
| `books` | `BookInfo[]` |  |

**type** `BookId`

**type** `Testament`

## src/types/database.ts

### Database (interface)

| Field | Type | Optional |
|-------|------|----------|
| `public` | `{` |  |
| `Tables` | `{` |  |
| `annotations` | `{` |  |
| `Row` | `{` |  |
| `id` | `string` |  |
| | *...and 455 more fields* | |

## src/types/devotional-bible.ts

### DevotionalBible (interface)

| Field | Type | Optional |
|-------|------|----------|
| `id` | `string` |  |
| `userId` | `string` |  |
| `title` | `string` |  |
| `description` | `string` |  |
| `translation` | `string` |  |
| | *...and 11 more fields* | |

### DevotionalBibleEntry (interface)

| Field | Type | Optional |
|-------|------|----------|
| `id` | `string` |  |
| `devotionalBibleId` | `string` |  |
| `annotationId` | `string` |  |
| `sortOrder` | `number` |  |
| `addedAt` | `string` |  |

### DevotionalBibleFormData (interface)

| Field | Type | Optional |
|-------|------|----------|
| `title` | `string` |  |
| `description` | `string` |  |
| `translation` | `string` |  |
| `type` | `DevotionalBibleType` |  |

### DevotionalBibleWithEntries (interface)

| Field | Type | Optional |
|-------|------|----------|
| `entries` | `DevotionalBibleEntry[]` |  |

**type** `DevotionalBibleType`

**type** `DevotionalBiblePublishStatus`

## src/types/moderation.ts

### ScreeningFlag (interface)

| Field | Type | Optional |
|-------|------|----------|
| `type` | `"profanity" | "theology" | "spam" | "other"` |  |
| `severity` | `"low" | "medium" | "high"` |  |
| `message` | `string` |  |

### ScreeningResult (interface)

| Field | Type | Optional |
|-------|------|----------|
| `passed` | `boolean` |  |
| `flags` | `ScreeningFlag[]` |  |
| `screenedAt` | `string` |  |

## src/types/user-profile.ts

### UserProfile (interface)

| Field | Type | Optional |
|-------|------|----------|
| `id` | `string` |  |
| `userId` | `string` |  |
| `slug` | `string` |  |
| `displayName` | `string` |  |
| `bio` | `string` |  |
| | *...and 3 more fields* | |

### UserProfileFormData (interface)

| Field | Type | Optional |
|-------|------|----------|
| `slug` | `string` |  |
| `displayName` | `string` |  |
| `bio` | `string` |  |

## src/types/user-translation.ts

### UserTranslationManifest (interface)

| Field | Type | Optional |
|-------|------|----------|
| `translation` | `string` |  |
| `name` | `string` |  |
| `abbreviation` | `string` |  |
| `language` | `string` |  |
| `license` | `string` |  |
| | *...and 4 more fields* | |

### ParsedChapter (interface)

| Field | Type | Optional |
|-------|------|----------|
| `chapter` | `number` |  |
| `verses` | `Verse[]` |  |

### ParsedBook (interface)

| Field | Type | Optional |
|-------|------|----------|
| `bookId` | `BookId` |  |
| `originalName` | `string` |  |
| `chapters` | `ParsedChapter[]` |  |

### ParseResult (interface)

| Field | Type | Optional |
|-------|------|----------|
| `books` | `ParsedBook[]` |  |
| `warnings` | `string[]` |  |

### StoredUserChapter (interface)

| Field | Type | Optional |
|-------|------|----------|
| `translation` | `string` |  |
| `book` | `string` |  |
| `chapter` | `number` |  |
| `bookName` | `string` |  |
| `verses` | `Verse[]` |  |

## src/types/workspace.ts

### WorkspaceState (interface)

| Field | Type | Optional |
|-------|------|----------|
| `translation` | `string` |  |
| `book` | `string` |  |
| `chapter` | `number` |  |
| `selection` | `VerseSelection | null` |  |
| `annotations` | `Annotation[]` |  |
| | *...and 4 more fields* | |

### WorkspaceActions (interface)

| Field | Type | Optional |
|-------|------|----------|
| `navigateChapter` | `(chapter: number) => void` |  |
| `switchTranslation` | `(translationId: string) => void` |  |
| `setSelection` | `(selection: VerseSelection | null) => void` |  |
| `startNewAnnotation` | `() => void` |  |
| `editAnnotation` | `(annotation: Annotation) => void` |  |
| | *...and 3 more fields* | |

### WorkspaceContextValue (interface)

*(empty)*

**type** `SidebarView`

<!-- Generated by claude-code-map at 2026-04-08T16:10:09.302Z -->