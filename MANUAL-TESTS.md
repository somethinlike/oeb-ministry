# OEB Ministry — Testing Guide

> How to manually test every feature in the app.
> Last updated: 2026-03-11 (Phase 3.5)

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
- Should redirect to the sign-in page (`/auth/signin`)
- The sign-in page shows "Continue without signing in" at the bottom

### Identity Linking
- Sign in with one provider (e.g., Google)
- Sign out, then sign in with a different provider that uses the **same email** (e.g., GitHub)
- An interstitial page should appear: "Your accounts are connected"
  - Shows which provider you just used and which you already had
  - Explains they share the same email so data stays in one place
  - "Continue" button takes you to the app
- Sign out and sign in again with either provider → interstitial should **NOT** appear (only shows on first link)
- All notes and settings should be identical regardless of which provider you use

### Auth Guard
- While signed out, try visiting `/app/read`, `/app/settings`
- Both should redirect to `/auth/signin`
- `/app/search` should show an empty state with OAuth buttons (no redirect)

---

## 2. Bible Navigation

### Translation Picker
- Go to `/app/read` (signed in)
- Should see translation cards (OEB, WEB, KJV, DRA)
- Click one → navigates to book picker for that translation

### Book Picker
- Should show Old Testament, New Testament sections
- All translations show "Deuterocanon & Apocrypha" section (OEB, WEB, KJV, DRA)
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
- **Toolbar buttons:** B (Bold), I (Italic), H (Heading), • (Bullet list), " (Quote), HL (Highlight), CL (Collapsible), TBL (Table), Cite
- **Highlight (HL):** Wraps selected text in `<mark>` tags → yellow highlight in preview
- **Collapsible (CL):** Inserts `<details>/<summary>` block → clickable disclosure triangle in preview
- **Table (TBL):** Inserts a markdown table template → renders as proper table in preview
- Click **Preview** to see rendered output; click **Write** to return to editing
- Preview sanitizes dangerous HTML (scripts, iframes, event handlers are stripped)
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
- **Select all** checkbox in the header
- **Recycle Bin link** (trash icon) appears if you have deleted notes
- **Export button** (translation dropdown + download) — see Export section below

### Bulk Action Bar (Phase 3.2)
- Check one or more notes → a sticky bottom bar appears with:
  - **"N notes selected"** count on the left
  - **Export** (translation dropdown + "Download N notes") — exports only selected notes
  - **"Share selected (N)"** — submits selected notes for CC0 review
    - Encrypted (locked) notes are automatically skipped
    - Shows alert: "N notes submitted for review. M locked notes were skipped."
    - Requires a display name (set in Settings) — shows error if missing
  - **"Cancel"** — deselects all
  - **"Recycle Bin (N)"** — soft-deletes selected notes
- **Select all** checkbox toggles all notes on/off
- After bulk delete, the Recycle Bin link appears (if not already visible)

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

## 8. Sharing Notes (CC0 Publishing)

> **Prerequisite:** Must be signed in and have at least one saved annotation.

### First Time Sharing

1. Open a saved annotation in the editor
2. Click **"Share with everyone"** button (below the note content)
3. The **CC0 Intercession modal** should appear:
   - Carousel of 7 historical figures (Fra Angelico, Rublev, Fanny Crosby, Gaudí, Ephrem, Tolstoy, Hopkins)
   - Navigate with prev/next arrows and dot indicators
   - Link to the Open Source Theology page
   - **"Share my note"** and **"Not now"** buttons
4. Click "Share my note" → status changes to "Waiting for review"
5. Close and reopen the intercession modal → should NOT appear again (localStorage flag)
6. Instead, a small **"Why is sharing free?"** link appears

### Publishing Status States

- **Not shared:** Shows "Share with everyone" button
- **Pending review:** Shows "Waiting for review" badge + "Cancel" button
  - Click Cancel → reverts to unshared state
- **Approved (Shared):** Shows "Shared with everyone" badge + "Make private" button
  - Click "Make private" → reverts to unshared
- **Rejected:** Shows rejection reason from moderator + "Try again" button
  - Click "Try again" → resubmits for review

---

