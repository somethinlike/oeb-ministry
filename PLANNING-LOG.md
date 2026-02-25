# OEB Ministry - Planning & Decision Log

> This file logs high-level planning conversations and architectural decisions.
> Designed for AI consumption: paste this + CLAUDE.md into any LLM for context transfer.

---

## Session 1 — 2026-02-14 — Project Bootstrap

### Context
- Ryan wiped the previous attempt and is starting fresh.
- Ryan is a coding novice learning through AI-assisted development ("vibe coding").
- Claude is the technical decision-maker and mentor. Ryan steers product vision.
- Ryan is on the Claude $100 MAX subscription plan.
- The project should be optimized for AI consumption (readable by LLMs for review/collaboration) while adhering to open source standards.

### Project Definition
**OEB Ministry** is an online tool for building Devotional Bibles through a system of verse-anchored annotations.

Core concepts:
- **Annotations**: Markdown notes anchored to one or more Bible verses. Created by users.
- **Devotional Bibles**: A user's collection of annotations overlaid on a base Bible translation.
- **Public annotations**: Licensed CC0. Other users can remix/assemble them into their own devotional bibles.
- **Private annotations**: Encrypted client-side (AES-256-GCM) before storage. Key never leaves the browser.
- **Base Bibles**: Open English Bible (default). All public domain translations available.
- **Ethics**: Christ's ethics. Open Source. CC0.

### User System
- Auth via: Google, Microsoft, Discord, GitHub (Supabase Auth)
- Each user has a private devotional bible (encrypted)
- Users can publish annotations individually or in batch → becomes CC0
- Users can assemble custom devotional bibles from any public annotations

### UI Requirements
- Designed for laymen (non-technical users)
- Markdown editor with toolbar buttons (bold, italic, headers, lists, etc.)
- No expectation that users know Markdown syntax

### Tech Stack Decision (by Claude)
| Layer | Choice | Reasoning |
|-------|--------|-----------|
| Framework | Astro (SSR, Node adapter) | Content-heavy site benefits from static-first with islands of interactivity |
| UI Components | React | Largest ecosystem for editors/toolbars, most AI training data |
| Styling | Tailwind CSS v4 | Utility-first, no context-switching to CSS files |
| Language | TypeScript (strict) | Catches bugs early, educational error messages |
| Backend | Supabase | Auth, Postgres, RLS — no custom backend needed |
| Bible Storage | Static JSON files | Bible text is immutable; static = fast + free of DB load |
| Annotations DB | Supabase Postgres | Relational data with RLS for access control |
| Encryption | Web Crypto API (AES-256-GCM) | Browser-native, no dependencies, current standard |
| Package Manager | npm | Default, simple |

### Decision: Testing & Security Standards
Ryan requested the strictest engineering standards, noting that future AI agents will review this codebase.

**Testing stack chosen:**
- Vitest (unit/integration) + React Testing Library (components) + Playwright (E2E) + pgTAP (RLS policies)
- 100% branch coverage target on `src/lib/`
- Adversarial RLS testing: every policy tested for both allow AND deny cases
- Snapshot tests banned (they silently pass on behavior changes)
- Tests ship with features, never "later"

**Security posture:**
- OWASP Top 10 evaluated per feature
- PBKDF2 with 600k+ iterations for encryption key derivation
- `dangerouslySetInnerHTML` banned — markdown rendered through `rehype-sanitize`
- `npm audit` clean required before every commit
- CSP headers enforced, no inline scripts
- Supabase service role key never exposed client-side

**Reputation clause added to CLAUDE.md:** All code must be defensible under adversarial review by other AI agents.

### Decision: Progressive Comprehension ("The Grandmother Principle")
Ryan defined a three-tier comprehension model for ALL user-facing content:

1. **Tier 1 — The Grandmother.** Default. Visual-first, plain language, no jargon, gentle pacing, respectful tone. "Lock this note" not "Encrypt with AES-256-GCM." This tier is the starting point for every UI element, every error message, every label.
2. **Tier 2 — The Avid Learner.** Opt-in via "Learn more" links, expandable sections, tooltips. Explains the *why* in accessible language. Never forced on Tier 1 users.
3. **Tier 3 — The Expert Engineer.** Respected, not hidden. Gets dedicated, clearly labeled technical sections — reachable from table of contents and linked from Tier 2, but positioned after Tier 1 and 2 content. The engineer should find the full technical truth within one or two clicks, without wading through beginner content. Tier 3 language never *replaces* Tier 1/2 in primary flows — a grandmother never sees a stack trace, but the engineer always has a clear path to the details.

This principle governs UI copy, error handling, onboarding, settings, and all user-facing documentation.

### Decision: Relationship & Design Principles Review
Reviewed CLAUDE.md for gaps. Resolved 9 items with Ryan:

1. **Decision authority:** Ryan = vision/ethics/what. Claude = implementation/security/how. Gray areas discussed, Ryan picks.
2. **Disagreement protocol:** Soft recommend → firm recommend → hard block (security). Ryan can escalate past hard blocks; override is logged.
3. **Multi-AI collaboration:** Claude is architectural authority. Other AI input evaluated but doesn't override. No ego, but stability matters.
4. **Session start protocol:** Every new session reads CLAUDE.md + PLANNING-LOG.md + git status + runs tests before coding.
5. **Version scoping:** v1 = Bible reader + annotations + auth. v2 = encryption + publishing + public feed. v3 = devotional assembly + batch ops.
6. **Accessibility:** WCAG 2.1 AAA. Responsive web only — no mobile app split.
7. **Content moderation:** All content private/encrypted by default. Publishing requires AI screening + human moderator review. Theological standards enforced (no profanity, no false gospels). Moderator role in Supabase Auth.
8. **Data ownership:** Users can export all annotations as `.md` with YAML frontmatter. Portable to Obsidian, Logseq, AI agents. Non-negotiable.
9. **Error recovery:** Prevent first (rigorous upfront review). When wrong: no ego, log lesson in PLANNING-LOG.md, refactor. Mutual respect clause — questions are never dumb, admitting mistakes builds trust.

### Decision: Technical Open Questions Resolved

**Annotation data model:**
- Cross-references: YES (first-class feature — annotations link to related verses across books)
- Tags: NO. Search replaces tags. Full-text search (Postgres `tsvector`) in v1, AI-assisted semantic search in later versions. Tags are manual busywork that AI makes obsolete.

**Bible text JSON schema:**
- Split by chapter: `/public/bibles/{translation}/{book}/{chapter}.json`
- Each translation has a `manifest.json` index
- Canonical verse addressing: `translation:book:chapter:verse` (e.g., `oeb:john:3:16`)
- Optimized for speed on all devices (2-5KB per chapter file)

**Encryption key management:**
- Passphrase-derived via PBKDF2 (600k+ iterations)
- HTML `autocomplete` attributes enable native credential manager integration (Chrome, iOS Keychain, Android, Bitwarden, etc.) — grandmother hits "Yes" on the save prompt
- One-time recovery code generated at setup
- Forget passphrase + lose recovery = data gone permanently (by design)

**Offline capability:**
- Full PWA from v1 (not deferred)
- Service worker caches Bible text (static, immutable = perfect for caching)
- IndexedDB for local annotation storage
- Sync queue for offline edits → push to Supabase on reconnect
- Conflict resolution: last-write-wins (revisit if needed)

**Deployment:** Vercel with `@astrojs/vercel` adapter.

### Decision: Remaining Open Questions Resolved

