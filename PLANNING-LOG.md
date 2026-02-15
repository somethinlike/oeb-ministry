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

---
