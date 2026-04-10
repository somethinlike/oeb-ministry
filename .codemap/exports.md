# Exports (generated 2026-04-08)

**Total exports:** 350

## src/components/AnnotationPanel.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `AnnotationPanel` | function | `AnnotationPanel({
  userId,
  translation,
  book,
  chapter,
  verseStart,
  verseEnd,
  ex...` |

## src/components/AnnotationPicker.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `AnnotationPicker` | function | `AnnotationPicker({
  devotionalType,
  userId,
  existingEntryAnnotationIds,
  onAdd,
  onClo...` |

## src/components/AnnotationSearch.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `AnnotationSearch` | function | `AnnotationSearch({ auth }: AnnotationSearchProps)` |

## src/components/AppNav.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `AppNav` | function | `AppNav({ auth: initialAuth }: AppNavProps)` |

## src/components/AudioPlayerBar.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `AudioPlayerBar` | function | `AudioPlayerBar({
  playback,
  audioTranslation,
  readerTranslation,
  onClose,
  audioSou...` |

## src/components/AudioProvider.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `AudioProvider` | function | `AudioProvider({ book, chapter, children }: AudioProviderProps)` |
| `useAudioContext` | function | `useAudioContext()` |

## src/components/AudioTimingEditor.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `AudioTimingEditor` | function | `AudioTimingEditor({
  verses,
  book,
  chapter,
  onClose,
  onSaved,
  existingMap,
}: Audio...` |

## src/components/AuthGuard.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `AuthGuard` | function | `AuthGuard({ serverAuth, children }: AuthGuardProps)` |

## src/components/AuthProvider.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `AuthProvider` | function | `AuthProvider({ initialAuth, children }: AuthProviderProps)` |
| `useAuth` | function | `useAuth()` |

## src/components/BookPicker.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `BookPicker` | function | `BookPicker({ translation }: BookPickerProps)` |

## src/components/Cc0Intercession.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `Cc0Intercession` | function | `Cc0Intercession({ onAccept, onCancel }: Cc0IntercessionProps)` |
| `Cc0Reminder` | function | `Cc0Reminder()` |

## src/components/ChapterPicker.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `ChapterPicker` | function | `ChapterPicker({ translation, book }: ChapterPickerProps)` |

## src/components/ChapterReader.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `ChapterReader` | function | `ChapterReader({
  translation,
  book,
  chapter,
  selection: externalSelection,
  onVers...` |

## src/components/CommandPalette.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `CommandPalette` | function | `CommandPalette({
  isWorkspace,
  isEditing,
  preset,
  onExecute,
  onClose,
}: CommandPa...` |

## src/components/CommunityTabs.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `CommunityTabs` | function | `CommunityTabs({ userId, defaultTab = "notes" }: CommunityTabsProps)` |

## src/components/ConnectionStatus.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `ConnectionStatus` | function | `ConnectionStatus()` |

## src/components/CrossReferencePicker.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `CrossReferencePicker` | function | `CrossReferencePicker({
  references,
  onChange,
  anchorBook,
  anchorChapter,
  anchorVerseStar...` |
| `CrossRefEntry` | interface | `interface CrossRefEntry` |

## src/components/DevotionalDetail.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `DevotionalDetail` | function | `DevotionalDetail({ auth, devotionalId }: DevotionalDetailProps)` |

## src/components/DevotionalForm.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `DevotionalForm` | function | `DevotionalForm({ auth, devotionalId }: DevotionalFormProps)` |

## src/components/DevotionalList.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `DevotionalList` | function | `DevotionalList({ auth }: DevotionalListProps)` |

## src/components/EncryptionProvider.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `EncryptionProvider` | function | `EncryptionProvider({ userId, userEmail = null, children }: EncryptionProviderProps)` |
| `useEncryption` | function | `useEncryption()` |
| `EncryptionContextValue` | interface | `interface EncryptionContextValue` |

## src/components/EncryptionSetup.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `EncryptionSetup` | function | `EncryptionSetup({ onComplete, onCancel }: EncryptionSetupProps)` |
| `UnlockPrompt` | function | `UnlockPrompt({ onUnlocked, onCancel }: UnlockPromptProps)` |

## src/components/ErrorBoundary.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `ErrorBoundary` | class | `class ErrorBoundary` |

## src/components/ExportButton.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `ExportButton` | function | `ExportButton({
  annotation,
  userId,
  variant = "secondary",
  selectedAnnotations,
}:...` |

## src/components/KeybindingEditor.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `KeybindingEditor` | function | `KeybindingEditor({
  preset,
  customOverrides,
  onOverrideChange,
  onResetAll,
}: Keybindi...` |

## src/components/KeyboardManager.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `KeybindHintToast` | function | `KeybindHintToast()` |
| `KeyboardManager` | function | `KeyboardManager({
  preset,
  customKeybindings,
  isWorkspace,
  isEditing,
  onCommand,
  ...` |
| `useKeyboard` | function | `useKeyboard()` |
| `VimMode` | type | `type VimMode` |

## src/components/MarkdownEditor.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `MarkdownEditor` | function | `MarkdownEditor({
  initialContent = "",
  onChange,
  placeholder = "Write your thoughts he...` |
| `ToolbarSlotHelpers` | interface | `interface ToolbarSlotHelpers` |

## src/components/ModerationQueue.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `ModerationQueue` | function | `ModerationQueue({ auth }: ModerationQueueProps)` |

## src/components/OfflineDownloads.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `OfflineDownloads` | function | `OfflineDownloads()` |

## src/components/ProfileEditor.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `ProfileEditor` | function | `ProfileEditor({ userId, defaultDisplayName }: ProfileEditorProps)` |

## src/components/PublicFeed.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `PublicFeed` | function | `PublicFeed()` |

## src/components/PublicProfilePage.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `PublicProfilePage` | function | `PublicProfilePage({ slug }: PublicProfilePageProps)` |

## src/components/PublishedDevotionalDetail.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `PublishedDevotionalDetail` | function | `PublishedDevotionalDetail({ devotionalId, userId }: PublishedDevotionalDetailProps)` |

## src/components/PublishedDevotionalsFeed.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `PublishedDevotionalsFeed` | function | `PublishedDevotionalsFeed({ userId }: PublishedDevotionalsFeedProps)` |

## src/components/PublishedNotes.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `PublishedNotes` | function | `PublishedNotes({ auth }: PublishedNotesProps)` |

## src/components/RecycleBin.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `RecycleBin` | function | `RecycleBin({ auth }: RecycleBinProps)` |

## src/components/SettingsPage.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `SettingsPage` | function | `SettingsPage({ auth, providers }: SettingsPageProps)` |

## src/components/SignInForm.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `SignInForm` | function | `SignInForm({ returnUrl, showGuestOption = true }: SignInFormProps)` |

## src/components/Skeleton.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `Skeleton` | function | `Skeleton({ lines = 3, className = "" }: SkeletonProps)` |
| `SkeletonCard` | function | `SkeletonCard()` |

## src/components/TranslationRestore.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `TranslationRestore` | function | `TranslationRestore({ userId, onRestored }: TranslationRestoreProps)` |

## src/components/TranslationUpload.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `TranslationUpload` | function | `TranslationUpload({
  onSaved, userId, cryptoKey, canBackup,
}: TranslationUploadProps)` |

## src/components/UpdatePrompt.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `UpdatePrompt` | function | `UpdatePrompt()` |

## src/components/UserTranslationGrid.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `UserTranslationGrid` | function | `UserTranslationGrid()` |

## src/components/UserTranslationManager.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `UserTranslationManager` | function | `UserTranslationManager({ refreshKey, userId, cryptoKey, canBackup }: UserTranslationManagerProps)` |

## src/components/VerseCitePicker.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `buildCitation` | function | `buildCitation(
  label: string,
  fullText: string,
  trimFromStart: number,
  trimFromEnd...` |
| `VerseCitePicker` | function | `VerseCitePicker({
  anchorBook,
  anchorChapter,
  anchorVerseStart,
  anchorVerseEnd,
  cro...` |

## src/components/YouTubePlayer.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `useYouTubeContainerId` | function | `useYouTubeContainerId()` |
| `YouTubePlayer` | function | `YouTubePlayer({
  mode = "expanded",
  containerId,
  className = "",
}: YouTubePlayerProps)` |

## src/components/workspace/AnnotationSidebar.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `AnnotationSidebar` | function | `AnnotationSidebar({ hideHeader = false }: AnnotationSidebarProps)` |

## src/components/workspace/BottomSheet.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `BottomSheet` | function | `BottomSheet({ children, expanded = false }: BottomSheetProps)` |

## src/components/workspace/ChapterAnnotationList.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `ChapterAnnotationList` | function | `ChapterAnnotationList({ hideHeader = false }: ChapterAnnotationListProps)` |

## src/components/workspace/FloatingPanel.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `FloatingPanel` | function | `FloatingPanel({ children, onDock }: FloatingPanelProps)` |

## src/components/workspace/FontPicker.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `FontPicker` | function | `FontPicker({ readerFont, onFontChange }: FontPickerProps)` |

## src/components/workspace/ReaderPane.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `ReaderPane` | function | `ReaderPane({ readerLayout = "centered", translationToggles, readerFont, annotationDots,...` |

## src/components/workspace/ReaderSettingsPopover.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `ReaderSettingsPopover` | function | `ReaderSettingsPopover(props: ReaderSettingsProps)` |
| `ReaderSettingsProps` | interface | `interface ReaderSettingsProps` |

## src/components/workspace/SplitPaneDivider.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `SplitPaneDivider` | function | `SplitPaneDivider({
  onResize,
  onResizeEnd,
  containerRef,
}: SplitPaneDividerProps)` |

## src/components/workspace/TranslationFirstOpenPopup.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `TranslationFirstOpenPopup` | function | `TranslationFirstOpenPopup({
  triggerOpen,
}: TranslationFirstOpenPopupProps)` |

## src/components/workspace/TranslationInfoIcon.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `TranslationInfoIcon` | function | `TranslationInfoIcon()` |

## src/components/workspace/TranslationPicker.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `TranslationPicker` | function | `TranslationPicker({ compact = false }: TranslationPickerProps)` |

## src/components/workspace/TranslationToggleMenu.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `TranslationToggleMenu` | function | `TranslationToggleMenu({
  toggles,
  onToggleChange,
}: TranslationToggleMenuProps)` |

## src/components/workspace/Workspace.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `Workspace` | function | `Workspace({
  translation,
  book,
  chapter,
  userId,
  userEmail,
}: WorkspaceProps)` |

## src/components/workspace/WorkspaceProvider.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `useWorkspace` | function | `useWorkspace()` |
| `WorkspaceProvider` | function | `WorkspaceProvider({
  translation: initialTranslation,
  book: initialBook,
  chapter: initial...` |

## src/components/workspace/WorkspaceToolbar.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `WorkspaceToolbar` | function | `WorkspaceToolbar({
  swapped,
  onToggleSwap,
  undocked,
  onUndock,
  onDock,
  readerLayou...` |

## src/components/workspace/__test-helpers.tsx

| Export | Kind | Signature |
|--------|------|-----------|
| `defaultMockContext` | function | `defaultMockContext(
  overrides: Partial<WorkspaceContextValue> = {},
)` |
| `makeAnnotation` | function | `makeAnnotation(
  overrides: Partial<Annotation> = {},
)` |

## src/hooks/useAudioPlayback.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `useAudioPlayback` | function | `useAudioPlayback(src: string | null | undefined)` |
| `AudioPlaybackControls` | interface | `interface AudioPlaybackControls` |

## src/hooks/useAudioSync.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `useAudioSync` | function | `useAudioSync(book: string, chapter: number)` |
| `AudioSyncState` | interface | `interface AudioSyncState` |

## src/hooks/useHydrated.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `useHydrated` | function | `useHydrated()` |

## src/hooks/useYouTubePlayer.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `extractYouTubeVideoId` | function | `extractYouTubeVideoId(input: string)` |
| `useYouTubePlayer` | function | `useYouTubePlayer(
  videoId: string | null,
  containerId: string,
)` |
| `YOUTUBE_SPEED_OPTIONS` | constant | `const YOUTUBE_SPEED_OPTIONS` |

## src/lib/ai-screening.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `screenAndStore` | function | `screenAndStore(
  client: { from: (table: string) => unknown },
  table: "annotations" | "d...` |
| `screenContentRules` | function | `screenContentRules(content: string)` |

## src/lib/annotations.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `approveAnnotation` | function | `approveAnnotation(
  client: DbClient,
  annotationId: string,
  moderatorId: string,
  reason...` |
| `batchPermanentlyDeleteAnnotations` | function | `batchPermanentlyDeleteAnnotations(
  client: DbClient,
  annotationIds: string[],
)` |
| `batchRestoreAnnotations` | function | `batchRestoreAnnotations(
  client: DbClient,
  annotationIds: string[],
)` |
| `batchSoftDeleteAnnotations` | function | `batchSoftDeleteAnnotations(
  client: DbClient,
  annotationIds: string[],
)` |
| | | *+21 more* |

## src/lib/audio-sync-cloud.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `deleteAudioFile` | function | `deleteAudioFile(
  client: DbClient,
  storagePath: string,
)` |
| `deleteTimingMapCloud` | function | `deleteTimingMapCloud(
  client: DbClient,
  userId: string,
  timingMapId: string,
)` |
| `forkTimingMap` | function | `forkTimingMap(
  client: DbClient,
  userId: string,
  sourceTimingMapId: string,
)` |
| `getAudioFileUrl` | function | `getAudioFileUrl(
  client: DbClient,
  storagePath: string,
  expiresIn: number = 3600,
)` |
| | | *+7 more* |

## src/lib/audio-sync.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `deleteTimingMap` | function | `deleteTimingMap(id: string)` |
| `getActiveVerse` | function | `getActiveVerse(
  timings: VerseTiming[],
  currentTime: number,
)` |
| `getAudioBlob` | function | `getAudioBlob(id: string)` |
| `getAudioBlobUrl` | function | `getAudioBlobUrl(id: string)` |
| | | *+4 more* |

## src/lib/bible-loader.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `loadChapter` | function | `loadChapter(
  translation: string,
  book: BookId,
  chapter: number,
)` |
| `loadManifest` | function | `loadManifest(
  translation: string,
)` |

## src/lib/book-name-aliases.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `resolveBookName` | function | `resolveBookName(name: string)` |
| `BOOK_NAME_ALIASES` | constant | `const BOOK_NAME_ALIASES` |

## src/lib/commands.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `detectConflicts` | function | `detectConflicts(
  bindings: Keybinding[],
)` |
| `formatBinding` | function | `formatBinding(binding: string)` |
| `fuzzyMatch` | function | `fuzzyMatch(query: string, text: string)` |
| `isValidKeyCombo` | function | `isValidKeyCombo(key: string)` |
| | | *+15 more* |

## src/lib/constants.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `BIBLE_BASE_PATH` | constant | `const BIBLE_BASE_PATH` |
| `BOOK_BY_ID` | constant | `const BOOK_BY_ID` |
| `BOOKS` | constant | `const BOOKS` |
| `DEFAULT_TRANSLATION` | constant | `const DEFAULT_TRANSLATION` |
| | | *+3 more* |

## src/lib/crypto.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `base64ToUint8` | function | `base64ToUint8(b64: string)` |
| `createVerificationBlob` | function | `createVerificationBlob(
  key: CryptoKey,
)` |
| `decryptContent` | function | `decryptContent(
  ciphertext: Uint8Array,
  key: CryptoKey,
  iv: Uint8Array,
)` |
| `deriveExtractableKey` | function | `deriveExtractableKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
)` |
| | | *+11 more* |

## src/lib/denomination-presets.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `applyPreset` | function | `applyPreset(
  current: TranslationToggles,
  preset: DenominationPreset,
)` |
| `getChildPresets` | function | `getChildPresets(parentId: string)` |
| `getPresetById` | function | `getPresetById(id: string)` |
| `getRootPresets` | function | `getRootPresets()` |
| | | *+2 more* |

## src/lib/devotional-bibles.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `addEntryToDevotionalBible` | function | `addEntryToDevotionalBible(
  client: DbClient,
  devotionalBibleId: string,
  annotationId: string,
  ...` |
| `approveDevotionalBible` | function | `approveDevotionalBible(
  client: DbClient,
  devotionalBibleId: string,
  moderatorId: string,
  r...` |
| `batchAddEntries` | function | `batchAddEntries(
  client: DbClient,
  devotionalBibleId: string,
  annotationIds: string[],
)` |
| `createDevotionalBible` | function | `createDevotionalBible(
  client: DbClient,
  userId: string,
  formData: DevotionalBibleFormData,
)` |
| | | *+17 more* |

## src/lib/epub-parser.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `parseEpub` | function | `parseEpub(file: File)` |

## src/lib/export-html.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `generateNotesHtml` | function | `generateNotesHtml(
  annotations: Annotation[],
  verseTexts: (string | null)[],
  translation...` |
| `markdownToHtml` | function | `markdownToHtml(md: string)` |

## src/lib/export.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `annotationFilename` | function | `annotationFilename(annotation: Annotation)` |
| `annotationToMarkdown` | function | `annotationToMarkdown(
  annotation: Annotation,
  verseText: string | null,
  translationName: st...` |
| `exportAnnotationsAsZip` | function | `exportAnnotationsAsZip(
  context: ExportContext,
)` |
| `resolveVerseText` | function | `resolveVerseText(
  annotation: Annotation,
  translationId: string,
  toggles: TranslationTo...` |
| | | *+1 more* |

## src/lib/health.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `getHealthStatus` | function | `getHealthStatus()` |
| `HealthStatus` | interface | `interface HealthStatus` |

## src/lib/idb.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `getDb` | function | `getDb()` |
| `resetDbPromise` | function | `resetDbPromise()` |
| `DB_NAME` | constant | `const DB_NAME` |
| `DB_VERSION` | constant | `const DB_VERSION` |

## src/lib/logos-parser.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `isLogosFormat` | function | `isLogosFormat(lines: string[])` |
| `parseLogosBible` | function | `parseLogosBible(file: File)` |

## src/lib/offline-books.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `cacheBookOffline` | function | `cacheBookOffline(
  translation: string,
  bookId: string,
  chapterCount: number,
  onProgre...` |
| `isBookCached` | function | `isBookCached(
  translation: string,
  bookId: string,
  chapterCount: number,
)` |
| `isChapterCached` | function | `isChapterCached(
  translation: string,
  bookId: string,
  chapter: number,
)` |

## src/lib/offline-store.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `addToSyncQueue` | function | `addToSyncQueue(item: SyncQueueItem)` |
| `clearSyncQueue` | function | `clearSyncQueue()` |
| `deleteAnnotationLocally` | function | `deleteAnnotationLocally(id: string)` |
| `getLocalAnnotationsForChapter` | function | `getLocalAnnotationsForChapter(
  translation: string,
  book: string,
  chapter: number,
)` |
| | | *+7 more* |

## src/lib/preference-sync.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `fetchRemotePreferences` | function | `fetchRemotePreferences(
  client: SupabaseClient<Database>,
  userId: string,
)` |
| `loadLocalPreferences` | function | `loadLocalPreferences()` |
| `savePreferencesToLocalStorage` | function | `savePreferencesToLocalStorage(prefs: UserPreferences)` |
| `saveRemotePreferences` | function | `saveRemotePreferences(
  client: SupabaseClient<Database>,
  userId: string,
  prefs: UserPrefe...` |
| | | *+3 more* |

## src/lib/reader-fonts.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `getFontFamily` | function | `getFontFamily(key: ReaderFont)` |
| `getOrderedFontOptions` | function | `getOrderedFontOptions()` |
| `FontOption` | interface | `interface FontOption` |
| `FONT_OPTIONS` | constant | `const FONT_OPTIONS` |

## src/lib/register-sw.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `registerServiceWorker` | function | `registerServiceWorker()` |

## src/lib/sanitize-schema.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `sanitizeMarkdownForPublishing` | function | `sanitizeMarkdownForPublishing(markdown: string)` |
| `sanitizeSchema` | constant | `const sanitizeSchema` |

## src/lib/supabase-server.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `createSupabaseServerClient` | function | `createSupabaseServerClient(
  cookies: AstroCookies,
  cookieHeader: string | null,
)` |

## src/lib/supabase.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `supabase` | constant | `const supabase` |

## src/lib/sync-engine.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `processSync` | function | `processSync()` |
| `SyncResult` | interface | `interface SyncResult` |

## src/lib/text-parser.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `parseTextBible` | function | `parseTextBible(file: File)` |

## src/lib/theme.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `applyTheme` | function | `applyTheme(mode: ColorMode, theme: ColorTheme)` |
| `getColorMode` | function | `getColorMode()` |
| `getColorTheme` | function | `getColorTheme()` |
| `isDarkActive` | function | `isDarkActive(mode: ColorMode)` |
| | | *+9 more* |

## src/lib/translation-backup.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `backupTranslation` | function | `backupTranslation(
  client: DbClient,
  userId: string,
  manifest: UserTranslationManifest,
...` |
| `deleteBackup` | function | `deleteBackup(
  client: DbClient,
  userId: string,
  backupId: string,
)` |
| `getBackupStatus` | function | `getBackupStatus(
  client: DbClient,
  userId: string,
  translationIds: string[],
)` |
| `listBackups` | function | `listBackups(
  client: DbClient,
  userId: string,
)` |
| | | *+2 more* |

## src/lib/translation-info.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `getTranslationInfoChronological` | function | `getTranslationInfoChronological()` |
| `TranslationInfo` | interface | `interface TranslationInfo` |
| `TRANSLATION_INFO` | constant | `const TRANSLATION_INFO` |

## src/lib/translation-toggles.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `applyTranslationToggles` | function | `applyTranslationToggles(
  text: string,
  toggles: TranslationToggles,
)` |
| `loadTranslationToggles` | function | `loadTranslationToggles()` |
| `saveTranslationToggles` | function | `saveTranslationToggles(
  prefs: Partial<TranslationToggles>,
)` |
| `TranslationToggles` | interface | `interface TranslationToggles` |
| | | *+2 more* |

## src/lib/user-profiles.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `createProfile` | function | `createProfile(
  client: DbClient,
  userId: string,
  formData: UserProfileFormData,
)` |
| `deleteProfile` | function | `deleteProfile(
  client: DbClient,
  userId: string,
)` |
| `getProfileBySlug` | function | `getProfileBySlug(
  client: DbClient,
  slug: string,
)` |
| `getProfileByUserId` | function | `getProfileByUserId(
  client: DbClient,
  userId: string,
)` |
| | | *+6 more* |

## src/lib/user-translations.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `deleteUserTranslation` | function | `deleteUserTranslation(translationId: string)` |
| `getUserTranslationChapter` | function | `getUserTranslationChapter(
  translationId: string,
  book: string,
  chapter: number,
)` |
| `getUserTranslationManifest` | function | `getUserTranslationManifest(
  translationId: string,
)` |
| `getUserTranslationManifests` | function | `getUserTranslationManifests()` |
| | | *+2 more* |

## src/lib/verse-ref.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `displayVerseRef` | function | `displayVerseRef(ref: VerseRef)` |
| `formatVerseRef` | function | `formatVerseRef(ref: VerseRef)` |
| `isValidBookId` | function | `isValidBookId(id: string)` |
| `parseVerseRef` | function | `parseVerseRef(input: string)` |
| | | *+1 more* |

## src/lib/verse-selection.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `isVerseSelected` | function | `isVerseSelected(
  selection: VerseSelection | null,
  verseNumber: number,
)` |
| `updateSelection` | function | `updateSelection(
  current: VerseSelection | null,
  tappedVerse: number,
)` |
| `VerseSelection` | interface | `interface VerseSelection` |

## src/lib/verse-text.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `extractVerseText` | function | `extractVerseText(
  chapterData: ChapterData,
  verseStart: number,
  verseEnd: number,
)` |

## src/lib/workspace-prefs.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `loadWorkspacePrefs` | function | `loadWorkspacePrefs()` |
| `saveWorkspacePrefs` | function | `saveWorkspacePrefs(prefs: Partial<WorkspacePrefs>)` |
| `AnnotationDotStyle` | type | `type AnnotationDotStyle` |
| `ReaderFont` | type | `type ReaderFont` |
| | | *+2 more* |

## src/middleware.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `onRequest` | constant | `const onRequest` |

## src/types/annotation.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `Annotation` | interface | `interface Annotation` |
| `AnnotationFormData` | interface | `interface AnnotationFormData` |
| `CrossReference` | interface | `interface CrossReference` |
| `VerseAnchor` | interface | `interface VerseAnchor` |

## src/types/audio-sync.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `AudioPlaybackState` | interface | `interface AudioPlaybackState` |
| `AudioTimingMap` | interface | `interface AudioTimingMap` |
| `VerseTiming` | interface | `interface VerseTiming` |

## src/types/auth.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `AuthState` | interface | `interface AuthState` |
| `AuthProvider` | type | `type AuthProvider` |

## src/types/bible.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `BookInfo` | interface | `interface BookInfo` |
| `ChapterData` | interface | `interface ChapterData` |
| `TranslationManifest` | interface | `interface TranslationManifest` |
| `Verse` | interface | `interface Verse` |
| | | *+3 more* |

## src/types/database.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `Database` | interface | `interface Database` |

## src/types/devotional-bible.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `DevotionalBible` | interface | `interface DevotionalBible` |
| `DevotionalBibleEntry` | interface | `interface DevotionalBibleEntry` |
| `DevotionalBibleFormData` | interface | `interface DevotionalBibleFormData` |
| `DevotionalBibleWithEntries` | interface | `interface DevotionalBibleWithEntries` |
| | | *+2 more* |

## src/types/moderation.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `ScreeningFlag` | interface | `interface ScreeningFlag` |
| `ScreeningResult` | interface | `interface ScreeningResult` |

## src/types/user-profile.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `UserProfile` | interface | `interface UserProfile` |
| `UserProfileFormData` | interface | `interface UserProfileFormData` |

## src/types/user-translation.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `ParsedBook` | interface | `interface ParsedBook` |
| `ParsedChapter` | interface | `interface ParsedChapter` |
| `ParseResult` | interface | `interface ParseResult` |
| `StoredUserChapter` | interface | `interface StoredUserChapter` |
| | | *+1 more* |

## src/types/workspace.ts

| Export | Kind | Signature |
|--------|------|-----------|
| `WorkspaceActions` | interface | `interface WorkspaceActions` |
| `WorkspaceContextValue` | interface | `interface WorkspaceContextValue` |
| `WorkspaceState` | interface | `interface WorkspaceState` |
| `SidebarView` | type | `type SidebarView` |

<!-- Generated by claude-code-map at 2026-04-08T16:10:09.301Z -->