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
