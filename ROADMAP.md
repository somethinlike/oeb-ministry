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

- [ ] Central settings page for all user preferences
- [ ] Translation toggle preferences (migrate from toolbar-only localStorage)
- [ ] Reader font preference
- [ ] Default Bible translation
- [ ] Offline Bible downloads — pick translations to pre-cache with storage estimate
- [ ] Account info (email, connected OAuth providers)
- [ ] Export all data button
- [ ] `user_preferences` Supabase table with RLS (syncs across devices)
- [ ] localStorage fallback for unauthenticated / offline users

### Dark Mode + Denomination Themes

- [ ] Light/dark mode toggle (`prefers-color-scheme` auto-detect + manual override)
- [ ] CSS custom properties for all theme colors
- [ ] Default theme (current blue accent, light/dark)
- [ ] Lutheran theme (warm white/charcoal, deep red + gold accents — Luther's rose seal)
- [ ] Catholic theme (ivory/deep navy, royal purple + gold — liturgical/Gothic)
- [ ] Orthodox theme (parchment/dark olive, crimson + forest green — Byzantine/ikon)
- [ ] WCAG AAA contrast verified for every theme + mode combination
- [ ] Theme selector in settings (persisted via `user_preferences`)

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

- [ ] Wire up denomination presets to UI (already defined in `denomination-presets.ts`)
- [ ] Preset selector in settings: Catholic, Orthodox, Baptist, ELCA, Academic/Literal, Custom
- [ ] Preset auto-sets translation toggles (user can still override individual toggles)

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