## 9. Community Notes

- Go to `/app/community` (or click "Community" in NavBar)
- Shows all approved CC0 annotations as cards
- **Search bar:** Full-text search across public notes
- **Book filter dropdown:** Filter by book (e.g., "John", "Romans")
- Each card shows: verse reference, verse text blockquote, note content, author name, date
- Cross-references displayed if present
- Empty state when no public notes exist yet

---

## 10. Moderation Queue

> **Prerequisite:** User must have the `moderator` or `admin` role in the `user_roles` table.

- Go to `/app/moderation` (link appears in NavBar only for moderators)
- Shows all pending (submitted for review) annotations
- Each card has:
  - **Approve** button — publishes the note as CC0
  - **Reject** button — expands a textarea for written feedback
    - Must enter a reason before confirming rejection
- After approving/rejecting, card disappears from queue
- Empty state: "All caught up!" when no pending submissions

---

## 11. Settings

- Go to `/app/settings`

### Account
- Shows avatar (or initial), display name, email, OAuth provider badges

### Appearance
- **Color mode:** System / Light / Dark toggle
- **Theme:** Default, Lutheran, Catholic, Orthodox

### Reading
- **Reader font:** Dropdown changes font in the reader (persists across sessions)
- **Annotation dots:** Blue / Subtle / Hidden
- **Reader layout:** Centered column / Multi-column
- **Keyboard shortcuts:** Default / VSCode / Vim
  - Changing preset persists to localStorage and syncs via Supabase
  - Reloading the reader → keyboard shortcuts should use the chosen preset
- **Custom keybinding editor:** Click "Customize individual shortcuts..." below the preset picker
  - Commands grouped by 5 categories (Navigation, Reading, Notes, Word Choices, System)
  - Each command shows its current key binding (or "none" if unbound)
  - Click a key binding → enters recording mode ("Press a key..." pulsing animation)
  - Press any key/combo → captures it and updates the binding
  - Press Escape → cancels recording without changing
  - Press Backspace → unbinds the shortcut
  - **"modified"** indicator appears on overridden bindings
  - Reset button (↩) per binding to restore preset default
  - **"Reset all to preset"** button at top clears all overrides
  - Conflict warnings: "Already used by: [command]" shown when a key is used twice
  - Browser-reserved keys (Ctrl+W, Ctrl+T, etc.) show "Reserved by browser" warning
  - Changes persist to localStorage and sync to Supabase
  - Reload → custom bindings survive and apply in the reader workspace

### Word Choices
- **Denomination preset:** Choose a tradition → toggles auto-apply
- **Subcategory:** Appears for traditions with subcategories
- **Individual toggles:** 4 switches (divine name, baptism, assembly, only begotten)
- Changing a toggle after selecting a preset → shows "Custom"

### Default Translation
- Dropdown of all supported translations
- Changes which translation opens by default

### Offline Reading
- Shows each supported translation (OEB, WEB, KJV, DRA) with:
  - Name, license, estimated size
  - **"Save offline"** button → progress bar → "Saved" badge
  - **"Remove"** button (when already saved)
  - Partial state shows "X/Y books"
- **"How does offline reading work?"** expandable details section

### Your Data
- Export controls: translation dropdown + "Download all notes" button
- Description: "Export your notes as a zip with an HTML file and Markdown files, including verse text"

---

## 12. Offline / PWA

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

## 13. Responsive Design

### Mobile (< 640px)
- Annotation sidebar opens as a bottom sheet (swipe to dismiss)
- Book picker: 2-column grid
- Chapter picker: 5-column grid
- Toolbar buttons wrap properly

### Tablet (640–1024px)
- Book picker: 4-column grid
- Chapter picker: 8-column grid

### Desktop (> 1024px)
- Split-pane workspace with draggable divider
- Pop out / Dock / Swap buttons visible
- Book picker: 5-column grid
- Chapter picker: 12-column grid

---

## 14. Note Locking (Encryption)

> **Prerequisite:** Must be signed in. The Supabase `user_encryption` table migration must be applied.

### First-Time Setup (in Settings)

