# OEB Ministry — Roadmap

> Living document. Updated as features ship or scope changes.
> Version format: `YYYY.MM.DD.HHmm` (CST). See CLAUDE.md for versioning rules.

---

## v1 — MVP (Complete)

The minimum to be useful: read the Bible, write notes, take them with you.

- [x] Bible reader with 4-phase workspace (split-pane, draggable divider, floating panel, mobile bottom sheet)
- [x] 4 Bible translations (OEB-US, KJV 1611, Douay-Rheims, WEB)
- [x] 80-book canon support (Protestant + deuterocanon + Orthodox extras)
- [x] Annotation CRUD with Supabase + RLS
- [x] Cross-references (annotations link to related verses)
- [x] Verse citations in annotation editor
- [x] OAuth sign-in (Google, GitHub, Discord, Microsoft)
- [x] Export (.md full, .md clean, .txt, .pdf, .html)
- [x] PWA with offline reading and annotation (IndexedDB + sync queue)
- [x] Service worker (3-tier caching: network-first HTML, cache-first hashed assets, SWR static)
- [x] Translation toggles — 4 word choices (LORD/Yahweh, baptize/immerse, church/assembly, only begotten/one and only)
- [x] Reader toolbar (font picker, dot styles, column/focus/swap modes)
- [x] Connection status banner + offline sync
- [x] Recycle bin (soft delete with recovery)
- [x] Error boundaries
- [x] Open Source Theology page (`/open-source-theology`)
- [x] Breadcrumb navigation
- [x] OEB placeholder verse detection (work-in-progress `{ }` markers)
- [x] Translation first-open popup (explains each Bible's background)
- [x] Domain: `oeb.esdf.gg` with OAuth working across all providers

---

## v2 — Encryption, Publishing, & Personalization

The "make it yours" release: lock your notes, share your notes, make the app feel like home.

### Encryption (Private Annotations)

- [ ] Client-side AES-256-GCM encryption via Web Crypto API
- [ ] PBKDF2 key derivation (600k+ iterations) from user passphrase
- [ ] Browser credential manager integration (`autocomplete` attributes for passphrase save prompts)
- [ ] One-time recovery code generation at encryption setup
- [ ] "Lock this note" / "Unlock" UI (Tier 1 language — no crypto jargon in UI)
- [ ] Encrypt/decrypt roundtrip tests + wrong-key rejection tests

### CC0 Publishing Pipeline

- [ ] "Make Public" action on annotations
- [ ] CC0 intercession page — first-publish education flow ("Those Who Gave Freely")
  - [ ] Carousel: Fra Angelico, Rublev, Fanny Crosby, Gaudi, Ephrem, Tolstoy, Hopkins
  - [ ] Links to full Open Source Theology page
  - [ ] Shows once per user, then a small "Why CC0?" reminder link
- [ ] AI screening pass (profanity filter + theological alignment check)
- [ ] Human moderator review queue
- [ ] Moderator role in Supabase Auth (approve/reject/flag/remove)
- [ ] Moderation action logging for accountability
- [ ] Published annotations become CC0 and visible to all users

### Public Annotation Feed

- [ ] Browse public annotations by book/chapter/verse
- [ ] Full-text search across public annotations (Postgres `tsvector`)
- [ ] Attribution display (author name, date published)

### User Settings Page (`/app/settings`)

- [x] Central settings page for all user preferences
- [x] Translation toggle preferences (migrate from toolbar-only localStorage)
- [x] Reader font preference
- [x] Default Bible translation
- [ ] Offline Bible downloads — pick translations to pre-cache with storage estimate
- [x] Account info (email, connected OAuth providers)
- [x] Export all data button
- [x] `user_preferences` Supabase table with RLS (syncs across devices)
- [x] localStorage fallback for unauthenticated / offline users

### Dark Mode + Denomination Themes

- [x] Light/dark mode toggle (`prefers-color-scheme` auto-detect + manual override)
- [x] CSS custom properties for all theme colors
- [x] Default theme (current blue accent, light/dark)
- [x] Lutheran theme (warm white/charcoal, deep red + gold accents — Luther's rose seal)
- [x] Catholic theme (ivory/deep navy, royal purple + gold — liturgical/Gothic)
- [x] Orthodox theme (parchment/warm brown, crimson + gold — Byzantine mosaics)
- [x] WCAG AAA contrast verified for every theme + mode combination
- [x] Theme selector in settings (persisted via `user_preferences`)

### Command Palette & Keyboard Navigation

- [ ] Command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) — fuzzy search over all actions
- [ ] Command registry (all actions are command IDs, decoupled from keybindings)
- [ ] Three keybinding presets: Default, VSCode, Vim
- [ ] Vim mode state machine (normal / insert / command) with mode indicator
- [ ] Bible reader keyboard navigation (next/prev verse, next/prev chapter, go-to-verse, search)
- [ ] Intelligent keybind detection — passive input pattern recognition (`j`/`k` outside input, `:wq`, `Ctrl+Shift+P`)
- [ ] Non-intrusive toast prompt on detection ("Looks like you use keyboard shortcuts!")
- [ ] Detection state in localStorage (prompt once, don't nag)
- [ ] Per-user keybinding preset stored in `user_preferences`

### Denomination Presets (Word Choices)

- [x] Wire up denomination presets to UI (already defined in `denomination-presets.ts`)
- [x] Preset selector in settings: Catholic, Orthodox, Baptist, ELCA, Academic/Literal, Custom
- [x] Preset auto-sets translation toggles (user can still override individual toggles)

---

## v3 — Devotional Bible Assembly

The "build something bigger" release: curate, remix, and share full devotional Bibles.

### Devotional Bible Collections

- [ ] "Original Devotional" — 100% user's own annotations, published under their name as CC0
- [ ] "Assembled Devotional" — curated from CC0 pool (mix own + others' annotations)
- [ ] Named collections with metadata (title, description, base translation)
- [ ] Each devotional tracks which annotations are original vs. sourced from CC0 pool
- [ ] Browse/search published devotional Bibles
- [ ] Fork/remix — copy a devotional, then add/remove/replace annotations
- [ ] Publishing a devotional = publishing the collection metadata (underlying annotations already CC0)

### Batch Operations

- [ ] Batch publish annotations
- [ ] Batch export (select multiple annotations → single download)
- [ ] Batch move/copy annotations between devotional collections

### Advanced Annotation Editor

- [ ] Rich toolbar enhancements (highlighter `<mark>`, `<details>/<summary>` collapsible sections, tables)
- [ ] Safe HTML allowlist enforcement (editor can only produce allowed tags)
- [ ] Server-side `rehype-sanitize` on re-publish (security boundary for uploaded/edited content)

### Custom Keybindings

- [ ] Full keybinding customization UI in settings
- [ ] Import keybindings from VSCode (`keybindings.json` parser)
- [ ] Import keybindings from Vim (`.vimrc` / `nmap`/`nnoremap` parser)
- [ ] AI evaluation layer for ambiguous mappings (suggests closest OEB action)
- [ ] Export/share custom keybindings as JSON

### Public Profiles

- [ ] Public profile page (`/profile/{username}`)
- [ ] Display published annotations and devotional Bibles
- [ ] Content and design TBD (Ryan will outline later)

---

## v4 — Audio Bible Carousel

The "hear the Word" release: embed YouTube audio Bibles, sync annotations to the spoken verse, and navigate scripture through a living carousel.

### Audio Bible Management

- [ ] Users can add YouTube audio Bible links to their personal library (private by default)
- [ ] "Publish" an audio Bible — submits to moderation pipeline (same flow as CC0 annotation publishing)
- [ ] AI screening pass + human moderator review before public listing
- [ ] Published audio Bibles visible to all users; private ones visible only to the uploader
- [ ] `audio_bibles` table: YouTube URL, title, uploader, status (private/pending/published), verse coverage map
- [ ] Admin/moderator tools for reviewing submitted audio Bibles

### Transcription & Verse-Mapping Pipeline

- [ ] Pull transcript from YouTube (captions API or whisper-based fallback for uncaptioned videos)
- [ ] Verse detection engine — parse transcript text against canonical verse database to identify which verses appear
- [ ] Timestamp-to-verse mapping — associate each detected verse with its start/end timestamps in the video
- [ ] Handle non-sequential content (sermon clips, topical compilations, random verse collections — not just Genesis-to-Revelation)
- [ ] `audio_bible_verses` table: audio_bible_id, book, chapter, verse_start, verse_end, timestamp_start_ms, timestamp_end_ms
- [ ] Re-run pipeline on demand (if transcript improves or verse detection is updated)

### Annotation Carousel

- [ ] Carousel UI synced to video playback — current verse's annotation displayed as the active card
- [ ] Mobile: swipeable single-card carousel (touch-native, no faded neighbors)
- [ ] Desktop/tablet: active card centered with faded previous/next cards visible on left and right
- [ ] Tapping/clicking an annotation card seeks the video to that verse's timestamp (annotations = bookmarks)
- [ ] Audio Bible agnostic — same annotations render on any video that covers the same verses
- [ ] Dynamic carousel generation: given a video's verse map + user's annotations, build the carousel on demand
- [ ] Smooth transitions as video playback crosses verse boundaries
- [ ] Empty states — graceful handling when a verse has no annotation (skip or show placeholder card)

### Video Categorization & Discovery

- [ ] Categorize audio Bibles by type: full book, chapter, topical compilation, sermon excerpt, custom selection
- [ ] Browse/search published audio Bibles by book, chapter, verse coverage, or category
- [ ] "Find audio Bibles for this passage" — from the reader, discover videos that cover the current chapter/verse
- [ ] Verse coverage visualization — show which verses a video covers (useful for partial/topical recordings)

### Integration with Existing Systems

- [ ] Annotations from v1 work seamlessly — no migration needed, carousel reads existing verse anchors
- [ ] Devotional Bible collections (v3) can be played as carousel sequences over matching audio Bibles
- [ ] Published CC0 annotations (v2) available in the carousel alongside personal annotations
- [ ] Offline: cache video metadata and verse maps in IndexedDB (video itself streams from YouTube)

---

## Future — Unversioned

Ideas logged but not scoped to a version. Will be pulled into a version when the time comes.

### Context-Dependent Translation Toggles

Require per-verse metadata or complex logic — can't be simple find-and-replace.

- [ ] Hell / afterlife terms: "hell" → Gehenna / Hades / Sheol (three distinct Hebrew/Greek concepts)
- [ ] Brothers / siblings: "brothers" → "brothers and sisters" (Greek *adelphoi* — context-dependent)
- [ ] Virgin / young woman: "virgin" → "young woman" (Isaiah 7:14 *almah* debate — handful of verses)
- [ ] Servant / slave: "servant" → "slave" (Greek *doulos* — context and cultural sensitivity)

### Supplementary Theological Texts

- [ ] Public domain catechisms: Roman Catechism (1566), Luther's Small Catechism (1529/1912), Heidelberg Catechism (1563), St. Philaret's Longer Catechism (1823)
- [ ] AI-modernized versions of public domain catechisms → CC0 (first freely-licensed modern-English catechisms)
- [ ] Pipeline: AI draft → theological review by tradition-knowledgeable reviewers → publish as CC0
- [ ] Same static JSON architecture as Bible text (chapter-level files, same caching, same offline capability)

### Offline Bible Recording & Commentary

- [ ] Record yourself reading the Bible aloud with personal commentary
- [ ] Audio stored locally on user's device (not uploaded)
- [ ] WebM/Opus via MediaRecorder API
- [ ] Recordings associated with specific passages/annotations
- [ ] Playback UI within the app
- [ ] Optional cloud sync/backup and export

### AI-Powered Features

- [ ] AI-assisted semantic search (beyond keyword `tsvector`)
- [ ] AI screening in moderation pipeline (profanity + theological alignment)
- [ ] AI keybinding mapping for custom imports (v3 prerequisite)

### Client-Side Storage Monitoring

- [ ] `navigator.storage.estimate()` quota monitoring
- [ ] "Your device is running low on space" warning (Tier 1 language)
- [ ] Offer to sync/upload local data before clearing
- [ ] Eviction priority: cached Bible text first (re-downloadable), user content last (irreplaceable)
- [ ] Revisit when heavier offline features (full Bible downloads, search indexes) land

### Additional Bible Translations

- [ ] Brenton LXX (Septuagint English) — investigate source and copyright
- [ ] Additional public domain translations from scrollmapper/bible_databases
- [ ] Monthly check: OEB GitHub repo for new book releases → re-run `convert-oeb.ts`

### Cross-Device Testing Matrix

Documented in PLANNING-LOG.md. Execute against Vercel deployment when major features ship.

| Device | Browser | Engine | Validates |
|--------|---------|--------|-----------|
| macOS | Safari | WebKit | Desktop WebKit, Web Crypto |
| macOS | Chrome | Blink | Desktop Chromium baseline |
| Windows | Chrome | Blink | Primary desktop target |
| Windows | Edge | Blink | Chromium variant |
| Windows | Firefox | Gecko | Third engine |
| iPad | Safari | WebKit | Tablet viewport, touch, PWA |
| iPhone | Safari | WebKit | iOS WebKit (strictest), small viewport, PWA |
| Android (Pixel) | Chrome | Blink | Mobile Chromium, PWA, offline/sync |

---

## Reference

- **CLAUDE.md** — project standards, decision authority, code/security/testing requirements
- **PLANNING-LOG.md** — detailed decision history and architectural rationale
- **Version scoping rule** (from CLAUDE.md): "Always build for the current version. Do not pre-build future version features."
