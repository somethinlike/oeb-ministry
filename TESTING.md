# OEB Ministry — Testing Guide

> How to manually test every feature in the app.
> Last updated: 2026-03-10

**Dev server:** `npm run dev` → http://localhost:4321

---

## 1. Authentication

### Sign In
- Go to `/auth/signin`
- Click a provider button (Google, Microsoft, Discord, GitHub)
- Should redirect to OAuth provider → callback → land on `/app/read`
- NavBar should show your avatar and name

### Sign Out
- Click your avatar in the NavBar → "Sign out"
- Should redirect to the landing page
- Navigating to `/app/read` should redirect to `/auth/signin`

### Auth Guard
- While signed out, try visiting `/app/read`, `/app/search`, `/app/settings`
- All should redirect to `/auth/signin`

---

## 2. Bible Navigation

### Translation Picker
- Go to `/app/read` (signed in)
- Should see translation cards (OEB, WEB, KJV, DRA)
- Click one → navigates to book picker for that translation

### Book Picker
- Should show Old Testament, New Testament sections
- For WEB/KJV/DRA: should also show "Deuterocanon & Apocrypha" section
- For OEB: no Deuterocanon section
- Search bar filters books in real time (try "john", "psalm", "cor")
- Each book shows chapter count
- **Save offline icon** (cloud/download) appears on each book tile
  - Click it → spinner → green checkmark when done
  - Refresh page → checkmark persists (cached)

### Chapter Picker
- Click a book → shows chapter grid (numbered buttons)
- **"Save book offline" button** in top-right
  - Click → progress indicator (e.g., "Saving 12/21...") → "Saved offline"
  - Individual chapters show a small green dot if cached
- Click a chapter → opens the reading workspace

---

## 3. Reading Workspace

### Bible Text
- Verses render with verse numbers
- Click a verse → annotation sidebar opens with that verse selected
- Click-drag or shift-click to select a verse range

### Toolbar Buttons (top bar)
- **Breadcrumbs:** Bible / Translation / Book / Chapter — each is a link back
- **Save offline:** Cloud icon — caches the current book for offline reading
  - Shows green checkmark if already cached
- **Focus:** Hides toolbar for clean reading (cog icon appears in nav to restore)
- **Pop out / Dock:** (desktop only) Floats annotation panel in a draggable window
- **Swap:** (desktop only) Flips reader and sidebar position
- **Layout toggle:** Switches between centered prose and multi-column layout
- **Font picker:** Dropdown of font options — text updates immediately
- **Annotation dots:** Cycles blue → subtle (gray) → hidden → blue
- **Word swap toggles** (LORD↔Yahweh, baptize↔immerse, church↔assembly, only begotten↔one and only):
  - Toggle each → verse text updates in real-time
- **Translation picker:** Switch translation — text reloads

### Split Pane
- Drag the divider to resize reader vs. sidebar
- On mobile: sidebar opens as a bottom sheet instead

---

## 4. Annotations (Notes)

### Create a Note
- Select a verse in the reader → "Write a note" panel opens
- Type Markdown content (bold, italic, lists, links all work)
- Optionally add cross-references via the picker
- Optionally use the **Cite** button to insert a verse reference
- Click "Save your note" → annotation appears in the sidebar list
- Blue dot appears on the verse in the reader

### Edit a Note
- Click an existing annotation in the sidebar → "Edit your note" panel
- Change content → "Save your note"
- Verify the updated text appears in the sidebar

### Delete a Note
- While editing → click "Delete" → confirmation appears: "Move to Recycle Bin?"
- Click "Yes, move it" → panel shows "Moved to Recycle Bin" + "Return to My Notes" link
- Blue dot disappears from the verse
- You can re-save the content as a new note from this panel

### Verse Text Capture
- After saving a note, check Supabase dashboard → `annotations` table
- The `verse_text` column should contain the actual Bible verse text
- This enables offline export with verse text included

---

## 5. My Notes (Search)