1. Go to **Settings** (`/app/settings`) and scroll to the **Security** section at the bottom
2. Click **"Set up note locking"**
3. A 3-step wizard should appear:
   - **Step 1 — Introduction:** Explains locking in plain language. Click "Continue".
   - **Step 2 — Passphrase:** Enter a passphrase (12+ characters minimum).
     - Browser should offer to save it (credential manager)
     - Confirm passphrase must match
     - Click "Continue" → loading spinner while keys are derived
   - **Step 3 — Recovery Code:** Shows a `XXXX-XXXX-XXXX-XXXX-XXXX-XXXX` code.
     - "Copy to clipboard" button should work
     - Must check "I have saved my recovery code" before "Finish setup" enables
4. After finishing, the Security section should show **"Enabled"** with a padlock icon
5. Check Supabase → `user_encryption` table should have a new row for your user
6. The "Download as file" button should save `oeb-ministry-recovery-code.txt`

### Locking a Note

> **Prerequisite:** Encryption must be set up in Settings first. The lock toggle only appears after setup.

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
- **Lock toggle hidden without setup:** The "Lock this note" toggle should NOT appear unless encryption is set up in Settings
- **Lock toggle after reload:** Toggle triggers unlock prompt (key cleared from memory)
- **Credential manager:** Bitwarden/Chrome/iOS should offer to save the passphrase during setup and autofill during unlock
- **Very long note + encryption:** Write a 5000+ character note, lock it, save, reload, unlock, verify full content

---

## 15. Command Palette & Keyboard Shortcuts

### Command Palette

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) anywhere in the app
2. A modal should appear with a search input
3. Type "next" → should filter to "Next Chapter" and "Next Verse"
4. Arrow keys navigate the list, Enter executes, Escape closes
5. Commands grouped by category (Navigation, Reader, Notes, Translation, System)
6. Keyboard shortcut badges shown next to each command

### Keybinding Presets

**Default preset:**
- Arrow right/left → next/prev chapter
- Arrow down/up → next/prev verse
- Escape → clear selection

**VSCode preset:**
- Alt+Arrow right/left → next/prev chapter
- Arrow down/up → next/prev verse
- Ctrl+Shift+L → toggle layout
- Ctrl+Shift+M → focus mode

**Vim preset:**
- j/k → next/prev verse (normal mode only)
- Shift+J/K → next/prev chapter (normal mode only)
- i → new annotation (enters insert mode)
- Escape → return to normal mode
- Mode indicator at bottom-left shows "NORMAL" or "INSERT"

### Keybind Detection

1. With "Default" preset active, press j or k outside of any input field
2. After 2-3 presses, a toast should appear: "Keyboard shortcuts available"
3. Toast links to Settings page
4. Refresh → toast should NOT appear again (localStorage flag)

---

## 16. Devotional Bibles

> **Prerequisite:** Must be signed in. Must have at least a few annotations saved.

### List Page

1. Navigate to `/app/devotionals` (or click "Devotionals" in nav bar)
2. **Empty state:** Shows "You haven't created any devotionals yet" with explanation and "Create your first devotional" CTA
3. **With devotionals:** Shows cards with title, type badge (Original/Assembled), translation abbreviation, note count, date, description (truncated)
4. Click a card → navigates to detail page (`/app/devotionals/{id}`)

### Create Form

1. Click "+ New devotional" from list page
2. Form shows: Title (required), Description (optional), Bible translation dropdown, Type toggle (Original / Assembled)
3. "Create devotional" button disabled until title entered
4. Fill in title → click "Create devotional" → redirects to detail page
5. "Cancel" and "Back" links return to list page

### Detail Page

1. Shows: back link, title, type badge, translation name, note count, description
2. **"Edit details"** link → navigates to edit form
3. **"+ Add notes"** button → opens annotation picker modal
4. **Empty state:** "This devotional has no notes yet" with "Add some to get started" link
5. **With entries:** Each entry shows verse reference, content preview, up/down reorder arrows, remove (X) button
6. **Reorder:** First entry's "up" disabled, last entry's "down" disabled; clicking arrows swaps entries
7. **Remove entry:** Click X → inline confirmation "Remove? Yes / No"; click Yes → entry removed
8. **"Share with community"** button appears when entries > 0 and no publish status
9. **Delete:** Click "Delete" → inline confirmation "Move to recycle bin? Yes / No"; click Yes → soft-deletes and redirects to list