**Bible text source:**
- bible-api.com (open source) already serves OEB + KJV + ASV + WEB + BBE + others as JSON
- One-time build script will download and convert to our chapter-level JSON schema
- Static files after that — no runtime API dependency, fully offline-capable
- OEB confirmed CC0 (Creative Commons Zero)

**Supabase:** Fresh project. Will set up from scratch.

**Devotional Bible assembly UX (v3 direction):**
- Both individual annotation search AND browsable published collections
- Users can search public annotations by verse/keyword and add to their collection
- Users can also publish entire devotional bibles that others can browse and fork/remix
- This is directional only — detailed UX design deferred to v3

### All Open Questions Resolved
Planning phase complete. Ready to begin v1 implementation.

---

## Session 2 — 2026-02-14 — v1 Implementation & Bible Canon Decision

### Implementation Complete
All 10 phases of the v1 MVP were implemented in a single session. See the plan file for phase details. Key outcomes:
- 65+ files created
- 47/47 unit tests passing
- 0 TypeScript errors
- Clean production build
- Bible data: sample files only (bible-api.com returned 403). Need to source from GitHub repos instead.

### Decision: Bible Canon & Translation Priority
**Owner: Ryan (product vision)**

Ryan directed that the app should:
1. **Prefer western book sets** — traditional Western Christian canon ordering.
2. **Prefer translations with apocrypha/deuterocanon** — Catholic and Orthodox canons are first-class, not afterthoughts.
3. **Respect Catholic and Orthodox book arrangements** — deuterocanonical books are interspersed in the OT where they traditionally belong, not shoved in a separate "Apocrypha" appendix.
4. **Deprioritize Protestant-only (66-book) editions** — still available, but sorted lower in the translation picker.

**What this changes:**
- `BookId` type expanded from 66 to ~81 books (adds deuterocanon + Orthodox extras)
- `BookInfo.testament` expanded from `"OT" | "NT"` to `"OT" | "DC" | "NT"` (DC = deuterocanon)
- Each translation declares which books it includes via its manifest
- BookPicker shows books based on the selected translation's available books
- Translation picker sorts apocrypha-inclusive translations first

**Target translation list (v1):**
| Translation | Canon | Books | Priority |
|---|---|---|---|
| OEB-US | NT + partial OT (CC0) | Partial | Flagship (default) |
| KJV 1611 | 80 books (original with apocrypha) | 80 | High |
| Douay-Rheims | Catholic (73 books) | 73 | High |
| WEB + deuterocanon | Protestant + apocrypha | 66+ | High |
| Brenton LXX | Septuagint English | TBD | Investigate |