- Go to `/app/search` (or click "My Notes" in nav)
- **Recent notes** load on page open (up to 20, newest first)
- **Search bar:** Type keywords → click search → results filtered by full-text search
- **Multi-select:** Check boxes on notes → "Export" and "Delete" bulk actions appear
- **Select all** checkbox in the header
- **Recycle Bin link** appears if you have deleted notes
- **Export button** (translation dropdown + download) — see Export section below

---

## 6. Export

### Batch Export (My Notes or Settings)
1. Find the export controls (My Notes page or Settings → Your Data)
2. **Translation dropdown:** "Choose a translation..." placeholder
   - Download button is **disabled** until you pick a translation
3. Select a translation (e.g., "WEB — World English Bible")
4. Click "Download all notes" → downloads `oeb-ministry-notes.zip`
5. Unzip and verify:
   - **`My Notes.html`** — open in any browser:
     - Header with translation name, date, note count
     - Table of contents with clickable links to each note
     - Each note: verse reference heading, verse text in blue blockquote, your note content, date footer
     - Cross-references listed if any
     - Self-contained (no external CSS/JS — works offline)
     - Print-friendly (try Ctrl+P)
   - **`notes/` folder** — Markdown files:
     - YAML frontmatter with `verse`, `translation` (full name), `cross_references`, `created`, `updated` (human-readable dates)
     - Verse text as `> blockquote` after frontmatter
     - Your note content below
     - Filenames: `BookName_Chapter_Verse.md` (e.g., `John_3_16.md`)
     - Duplicate verses get `-2`, `-3` suffix

### Single Note Export
- While editing a note → the "Download" button exports just that one note as `.md`
- Same format: frontmatter + verse blockquote + content

### Word Swaps in Export
- If you have toggles active (e.g., LORD→Yahweh), the exported verse text should reflect those settings

---

## 7. Recycle Bin

- Go to `/app/recycle-bin`
- Shows soft-deleted notes (most recently deleted first, up to 50)
- **Restore:** Click restore → note reappears in My Notes
- **Permanently delete:** Irreversible — removes from database
- **Bulk actions:** Multi-select with restore/delete options

---

## 8. Published Notes

- Go to `/app/published`
- Shows notes marked as public (is_public = true)
- Currently read-only listing

---

## 9. Settings

- Go to `/app/settings`

### Account
- Shows avatar (or initial), display name, email, OAuth provider badges

### Reading
- **Reader font:** Dropdown changes font in the reader (persists across sessions)
- **Annotation dots:** Blue / Subtle / Hidden
- **Reader layout:** Centered column / Multi-column

### Word Choices
- **Denomination preset:** Choose a tradition → toggles auto-apply
- **Subcategory:** Appears for traditions with subcategories
- **Individual toggles:** 4 switches (divine name, baptism, assembly, only begotten)
- Changing a toggle after selecting a preset → shows "Custom"

### Default Translation
- Dropdown of all supported translations
- Changes which translation opens by default

### Your Data
- Export controls: translation dropdown + "Download all notes" button
- Description: "Export your notes as a zip with an HTML file and Markdown files, including verse text"

---

## 10. Offline / PWA

### Install as App
- In Chrome: address bar → install icon (or menu → "Install Open Bible Ministry")
- Opens in standalone window (no browser chrome)

### Offline Reading
- Save a book offline (BookPicker, ChapterPicker, or WorkspaceToolbar)
- Disconnect from internet (airplane mode or DevTools → Network → Offline)
- Navigate to a cached book/chapter → text should load from cache
- Uncached chapters show a "not available" state

### Offline Note-Taking
- While offline: select a verse → write a note → save
- Should save to IndexedDB (no error)
- Reconnect → note syncs to Supabase automatically
- Check Supabase dashboard to verify the synced note

### Update Prompt
- When a new service worker is available, an update banner should appear
- Clicking it reloads with the new version

### Connection Indicator
- When offline, a connection status indicator should appear
- When back online, it disappears

---

## 11. Responsive Design

### Mobile (< 640px)
- Annotation sidebar opens as a bottom sheet (swipe to dismiss)
- Book picker: 2-column grid
- Chapter picker: 5-column grid
- Toolbar buttons wrap properly

### Tablet (640–1024px)
- Book picker: 3-column grid
- Chapter picker: 8-column grid