### Edit Form

1. Click "Edit details" on detail page → navigates to `/app/devotionals/edit/{id}`
2. Form pre-populated with existing title, description, translation, type
3. Shows "Edit devotional" heading, "Save changes" button
4. "Back" and "Cancel" links return to detail page

### Annotation Picker Modal

1. Click "+ Add notes" on detail page → modal opens with backdrop blur
2. **"My Notes" tab:** Shows user's own annotations (verse ref + content preview)
3. **Search:** Type query → click Search → filters results
4. **Selection:** Click a note → checkbox checked, border highlights; footer shows "N selected"
5. **Already added:** Notes already in the devotional show checked + disabled + "Already added" label
6. **"Community Notes" tab:** Only shows for "assembled" type devotionals
7. Click "Add N notes" → modal closes, entries appear in detail page
8. Click "Cancel" or X → modal closes without adding

### Navigation

- "Devotionals" link appears in both desktop nav and mobile menu
- All breadcrumb/back links navigate correctly

### Community Devotionals (Browse & Fork)

1. Go to `/app/community` → two tabs: "Notes" and "Devotionals"
2. **Notes tab (default):** Same as before — search, book filter, published annotations
3. **Devotionals tab:** Shows published devotionals with filter by translation dropdown
4. **Empty state:** "No community devotionals available yet. Be the first to share one!"
5. **With published devotionals:** Cards show title, type badge, translation, note count, author, fork count
6. **"Make a copy" button:** Creates an editable fork in user's own devotionals, redirects to it
7. Click a devotional title → navigates to public detail view (`/app/community/devotionals/{id}`)

### Public Devotional Detail

1. Shows title, metadata (type badge, translation, note count, author, fork count)
2. "Back" link → returns to Community page
3. **"Make your own copy" button:** Creates fork, redirects to user's copy
4. All entries listed in order with numbering, verse refs, content
5. Read-only — no editing controls
6. If devotional is not published → redirects to community page

---

## 17. AI Moderation Screening

AI screening runs automatically when annotations or devotionals are submitted for publishing. It's annotative (non-blocking) — flags provide context for human moderators.

### How screening works
1. User clicks "Share publicly" on an annotation → content is screened before entering the moderation queue
2. Screening checks: profanity (high severity), mild language (low), theological flags (medium), spam patterns (medium)
3. `passed = true` means no high-severity flags — content still goes to moderation queue either way
4. Results are stored on the annotation record (`ai_screening_passed`, `ai_screening_flags`, `ai_screened_at`)

### Moderation Queue badges (`/app/moderation`)
**Precondition:** Must be signed in as a moderator/admin

1. **Clean pass (no flags):** Green checkmark icon + "AI screening: passed (no flags)"
2. **Passed with flags:** Yellow warning icon + "AI screening: passed with flags" + colored flag badges
3. **Failed (high-severity flags):** Red warning icon + "AI screening: flagged" + colored flag badges
4. **Flag badge colors:** Red = high severity, Yellow = medium severity, Blue = low severity
5. Each badge shows `type: message` (e.g., "theology: Contains theological claim about predestination")
6. Badges are visible between the note content and the Approve/Reject buttons

### Screening integration with publishing
1. Submit an annotation for publishing → verify `ai_screening_passed` and `ai_screening_flags` are populated in the database
2. Submit a devotional for publishing → same screening on title + description
3. Batch submit annotations → each gets screened individually

---

## 18. Edge Cases

- **Empty state:** New user with no notes → My Notes shows "Start reading" prompt
- **Long note content:** Write a very long note → should scroll, not break layout
- **Special characters in notes:** Markdown with `<script>`, HTML entities, unicode → should render safely (XSS protection)
- **Multiple annotations on same verse:** Should all appear in sidebar, export with `-2` suffix
- **Rapid saves:** Click save multiple times quickly → should not create duplicates
- **Browser back/forward:** Navigation history should work through book/chapter/verse selection