**Data sources:** GitHub repos instead of bible-api.com:
- [openenglishbible/Open-English-Bible](https://github.com/openenglishbible/Open-English-Bible) — USFM format, CC0
- [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) — JSON/SQL/CSV, 140+ translations
- [aruljohn/Bible-kjv-1611](https://github.com/aruljohn/Bible-kjv-1611) — KJV 1611 with apocrypha, JSON

### Bible Data Converted
All three translations converted to per-chapter JSON in `public/bibles/`:
| Translation | ID | Books | Chapters | Source |
|---|---|---|---|---|
| Douay-Rheims | `dra` | 77 | 1,361 | scrollmapper |
| KJV 1611 | `kjv1611` | 80 | 1,355 | aruljohn |
| Open English Bible | `oeb-us` | 59 | 943 | openenglishbible (dev set) |

**Monthly reminder:** Check OEB GitHub repo for new book releases and re-run `npx tsx scripts/convert-oeb.ts`.

### Git Protocol Added
Claude now owns git operations per CLAUDE.md. Commits after each logical unit of work, pushes immediately. Ryan never needs to remember to commit.

---

## Deployment Guide — Supabase + Vercel

### Step 1: Create Supabase Project
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose a name (e.g., "oeb-ministry") and a strong database password
4. Select a region close to your users (e.g., US East)
5. Wait for the project to spin up (~2 minutes)

### Step 2: Push Database Migrations
Option A — via Supabase CLI (if Docker is running):
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Option B — via Supabase SQL Editor (no Docker needed):
1. Go to your project's SQL Editor in the Supabase dashboard
2. Copy and paste each migration file in order:
   - `supabase/migrations/20260214000001_annotations.sql`
   - `supabase/migrations/20260214000002_cross_references.sql`
   - `supabase/migrations/20260214000003_rls_policies.sql`
3. Run each one. They should all succeed.

### Step 3: Configure OAuth Providers
In Supabase Dashboard → Authentication → Providers:

**Google:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials (Web application)
3. Set authorized redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret into Supabase

**GitHub:**
1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set callback URL: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret into Supabase

**Discord:**
1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Create a new application → OAuth2 section
3. Add redirect: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret into Supabase

**Microsoft (Azure):**
1. Go to [portal.azure.com](https://portal.azure.com) → App registrations
2. Create a new registration
3. Set redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
4. Copy Application (client) ID and create a Client Secret → copy into Supabase

### Step 4: Get Your Env Vars
In Supabase Dashboard → Settings → API, copy:
- **Project URL** → `PUBLIC_SUPABASE_URL`
- **anon/public key** → `PUBLIC_SUPABASE_ANON_KEY`
- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### Step 5: Local Development
Update `.env` with the real values:
```
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```
Then run `npm run dev` and test auth flow.

### Step 6: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and import the GitHub repo
2. Vercel auto-detects Astro — framework preset should be "Astro"
3. Add the three env vars from Step 4 in Vercel's Environment Variables settings
4. Deploy

After deployment, update your OAuth provider redirect URIs to also include your Vercel domain:
`https://your-app.vercel.app/auth/callback`

And in Supabase Dashboard → Authentication → URL Configuration:
- Set **Site URL** to `https://your-app.vercel.app`
- Add `https://your-app.vercel.app/auth/callback` to **Redirect URLs**

---

## Session 3 — 2026-02-15 — Workspace Redesign Phase 1

### Context
Ryan's first dogfooding session surfaced two blocking issues:
1. **Can't switch Bible translations.** `/app/read` auto-redirected to OEB-US (incomplete, 59/81 books). No way to access KJV 1611 or Douay-Rheims from the reading view.
2. **Reader and annotations are separate pages.** Selecting verses navigated to `/app/annotate`, losing reading context.

### Decision: Unified Split-Pane Workspace
**Owner: Ryan (vision) + Claude (implementation)**

Redesigned the reading experience as a "desk" where the Bible stays put and annotations live alongside it:
- Desktop (≥1024px): CSS grid split — reader 60%, annotations 40%
- Mobile (<1024px): single-column reader (annotation sidebar hidden, falls back to current flow — bottom sheet planned for Phase 4)

### Phase 1 Implementation (Complete)
**14 files changed, 870 insertions**

**New components (8 files):**
- `src/types/workspace.ts` — interfaces for shared workspace state
- `src/components/workspace/WorkspaceProvider.tsx` — React Context for state management
- `src/components/workspace/Workspace.tsx` — top-level split-pane orchestrator
- `src/components/workspace/WorkspaceToolbar.tsx` — breadcrumbs + translation picker
- `src/components/workspace/TranslationPicker.tsx` — dropdown to switch Bibles
- `src/components/workspace/ReaderPane.tsx` — wraps ChapterReader with workspace callbacks
- `src/components/workspace/AnnotationSidebar.tsx` — shows annotation list or editor
- `src/components/workspace/ChapterAnnotationList.tsx` — lists chapter annotations with edit

**Modified components (5 files):**
- `ChapterReader.tsx` — added optional callback props (`onVerseSelect`, `onNavigateChapter`, `annotatedVerses`). Backward-compatible: standalone mode still works via `<a href>` links.
- `AnnotationPanel.tsx` — added `onSaved(annotation)` and `onDeleted(id)` callbacks for in-place workspace updates.
- `AppLayout.astro` — added `fullWidth` prop to skip `max-w-7xl` container.
- `[...path].astro` — removed auto-redirect at `/app/read`, added translation picker grid, renders Workspace at chapter depth.
- `env.d.ts` — fixed pre-existing TS error: `supabase` local now correctly typed as nullable.

### Key Architecture Decisions
1. **URL remains source of truth** — `pushState` for chapter/translation switching without full reload.
2. **React Context, not external state library** — workspace state is ephemeral (selection, sidebar view) plus fetched data (annotations). No Redux/Zustand needed.
3. **ChapterReader backward-compatible** — `/app/annotate` still works unchanged.
4. **No external dependencies** — split-pane is pure CSS Grid.

### Remaining Phases
- **Phase 2:** Draggable divider, swap-sides, client-side pushState chapter nav, annotation dot indicators
- **Phase 3:** Floating/undockable annotation panel
- **Phase 4:** Mobile bottom sheet for annotations

### Bug Fix
- `src/env.d.ts`: `locals.supabase` was typed as non-nullable but middleware sets it to `null`. Fixed to `SupabaseClient | null`.

### Phase 2 Implementation (Complete)
**5 files changed, 298 lines added**

Items already shipped in Phase 1 (annotation dot indicators, pushState chapter nav) were skipped.

**New files (2):**
- `src/components/workspace/SplitPaneDivider.tsx` — draggable resize handle using pointer events + `setPointerCapture`. Keyboard accessible (arrow keys nudge 2%). Clamped to 30–70% range.
- `src/lib/workspace-prefs.ts` — localStorage persistence for split ratio + swap preference. Safe fallbacks for private browsing / SSR.

**Modified files (3):**
- `Workspace.tsx` — replaced static CSS grid with dynamic `gridTemplateColumns` driven by split ratio. Supports swapped pane order.
- `WorkspaceToolbar.tsx` — added swap-sides button with two-arrow icon. Desktop-only (hidden on mobile).
- `AnnotationSidebar.tsx` — removed hardcoded `border-l` since the divider now provides visual separation between panes.

---

## Session 3 (continued) — 2026-02-15 — Devotional Bible Assembly: Refined Vision

### Context
Ryan clarified the v3 Devotional Bible feature with sharper framing than the original Session 1 direction.

### Decision: Two Types of Devotional Bibles
**Owner: Ryan (product vision)**

1. **Original Devotional** — 100% of the annotations are the user's own work. Published under their name as CC0. Represents one person's coherent theological voice.
2. **Assembled Devotional** — curated from the public CC0 pool. Can mix the user's own annotations with other people's published annotations. Given a custom name. Also published as CC0.

Both types are first-class "Devotional Bibles." The distinction matters for:
- **Attribution/trust:** readers may value knowing a devotional is one person's original work vs. a curated remix.
- **Discoverability:** search/browse could filter by "original" vs. "assembled."
- **Forking:** an assembled devotional is inherently forkable (take some annotations out, add your own, publish as a new devotional).

### What This Means for the Data Model (v3, not implemented yet)
- A "Devotional Bible" is a named collection of annotation references, not copies.
- Each devotional tracks which annotations are the author's original vs. sourced from the CC0 pool.
- Publishing a devotional = publishing the collection metadata. The underlying annotations are already CC0.
- Forking = creating a new collection that starts as a copy of another, then diverges.

This refines the Session 1 direction: "users can search public annotations by verse/keyword and add to their collection... users can also publish entire devotional bibles that others can browse and fork/remix."

**No implementation work now.** This is v3 scope. Logged for future reference.

---

### Phase 3 Implementation (Complete)
**4 files changed, 290 lines added**

**New file (1):**
- `src/components/workspace/FloatingPanel.tsx` — `position: fixed` draggable window using pointer events + `setPointerCapture`. Viewport-clamped. Header bar for dragging with dock button. `role="dialog"` for accessibility.

**Modified files (3):**
- `Workspace.tsx` — undocked state: hides sidebar from split-pane grid, reader fills full width, `FloatingPanel` renders outside main container with `AnnotationSidebar` inside.
- `WorkspaceToolbar.tsx` — added pop-out/dock toggle button. Hides swap-sides button when undocked (irrelevant without split-pane).
- `workspace-prefs.ts` — added `undocked` boolean to persisted preferences.

---

## Session 3 (continued) — CC0 Publishing Intercession Page (v2 Scope)

### Context
Ryan wants a dedicated page that intercedes when a user first clicks "Make Public" on an annotation. Before the publish action goes through, the user should be educated on WHY the content becomes CC0.

### Decision: CC0 Philosophy Intercession Page
**Owner: Ryan (vision and theology)**

**When it appears:** First time a user taps "Make Public" on any annotation. Shows once (tracked via user profile flag), then silently proceeds on future publishes with a small reminder link.

**Content direction (Ryan's guidance):**
1. **George Washington Carver** — refused to patent his inventions, crediting them to God. "God gave them to me. How can I sell them to someone else?"
2. **Johann Sebastian Bach** — wrote "SDG" (Soli Deo Gloria) on every manuscript. His music was an offering, not a commodity.
3. **Open Source philosophy** — Linus Torvalds, the Free Software Foundation, and the principle that knowledge shared freely accelerates human progress.
4. **Broader pattern** — any historical examples of individuals and movements that treated knowledge/art as a gift to be shared, not a commodity to be hoarded.
5. **Christ's ethics** — the theological grounding. Freely you have received, freely give (Matthew 10:8).

**Tone:** Tier 1 Grandmother Principle. Inspiring, not preachy. "Here's why we do this" — not "you must agree." The user should feel *invited* to participate in something meaningful, not lectured.

**UX flow:**
1. User taps "Make Public" for the first time
2. Intercession page appears explaining CC0 + Christ's ethics + historical examples
3. User reads and taps "I understand — publish as CC0"
4. Annotation enters the moderation pipeline (AI screening → human review)
5. Future publishes skip the intercession (small "Why CC0?" link available)

**No implementation work now.** This is v2 scope (publishing pipeline). Logged for future reference.

**UPDATE:** The broader ethics content was implemented as a standalone public page at `/open-source-theology` (Session 3). The v2 intercession page will link to it and add the "I understand — publish as CC0" confirmation flow on top.

---

### Open Source Theology Page (Implemented)
Public page at `/open-source-theology`. Linked from AppNav ("Our Ethics") and landing page. Content follows Grandmother Principle scroll order: inspirational theology → practical ethics → technical documentation → AI transparency.

---

## Session 3 (continued) — Denomination Themes (Future Scope)

### Decision: Dark/Light Mode + Denomination Color Themes
**Owner: Ryan (vision) + Claude (implementation rationale)**

Ryan wants denomination-specific visual themes, each with light and dark variants. This gives users a reading experience that feels culturally familiar and reverential in their tradition.

#### Default Theme
| Mode | Background | Text | Accent | Rationale |
|------|-----------|------|--------|-----------|
| Light | White `#FFFFFF` | Gray-900 `#111827` | Blue-600 `#2563EB` | Current design. Neutral, clean, accessible. |
| Dark | Gray-950 `#030712` | Gray-100 `#F3F4F6` | Blue-400 `#60A5FA` | Standard dark mode. Reduced eye strain. |

#### Lutheran Theme
Rooted in the Reformation's emphasis on simplicity and the Word. Luther's rose seal uses white, red, blue, gold, and black — symbolizing faith, joy in the cross, heaven, and divine truth.

| Mode | Background | Text | Accent | Secondary | Rationale |
|------|-----------|------|--------|-----------|-----------|
| Light | Warm white `#FEFCF3` | Charcoal `#1C1917` | Deep red `#991B1B` | Gold `#A16207` | Rose seal red (blood of Christ) + gold (divine truth). Warm paper tone evokes printed hymnals. |
| Dark | Dark warm `#1C1917` | Cream `#FEF3C7` | Rose `#F87171` | Gold `#FBBF24` | Candlelit warmth. Red softened for dark backgrounds. Gold glows. |

#### Catholic Theme
Rooted in liturgical tradition. The Church uses purple (Advent/Lent), gold (solemnity), deep blue (Marian devotion), and white (feast days). Gothic cathedrals, illuminated manuscripts, and stained glass inform the aesthetic — reverent, rich, and ancient.

| Mode | Background | Text | Accent | Secondary | Rationale |
|------|-----------|------|--------|-----------|-----------|
| Light | Ivory `#FFFFF5` | Deep navy `#1E1B4B` | Royal purple `#6D28D9` | Gold `#B45309` | Liturgical purple (penance + royalty of Christ). Gold for solemnity. Ivory evokes vellum manuscripts. |
| Dark | Deep indigo `#1E1B4B` | Cream `#FEF9EF` | Soft purple `#A78BFA` | Warm gold `#F59E0B` | Cathedral at night. Stained glass glow. Purple luminous against deep blue-black. |

#### Orthodox Theme
Rooted in Byzantine iconographic tradition. Orthodox worship spaces use deep crimson, gold, forest green, and icon blue. The aesthetic is warm, ancient, and richly colored — ikons on aged wood, gold leaf mosaics, incense-darkened walls.

| Mode | Background | Text | Accent | Secondary | Rationale |
|------|-----------|------|--------|-----------|-----------|
| Light | Parchment `#FDF6E3` | Dark olive `#1A1C16` | Crimson `#B91C1C` | Forest green `#166534` | Ikon reds (Christ's divinity + sacrifice). Green (Holy Spirit, life). Parchment evokes ancient manuscripts. |
| Dark | Deep olive `#1A1C16` | Warm parchment `#FDF6E3` | Soft crimson `#EF4444` | Sage green `#4ADE80` | Dimly lit chapel. Gold-leafed ikons glowing in lamplight. Crimson softened, green vivified. |

#### Implementation Plan (Future — v2 or standalone)
1. CSS custom properties (variables) for all theme colors on `:root`
2. Theme selector in user settings (stored in localStorage + Supabase user profile)
3. `prefers-color-scheme` media query for auto dark/light, overridable by user
4. All existing Tailwind classes mapped to CSS variables (e.g., `bg-surface`, `text-primary`, `accent`)
5. Theme switch applies instantly via class toggle on `<html>` — no page reload
6. WCAG AAA contrast verified for every combination

**No implementation work now.** Logged for future reference.

---

## Session 3 (continued) — CC0 Intercession Carousel: "Those Who Gave Freely"

### Context
Ryan wants the v2 CC0 intercession page (shown before a user's first publish) to include a carousel of historical figures across the humanities who exemplify the ethic of giving divine gifts freely. The carousel keeps the page small but rewards curiosity — each card is a self-contained dedication the user can read or skip.

### Decision: Carousel Roster
**Owner: Ryan (vision, curation) + Claude (research, accuracy)**

Already on the main Open Source Theology page (full sections): **George Washington Carver** (science), **Johann Sebastian Bach** (music). Plus the existing wider tradition section: monastic scribes, Jonas Salk, William Tyndale, Tim Berners-Lee.

The carousel adds these figures — one per card, each a different discipline:

#### 1. Fra Angelico — Painting (c. 1395–1455)
Dominican friar who painted exclusively as an act of prayer. Prayed before every brushwork session. Wept while painting crucifixions. Took a vow of poverty — all work belonged to the order, never to him. When Pope John Paul II beatified him and was asked about miracles, the Pope pointed to his paintings: *"These are his miracles."*

> "To paint the things of Christ, one must live with Christ."

Named patron of artists by Pope John Paul II (1984).

#### 2. Andrei Rublev — Iconography (c. 1360–c. 1430)
Russian Orthodox iconographer. In the Orthodox tradition, sacred art belongs to God, not the artist — ikons are unsigned because the painter is a vessel, not a creator. Copies of a sacred ikon possess the same divinity as the original; the image transcends individual authorship. Rublev's *Trinity* ikon (c. 1410) was declared the model for all church painting by the 1551 Stoglavi Sobor and shaped 600 years of Orthodox theology. Canonized as a saint in 1988.

*(No surviving direct quotes — consistent with the tradition of anonymous devotion.)*

#### 3. Fanny Crosby — Hymns / Poetry (1820–1915)
Blind from six weeks old. Wrote over 8,000 hymns — "Blessed Assurance," "To God Be the Glory," "Pass Me Not, O Gentle Savior." Lived simply, gave most of her money away, and set out to witness to one million people through her music.

> "If perfect earthly sight were offered me tomorrow I would not accept it. I might not have sung hymns to the praise of God if I had been distracted by the beautiful and interesting things about me."

> "I never undertake a hymn without first asking the good Lord to be my inspiration."

#### 4. Antoni Gaudí — Architecture (1852–1926)
Spent the last 12 years of his life working exclusively on the Sagrada Família in Barcelona, taking no salary. Lived in the construction site, begged for donations to continue building, and intended it as "a cathedral for the poor." Died after being struck by a tram — so shabbily dressed that he was mistaken for a beggar. Buried in the crypt of his unfinished church, which is still being completed 100 years later.

> "My good friends are dead; I have no family and no clients, no fortune nor anything. Now I can dedicate myself entirely to the Church."

When asked about the timeline: *"My client is not in a hurry."* (Meaning God.)

#### 5. Ephrem the Syrian — Poetry / Theological Hymns (c. 306–373)
4th-century deacon who invented the theological hymn as a tool for teaching ordinary people. Wrote thousands of *madrāšê* (teaching hymns) and pioneered all-women choirs to sing them, making complex theology accessible through music. His work was practical theology for the church in troubled times — written to teach, not to be famous. Known as "the Harp of the Holy Spirit."

> "The boldness of our love is pleasing to you, O Lord, just as it pleased you that we should steal from your bounty."

#### 6. Leo Tolstoy — Literature (1828–1910)
One of the greatest novelists in history. In 1891, he officially renounced the copyrights to all works published after 1881, driven by his literal reading of the Sermon on the Mount. He believed art belonged to the people and that profiting from creative gifts contradicted Christ's teaching. His wife Sophia fought him bitterly over this decision — it caused real marital strife. He chose poverty and principle over comfort and family peace.

> "The Kingdom of God is within you."

(Title of his most influential theological work, which directly inspired Gandhi's nonviolent resistance movement.)

#### 7. Gerard Manley Hopkins — Poetry (1844–1889)
Jesuit priest. Less than a week after deciding to enter the Jesuits, he burned all his poetry and gave up writing for seven years. His superior later encouraged him to write again, but he refused to publish, believing it would distract from his vocation. His poems — some of the most innovative in English — were not published until 1918, 29 years after his death. He wrote as prayer, in secret, for an audience of God.

> "Thou mastering me / God! giver of breath and bread..."
> — opening of *The Wreck of the Deutschland*

### Carousel Implementation Notes (v2)
- Each card: name, discipline, dates, 2-3 sentence summary, one quote
- Swipeable on mobile, arrow-navigated on desktop
- Auto-advances slowly (8-10 seconds), pauses on hover/focus
- "Read more" link on each card goes to the full Open Source Theology page section
- Accessible: `role="region"` with `aria-roledescription="carousel"`, pause button, keyboard navigation
- No external dependencies — custom implementation with CSS scroll-snap

**No implementation work now.** This is v2 scope. Logged for future reference.

---

### Phase 4 Implementation (Complete)
**2 files changed, 254 lines added**

**New file (1):**
- `src/components/workspace/BottomSheet.tsx` — touch-driven bottom sheet with three snap points (peek 64px, half 50vh, full 90vh). Velocity-based flick detection (400px/s threshold). CSS transform animation with spring curve. SSR-safe viewport height via useState + useEffect.

**Modified file (1):**
- `Workspace.tsx` — added `MobileBottomSheet` inner component (consumes `useWorkspace()` for auto-expand on verse selection). Mobile section now wraps `AnnotationSidebar` inside `BottomSheet`.

**All 4 workspace phases now complete.**

---

### Bug Fix: Unstyled First-Load After Deployments (Service Worker Race)
**Root cause:** The service worker used Stale-While-Revalidate for HTML navigation requests. After a deployment, hashed asset filenames change (e.g., `annotate.ABC123.css` → `annotate.DEF456.css`). The SW served stale cached HTML that referenced the OLD CSS filename which no longer existed → 404 → unstyled page. Background revalidation then updated the cache, so the second load worked.

**Fix:** Three-tier caching strategy in `public/sw.js`:
1. **Navigation (HTML):** Network-First — always gets fresh HTML with correct asset hashes
2. **Hashed assets (`/_astro/*`):** Cache-First — content hash guarantees correctness
3. **Other static assets:** Stale-While-Revalidate (unchanged)

Bumped cache version `oeb-v1` → `oeb-v2` to force stale cache cleanup.

**Lesson learned:** Stale-While-Revalidate is dangerous for HTML that references hashed assets. The HTML must always be fresh so its `<link>`/`<script>` tags point to filenames that actually exist. Use Network-First for navigations, Cache-First for immutable hashed assets.

---

## Session 4 — 2026-02-16 — Workspace Tests + Offline Saves + v1 Audit

### Workspace Component Tests (55 new tests, 102 total)
Wrote comprehensive tests for all workspace components shipped in Phases 1-4.

**New test files (8):**
- `src/lib/workspace-prefs.test.ts` — 12 tests: load/save, clamping, corrupt data, merge behavior, storage unavailability
- `src/components/workspace/ChapterAnnotationList.test.tsx` — 11 tests: auth states, loading skeleton, empty state, annotation cards, verse labels, actions
- `src/components/workspace/WorkspaceToolbar.test.tsx` — 12 tests: breadcrumbs, dock/undock toggle, swap sides, translation picker
- `src/components/workspace/AnnotationSidebar.test.tsx` — 6 tests: list/editor view switching, back navigation, auth state
- `src/components/workspace/FloatingPanel.test.tsx` — 4 tests: dialog role, dock button, children rendering
- `src/components/workspace/BottomSheet.test.tsx` — 6 tests: dialog role, expand/minimize, children rendering
- `src/components/workspace/SplitPaneDivider.test.tsx` — 4 tests: ARIA separator role, keyboard accessibility

**Supporting infrastructure:**
- `__test-helpers.tsx` — `makeAnnotation()` factory + `defaultMockContext()` for mocking `useWorkspace`
- `src/test-setup.ts` — added `setPointerCapture`/`releasePointerCapture` stubs (jsdom doesn't implement Pointer Events API)
- `tsconfig.json` — added `vitest/globals` to `compilerOptions.types` so TS recognizes `describe/it/expect/vi`
- `@testing-library/user-event` installed for interaction testing

### v1 MVP Completeness Audit
Performed a full audit of v1 scope ("Bible reader + annotation creation + basic auth + save/load + PWA").

| Area | Status | Notes |
|------|--------|-------|
| Bible reader + workspace | ✅ Complete | 4-phase redesign done |
| Annotation CRUD | ✅ Complete | Create/read/update/delete with Supabase |
| Basic auth | ✅ Complete | Google/GitHub/Discord/Microsoft OAuth |
| Export | ✅ Complete | .md files + batch .zip with YAML frontmatter |
| Connection status | ✅ Complete | Offline banner + sync feedback |
| Error boundaries | ✅ Complete | Friendly error messages |
| Service worker | ✅ Complete | Three-tier caching strategy |
| Offline reading | ✅ Complete | Bible text cached by SW |
| Offline annotation | ✅ Complete | **Was broken — now fixed** |

### Offline Annotation Integration (Critical v1 Fix)
**Problem:** The IndexedDB store (`offline-store.ts`) and sync engine (`sync-engine.ts`) were fully implemented, but `AnnotationPanel` saved directly to Supabase, bypassing offline storage entirely. Offline saves would fail silently.

**Fix:** Modified `AnnotationPanel.handleSave()` and `handleDelete()`:
1. Check `navigator.onLine` before attempting Supabase call
2. If offline: save to IndexedDB via `saveAnnotationLocally()` + queue via `addToSyncQueue()`
3. If online save fails mid-request: fall back to offline save automatically
4. Generate client-side UUID with `crypto.randomUUID()` for new offline annotations
5. Return full Annotation object so workspace UI updates immediately (no visual difference between online and offline saves)

Delete follows the same pattern — marks the local record as `pending_delete` and queues the operation. `ConnectionStatus` component already calls `processSync()` when reconnecting, which will process the queue.

**v1 MVP is now feature-complete.**

---

## Session 5 — 2026-02-16 — First Dogfooding: Auth & Deployment Fixes

### Context
Ryan attempted to use the deployed site for the first time. Multiple blocking issues surfaced.

### Issues Found & Fixed

**1. Vercel Deployment Protection (config)**
The deployed site returned HTTP 401 for all visitors. Root cause: Vercel's Deployment Protection was enabled, adding its own authentication wall in front of the entire site. Fix: Ryan disabled it in Vercel dashboard settings.

**2. Auth redirect loop — reader required login (`05d2a31`)**
"Read the Bible" button sent users to `/app/read`, which had a client-side auth guard that redirected unauthenticated users to `/auth/signin`. Added `requireAuth` prop to `AppLayout` (default `true`), set to `false` for the reader page. Bible reading is now accessible without signing in.

**3. OAuth PKCE flow broken (`032384b`)**
Sign-in via OAuth silently failed. Root cause: `@supabase/ssr` v0.8.0 defaults to PKCE flow (`flowType: 'pkce'`), but the callback page expected implicit flow (hash-fragment tokens). The authorization code was never exchanged for a session. Fix: Rewrote `/auth/callback` as a server-side route that calls `supabase.auth.exchangeCodeForSession(code)` and sets auth cookies before redirecting.

**4. AppNav broken for unauthenticated users (`032384b`, `7ff9867`)**
AppNav always rendered user avatar + name + sign out — even for anonymous visitors. On the public reader page, this showed broken UI (null name, placeholder avatar, useless sign-out link). Fix: AppNav now checks `auth.isAuthenticated` and shows a "Sign in" button for anonymous users. Also replaced deprecated `getSession()` with `getUser()` and added `.catch()` to prevent unhandled rejections.

**5. Service worker clone bug (`8f4c0bd`)**
Console error: `Failed to execute 'clone' on 'Response': Response body is already used`. In `staleWhileRevalidate()`, `response.clone()` was called inside an async `caches.open().then()` callback — by which time the browser may have already consumed the response body. Fix: clone synchronously before the async cache operation.

### Lessons Learned
- **`@supabase/ssr` forces PKCE.** The `createBrowserClient` and `createServerClient` both default to `flowType: 'pkce'`. Comments in `supabase.ts` said "implicit flow" but that was wrong — the SSR package overrides it. Auth callbacks must exchange the code server-side.
- **Don't assume auth guards are free.** The client-side auth redirect on `AppLayout` was a blanket policy that blocked even public pages. Auth should be opt-in per route, not opt-out.
- **Clone before async.** When caching responses in a service worker, always `response.clone()` synchronously before any async operation. The browser can consume the response body at any time after it's returned from the fetch handler.
- **Vite cache can go stale.** When packages update, `node_modules/.vite/` may hold outdated pre-bundles. If components crash with mysterious errors like "jsxDEV is not a function", clearing the Vite cache (`rm -rf node_modules/.vite`) usually fixes it.

---

## Session 6 — 2026-02-17 — Export Formats & HTML-in-Markdown Security Model

### Context
Discussion about Markdown export formats and whether HTML-in-Markdown could enhance the annotation editor and exported devotional bibles.

### Decision: Multi-Format Export (v1 scope — data portability is a core principle)

Annotations are stored as Markdown internally. Export converts to the user's chosen format:

| Format | Use case | How |
|--------|----------|-----|
| `.md` (full) | Obsidian, Logseq, VS Code | Markdown + safe HTML tags intact |
| `.md` (clean) | Simpler markdown apps | HTML tags stripped, pure Markdown |
| `.txt` (plain) | Universal | All formatting stripped |
| `.pdf` (rendered) | GoodNotes, printing, sharing | Browser renders → PDF |
| `.html` (standalone) | Any browser | Full rendered page |

One stored format, five export options. Stripping tags is trivial; PDF/HTML is what the browser already does.

### Decision: The Grandmother Principle as Security Architecture

Key insight from Ryan: the three-tier comprehension model (Grandmother → Learner → Expert) naturally creates a security boundary for HTML content.

**How it works:**
1. **Grandmother (Tier 1 — web editor):** WYSIWYG buttons produce sanitized output. The editor controls what markup gets generated. No raw HTML input exists. A user clicks a highlighter icon → we store `<mark>text</mark>`. She never encounters or types HTML. **No XSS surface.**
2. **Expert/Coder (Tier 3 — downloaded file):** Downloads `.md`, edits locally with any text editor, can add whatever HTML they want. It's their file on their machine. **No security concern — it's local.**
3. **Re-publish boundary:** If a coder uploads an edited annotation back for publishing, server-side sanitization (`rehype-sanitize` with a safe-tag allowlist) strips anything dangerous before it reaches other users. This is the same boundary where the existing moderation pipeline sits (AI screening → human review).

**Safe HTML allowlist (editor-generated + permitted on re-publish):**
`<mark>`, `<details>`, `<summary>`, `<sup>`, `<sub>`, `<abbr>`, `<blockquote>`, `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`, `<br>`, `<hr>`

**Always stripped (even if submitted):**
`<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, `<input>`, `<style>`, `on*` event attributes, `javascript:` URLs

**Architectural note:** This means the sanitizer is a single enforcement point — it runs on all content before rendering to other users, regardless of whether it came from the web editor or a re-published local edit. The editor's WYSIWYG design is defense-in-depth (it can't produce dangerous output), but the sanitizer is the hard security boundary.

### App Compatibility Reference

| App | HTML-in-Markdown support | Best export format |
|-----|-------------------------|-------------------|
| Obsidian | Excellent — most safe HTML works | `.md` (full) |
| Logseq | Good — similar to Obsidian | `.md` (full) |
| VS Code | Full — renders everything | `.md` (full) |
| Notion | Strips HTML — own block system | `.md` (clean) |
| GoodNotes | None — handwriting/PDF app | `.pdf` |
| Apple Notes | None — basic rich text | `.txt` or `.pdf` |
| GitHub | Selective — `<details>`, `<sup>`, etc. | `.md` (full) |

---

## Cross-Device Test Matrix (for future QA phase)

### Decision (2026-02-23)
Ryan has a broad device collection covering every major platform. For a PWA, specific device models don't matter — what matters is browser engine, OS version, screen category, and input method. This matrix captures the meaningful test axes.

### Ryan's Available Devices
- macOS (desktop)
- Windows (desktop)
- iPadOS (tablet)
- iOS (phone)
- Android — Pixel (phone)
- Apple Watch, Pixel Watch (wearable — not a test target for this app)

### Test Matrix

| Device | Browser(s) | Engine | What it validates |
|--------|-----------|--------|-------------------|
| macOS | Safari | WebKit | Desktop WebKit rendering, Web Crypto API |
| macOS | Chrome | Blink | Desktop Chromium baseline |
| Windows | Chrome | Blink | Primary desktop target |
| Windows | Edge | Blink | Chromium variant, enterprise users |
| Windows | Firefox | Gecko | Third engine — catches WebKit/Blink assumptions |
| iPad | Safari | WebKit | Tablet viewport, touch input, PWA install |
| iPhone | Safari | WebKit | iOS WebKit (strictest engine), small viewport, PWA |
| Android (Pixel) | Chrome | Blink | Mobile Chromium, PWA install, offline/sync |

### Why this covers everything
- **All three browser engines**: Blink (Chrome/Edge), WebKit (Safari), Gecko (Firefox)
- **All input methods**: pointer (desktop), touch (phone/tablet)
- **All viewport categories**: small phone, large phone/tablet, desktop
- **PWA install paths**: iOS Safari, Android Chrome, desktop Chrome/Edge
- **The strictest environment**: iOS Safari — if it works there, it works everywhere

### Notes
- Watches are excluded — screen too small for a Bible reader app
- Linux native browser testing is unnecessary — same engines as above
- Actual testing happens against the Vercel deployment URL, not localhost

---

## Future: Client-Side Storage Monitoring (deferred)

### Context (2026-02-23)
Ryan asked whether we need a "storage low" alert for localStorage, with the ability to dump local data to the backend before it's lost.

### Current state
- **localStorage** (~5-10MB per origin): stores Supabase auth tokens and soft-deleted cross-reference records (tiny, self-cleaning via 48h expiry)
- **IndexedDB** (hundreds of MB): stores offline annotations and sync queue
- Current usage is negligible — nowhere near capacity limits

### When to revisit
This becomes relevant when we add heavier client-side storage:
- Cached Bible text for offline reading (could be several MB per translation)
- Local search indexes
- Cached public annotation feeds
- Any feature that stores user content client-side beyond small metadata

### Potential approach (not designed yet)
- Monitor `navigator.storage.estimate()` for quota usage
- Warn users when approaching limits (Tier 1 language: "Your device is running low on space for offline notes")
- Offer to sync/upload local data to Supabase before clearing
- Prioritize what to evict: cached Bible text first (re-downloadable), user content last (irreplaceable)

### Decision
Deferred until heavier offline features are built. Current localStorage usage is self-cleaning and minimal.

---

## Future: Keyboard Navigation & Command Palette (v2/v3)

### Vision (2026-02-23)
Ryan's target audience includes highly intelligent, technically-minded people who are typically a "hard sell" for traditional ministry outreach. These users live in terminals, use vim keybindings, and judge software by its respect for their workflow. A Bible app that speaks their language — command palettes, modal navigation, customizable keybinds — signals "this was built by someone who gets it."

This isn't just a power-user feature. It's an evangelism strategy: **meet the prideful intellectual where they live, in their tools.**

### Core Features

#### 1. Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
- VSCode-style fuzzy search over all available actions
- Actions: navigate to book/chapter, search annotations, toggle panels, open settings, export, etc.
- Discoverable: shows keyboard shortcuts next to each action
- Grandmother-safe: hidden unless invoked. No interference with normal mouse/touch usage.
- Implementation: a React overlay component with a fuzzy-match search input, registered commands array

#### 2. Keybinding Presets
Three built-in presets:
- **Default** — minimal shortcuts, browser-standard. Grandmother-friendly.
- **VSCode** — `Ctrl+P` quick-open, `Ctrl+Shift+P` command palette, `Ctrl+/` toggle annotation panel, `Ctrl+S` save, arrow keys for navigation
- **Vim** — modal navigation. `j`/`k` scroll or move between verses, `gg`/`G` top/bottom of chapter, `/` search, `n`/`N` next/prev result, `o` open annotation on current verse, `gn`/`gp` next/prev chapter. `:` opens command palette. `Esc` returns to normal mode.

#### 3. Intelligent Keybind Detection
**This is the key differentiator.** The site passively listens for input patterns that suggest the user is trying vim or VSCode shortcuts:
- Detected patterns: pressing `j`/`k` outside a text input, typing `:wq` or `:q`, pressing `Ctrl+Shift+P`, hitting `Esc` repeatedly, `/` outside an input
- On detection, show a subtle, non-intrusive toast:
  - Tier 1 version: "Looks like you use keyboard shortcuts! Want to turn them on?" with a one-click enable
  - Tier 2 version: "We detected Vim-style navigation. Enable Vim keybindings?" with a link to keybinding settings
  - Tier 3 version: (in settings) Full keybinding customization, import/export, preset switching
- Detection state stored in localStorage so we only prompt once. If dismissed, don't ask again for 30 days.
- **Privacy note:** No keystrokes are logged or transmitted. Detection runs entirely client-side.

#### 4. Per-User Custom Keybindings
- Stored in Supabase `user_preferences` table (new, needed for other settings too)
- Schema: `{ user_id, keybind_preset: 'default' | 'vscode' | 'vim' | 'custom', custom_bindings: jsonb }`
- RLS: users can only read/write their own preferences
- Syncs across devices (sign in on laptop → same keybinds on tablet)
- Falls back to localStorage for unauthenticated users

#### 5. Import Keybindings from VSCode/Vim
- **VSCode**: User uploads their `keybindings.json` file. We parse it, identify commands that map to OEB actions (e.g., `editor.action.find` → our search, `workbench.action.quickOpen` → our command palette), and show a preview of what will be imported.
- **Vim**: User uploads their `.vimrc` or provides key mappings. We parse `nmap`/`nnoremap` lines and map them to OEB actions.
- **AI evaluation layer**: For mappings that don't have an obvious OEB equivalent, an AI pass suggests the closest match. User confirms or skips each suggestion. This runs client-side or via a lightweight API endpoint — no keybinding data is stored beyond what the user approves.
- **Export**: Users can export their custom keybindings as JSON for backup or sharing.

### Architecture Design

#### Command Registry
```
interface Command {
  id: string;              // e.g., "navigate.nextChapter"
  label: string;           // "Go to next chapter"
  category: string;        // "Navigation" | "Annotation" | "Search" | "View"
  execute: () => void;     // What happens when the command runs
  when?: () => boolean;    // Condition for when the command is available
}
```

All keybindings map to command IDs, not directly to functions. This decouples shortcuts from behavior — the same command can be triggered by a keybind, the command palette, or a button click.

#### Keybinding Resolution
```
interface Keybinding {
  key: string;           // e.g., "ctrl+shift+p", "j", ":wq"
  command: string;        // Command ID
  when?: string;          // Context: "normalMode", "editorFocused", etc.
  mode?: "vim-normal" | "vim-insert" | "vim-command" | "always";
}
```

Resolution order (highest priority first):
1. User custom bindings
2. Active preset (vim/vscode/default)
3. Browser defaults (never override `Ctrl+C`, `Ctrl+V`, `Ctrl+T`, etc.)

#### Vim Mode State Machine
```
States: normal → insert → command → visual (future)
Transitions:
  normal + i/a/o → insert
  insert + Esc → normal
  normal + : → command (command palette opens with ":" prefix)
  command + Esc → normal
  command + Enter → execute → normal
```

A visual mode indicator appears in the bottom-left corner (like vim's `-- INSERT --` or `-- NORMAL --`) when vim mode is active.

#### Bible Reader Navigation Commands
| Command ID | Default | VSCode | Vim (normal) | Description |
|-----------|---------|--------|-------------|-------------|
| nav.nextVerse | ↓ | ↓ | j | Move to next verse |
| nav.prevVerse | ↑ | ↑ | k | Move to previous verse |
| nav.nextChapter | → | Alt+→ | Ctrl+f / ]] | Next chapter |
| nav.prevChapter | ← | Alt+← | Ctrl+b / [[ | Previous chapter |
| nav.firstVerse | Home | Ctrl+Home | gg | Jump to first verse |
| nav.lastVerse | End | Ctrl+End | G | Jump to last verse |
| nav.goTo | — | Ctrl+G | : + number | Jump to verse number |
| search.open | Ctrl+F | Ctrl+F | / | Open search |
| search.next | — | F3 | n | Next search result |
| search.prev | — | Shift+F3 | N | Previous search result |
| annotation.open | Enter | Ctrl+/ | o | Open annotation on current verse |
| annotation.save | — | Ctrl+S | :w | Save current annotation |
| palette.open | — | Ctrl+Shift+P | : | Open command palette |
| view.togglePanel | — | Ctrl+B | Ctrl+\ | Toggle annotation panel |

### Keybind Detection Heuristics
| Pattern | Suggests | Confidence |
|---------|----------|------------|
| `j`/`k` pressed outside input | Vim | High (very distinctive) |
| `:` pressed outside input | Vim | Medium |
| `Esc` pressed 2+ times | Vim | Medium |
| `:wq` or `:q` sequence | Vim | Very high |
| `Ctrl+Shift+P` | VSCode | Very high |
| `Ctrl+P` | VSCode | High |
| `Ctrl+K` then another key | VSCode (chord) | High |

Require 2+ signals before prompting to avoid false positives from accidental keypresses.

### Dependencies
- New Supabase table: `user_preferences` (user_id, keybind_preset, custom_bindings, etc.)
- New RLS policies for user_preferences
- React context for keybinding state (active preset, current vim mode)
- Event listener system that captures keyboard events before they reach components

### Version Scoping
- **v2**: Command palette + default/vscode/vim presets + detection/prompting + per-user storage in Supabase
- **v3**: Custom keybinding editor + VSCode/Vim config import + AI mapping evaluation + export/share

### Open Questions (to resolve before building)
1. Should vim normal mode highlight the "current verse" with a visible cursor/highlight? (Probably yes — vim without a cursor feels broken.)
2. How should keybindings interact with the markdown editor? (Editor has its own shortcuts — need to pass through when editor is focused.)
3. Should the command palette support "recently used" ordering? (Nice-to-have, low effort.)
4. Mobile: command palette via swipe gesture? Or strictly keyboard-only? (Keyboard-only for v2, revisit for v3.)

---

## Session 7 — 2026-02-23 — Translation Toggles & Site Rename Discussion

### Site Name

Working title changed to **"The Open Bible Ministry"**. Project internal names (repo, code references) stay as-is for now.

### Translation Toggles (Implemented — v1 "Easy" Swaps)

Added user-controllable word-swap toggles that modify Bible verse text at render time. Four toggles, all simple find-and-replace:

| Toggle          | Default        | Alternate     | Why it matters                                              |
| --------------- | -------------- | ------------- | ----------------------------------------------------------- |
| God's name      | LORD           | Yahweh        | YHWH is transliterated differently across traditions        |
| Baptize/immerse | Baptize        | Immerse       | Greek *baptizo* literally means "immerse"                   |
| Church/assembly | Church         | Assembly      | Greek *ekklesia* means "assembly/gathering"                 |
| Only begotten   | Only begotten  | One and only  | Greek *monogenes* debate: procreation vs. uniqueness        |

**Architecture**: Preferences in localStorage (`oeb-translation-toggles`), pure text transform function (`applyTranslationToggles`), UI popover in WorkspaceToolbar, applied at render time in ChapterReader.

**Known edge case**: "JESUS IS LORD" (Romans 10:9 etc.) matches the divine name toggle even though it's *kyrios* not YHWH. Documented in code — would need per-verse metadata to fix.

### Deferred Translation Toggles (Later Versions — Context-Dependent)

These toggles require per-verse metadata or more complex logic than simple word replacement. **Planned for late-stage implementation (v3+).**

| Toggle                 | Default    | Alternate                | Why it's hard                                                                                        |
| ---------------------- | ---------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| Hell / afterlife terms | "hell"     | Gehenna / Hades / Sheol  | Three different original-language concepts all flattened to "hell" — need per-verse mapping           |
| Brothers / siblings    | "brothers" | "brothers and sisters"   | Context-dependent: Greek *adelphoi* sometimes means male siblings, sometimes mixed groups            |
| Virgin / young woman   | "virgin"   | "young woman"            | Isaiah 7:14 *almah* debate — only relevant in a handful of specific verses, not a global swap        |
| Servant / slave        | "servant"  | "slave"                  | Greek *doulos* — context matters (metaphorical vs. literal), cultural connotations make blanket swap problematic |

### WEB Translation Research

Identified the **World English Bible (WEB)** as the best candidate for a new default translation:

- Complete (all 66 books), modern English, fully public domain
- Available with deuterocanonical books from eBible.org
- Uses "Yahweh" for God's name (our toggle handles this)
- **Decision**: Add WEB as a translation option and consider making it the default. Not yet implemented — separate task.

### Bug Fixes This Session

- **Ezekiel 1:2 curly brackets**: The OEB source USFM has `{ }` as a placeholder for untranslated verses. Added `isPlaceholderVerse()` detection in ChapterReader to show "(verse not yet translated)" instead of raw brackets.

---

## Session 8 — 2026-02-25 — Verse Citations, Humble Materials, Settings Architecture

### Verse Citation Feature (Implemented)

Added a "Cite a verse" popover to the annotation editor that lets users insert styled Markdown blockquotes from their anchor or cross-reference verses. Word-by-word trim with leading/trailing ellipsis. Output is standard Markdown (`> **Genesis 1:3** — ...text...`). No database changes — pure Humble Materials.

**Files created:** `VerseCitePicker.tsx`, `VerseCitePicker.test.tsx` (16 tests)
**Files modified:** `MarkdownEditor.tsx` (added `extraToolbarSlot` render prop), `AnnotationPanel.tsx` (wired picker), `global.css` (blockquote styling)

### "Humble Materials" Principle Refined

Ryan clarified the intent: the constraint is on the **export format**, not the database. The database can be as sophisticated as needed for a modern PWA. The export pipeline filters out non-portable stuff and produces clean `.md` files. Updated CLAUDE.md Architecture Principle #3 accordingly.

### Design Discussion: User Settings & Offline Bible Downloads

**Context:** Ryan asked about PWA data usage. Current Bible caching is on-demand (Cache-First per chapter, ~5 KB each, no pre-downloading). Ryan wants users to be able to choose which translations to pre-download for offline use, with a storage estimate.

**Agreed architecture:**

#### Settings page (`/app/settings`)

- **One page to rule them all.** Every user preference lives here.
- Accessible only to signed-in users.
- Contains (at minimum):
  - Translation toggles (currently in toolbar popover, localStorage only)
  - Reader font preference (currently localStorage only)
  - Default Bible translation
  - **Offline Bible downloads** — user selects which translations to pre-cache, with storage estimate before committing. Eventually includes "offline devotionals" too.
  - Account info (email, connected OAuth providers)
  - Export all data

#### Public profile (future)

- Separate page (`/profile/{username}` or similar) — what other people see.
- Contents TBD — Ryan will outline later.
- The settings page lives "behind" this — the private counterpart.

#### Preference sync (`user_preferences` table)

- **New Supabase table** needed: stores all user preferences so they roam across devices.
- Current localStorage preferences (translation toggles, reader font, workspace layout) migrate to Supabase.
- localStorage becomes the fallback for unauthenticated users and the offline cache.
- RLS: users can only read/write their own preferences.

#### Offline Bible download feature

- User picks translations → we calculate total size from manifest data (chapter count × ~5 KB average).
- Show "This will use approximately X MB" before downloading.
- Service worker handles the bulk download, stores in the existing `oeb-bibles-v1` cache.
- Settings page shows current cache usage and lets users manage (add/remove translations).
- On-demand caching continues to work alongside — if a user reads a chapter from a non-downloaded translation, it still caches that chapter individually.

**Status:** Design discussion only. Not yet scoped to a version or scheduled for implementation.

### Future: Supplementary Theological Texts (Catechisms, Confessions)

**Context:** Ryan asked about adding catechisms (Lutheran, Catholic, Orthodox) as supplementary reference material alongside Bible text.

**Copyright research:**

| Text | Date | Public Domain? | Notes |
| ------ | ------ | --------------- | ------- |
| Roman Catechism (Council of Trent) | 1566 | Yes | Full PDF freely available |
| Luther's Small Catechism (pre-1923 translations) | 1529/1912 | Yes | 1986 LCMS translation is copyrighted by Concordia Publishing House |
| Heidelberg Catechism | 1563 | Yes | Reformed/Presbyterian |
| St. Philaret's Longer Catechism | 1823/1845 | Yes | Orthodox. English translation in public domain |
| Catechism of the Catholic Church (CCC, 1992) | 1992 | **No** | USCCB controls rights; >5,000 words requires permission |
| Luther's Small Catechism (1986 LCMS) | 1986 | **No** | Concordia Publishing House copyright |

**Key insight:** All historical catechisms are public domain. Modern ones are locked. AI-generated modernizations of public domain originals would be new creative works we'd own and CC0 — producing the first freely-licensed modern-English catechisms for each tradition.

**Pipeline:** AI produces modern English draft → theological review by tradition-knowledgeable reviewers → publish as CC0.

**Architecture:** Same static JSON pattern as Bible text, same caching, same offline capability. Catechisms are much smaller than Bibles (~100 pages max).

**Status:** Distant future. Ryan is focused on building the core platform and personally studying scripture before taking on theological reference material. This requires significant manual review effort that isn't justified until the site is mature and Ryan has the bandwidth. Logged for when the time comes.

---