### Desktop (> 1024px)
- Split-pane workspace with draggable divider
- Pop out / Dock / Swap buttons visible
- Book picker: 5-column grid
- Chapter picker: 12-column grid

---

## 12. Note Locking (Encryption)

> **Prerequisite:** Must be signed in. The Supabase `user_encryption` table migration must be applied.

### First-Time Setup

1. Open a note (create or edit) in the workspace
2. Click **"Lock this note"** button (below cross-references, above Save)
3. A 3-step wizard should appear:
   - **Step 1 — Introduction:** Explains locking in plain language. Click "Continue".
   - **Step 2 — Passphrase:** Enter a passphrase (12+ characters minimum).
     - Browser should offer to save it (credential manager)
     - Confirm passphrase must match
     - Click "Continue" → loading spinner while keys are derived
   - **Step 3 — Recovery Code:** Shows a `XXXX-XXXX-XXXX-XXXX-XXXX-XXXX` code.
     - "Copy to clipboard" button should work
     - Must check "I have saved my recovery code" before "Finish setup" enables
4. After finishing, the lock toggle should show **"Locked"** with a closed padlock icon
5. Check Supabase → `user_encryption` table should have a new row for your user

### Locking a Note

1. Write a note and toggle "Lock this note" on → padlock icon + "Locked" label
2. "Only you can read this note" appears next to the toggle
3. Click "Save your note"
4. Check Supabase → `annotations` table:
   - `is_encrypted` = `true`
   - `encryption_iv` populated (base64 string)
   - `content_md` is base64 ciphertext (not your original text)

### Viewing a Locked Note

1. After saving a locked note, the sidebar should show:
   - Lock icon next to the verse reference
   - Preview text: *"Locked note"* (italic) instead of content
2. Click the annotation card → panel opens:
   - If already unlocked this session → content decrypts and displays normally
   - If not unlocked → shows "This note is locked" with an Unlock button
3. Click Unlock → enter passphrase → content appears in the editor

### Unlocking After Page Reload

1. Lock and save a note, then reload the page
2. The encryption key clears from memory (by design — never persisted)
3. Click a locked note in the sidebar → "This note is locked" state
4. Click Unlock → enter passphrase → content appears
5. Browser credential manager should auto-fill the passphrase

### Removing Lock

1. Open a locked note (unlock first if needed)
2. Click the "Locked" toggle → changes to "Lock this note" (unlocked state)
3. Click "Save your note"
4. Check Supabase → `is_encrypted` = `false`, `content_md` back to plaintext

### Search Behavior

- Go to My Notes (`/app/search`)
- Locked notes should appear in the recent list with a lock icon
- **Full-text search should NOT find locked notes** (content is ciphertext)
- Unlocked (plaintext) notes should still be searchable

### Export Behavior

- Go to My Notes → use batch export
- If you have locked notes, a confirmation dialog should appear:
  - "X locked notes will be skipped. Download the remaining Y notes?"
- Confirm → zip downloads without locked notes
- If ALL notes are locked → "All your notes are locked. Unlock them first to download."

### Edge Cases

- **Wrong passphrase:** Enter wrong passphrase in UnlockPrompt → "That passphrase didn't work" error
- **Cancel prompts:** Cancel the setup wizard or unlock prompt → returns to previous state cleanly
- **Lock toggle without setup:** First toggle triggers the full setup wizard
- **Lock toggle after reload:** Toggle triggers unlock prompt (key cleared from memory)
- **Very long note + encryption:** Write a 5000+ character note, lock it, save, reload, unlock, verify full content

---

## 13. Edge Cases

- **Empty state:** New user with no notes → My Notes shows "Start reading" prompt
- **Long note content:** Write a very long note → should scroll, not break layout
- **Special characters in notes:** Markdown with `<script>`, HTML entities, unicode → should render safely (XSS protection)
- **Multiple annotations on same verse:** Should all appear in sidebar, export with `-2` suffix
- **Rapid saves:** Click save multiple times quickly → should not create duplicates
- **Browser back/forward:** Navigation history should work through book/chapter/verse selection
