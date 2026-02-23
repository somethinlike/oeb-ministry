/**
 * Application-wide constants. Centralized here so there's one source
 * of truth for magic strings and configuration values.
 *
 * Book ordering follows the traditional Western canon with deuterocanonical
 * books interspersed in the OT where Catholic/Orthodox traditions place them.
 * Translations that don't include these books simply skip them in the UI.
 */

import type { BookId, BookInfo } from "../types/bible";

/** Base path for static Bible JSON files served from /public/ */
export const BIBLE_BASE_PATH = "/bibles";

/**
 * Translations we support, sorted with apocrypha-inclusive editions first.
 * Each has a directory under BIBLE_BASE_PATH.
 * The `hasApocrypha` flag controls sort priority in the picker.
 */
export const SUPPORTED_TRANSLATIONS = [
  {
    id: "oeb-us",
    abbreviation: "OEB",
    name: "Open English Bible (US)",
    license: "CC0 / Public Domain",
    hasApocrypha: false,
    isDefault: true,
  },
  {
    id: "kjv1611",
    abbreviation: "KJV",
    name: "King James Version (1611)",
    license: "Public Domain",
    hasApocrypha: true,
    isDefault: false,
  },
  {
    id: "dra",
    abbreviation: "DRA",
    name: "Douay-Rheims American Edition",
    license: "Public Domain",
    hasApocrypha: true,
    isDefault: false,
  },
] as const;

/** The default translation shown when a user first opens the reader. */
export const DEFAULT_TRANSLATION = "oeb-us";

/**
 * Regex for validating canonical verse references.
 * Format: "translation:book:chapter:verse"
 * Examples: "oeb-us:jhn:3:16", "web:gen:1:1"
 */
export const VERSE_REF_REGEX = /^[a-z0-9-]+:[a-z0-9]+:\d+:\d+$/;

/**
 * Complete list of Bible books in traditional Western order.
 *
 * Deuterocanonical books (testament: "DC") are placed where Catholic
 * tradition positions them — after Nehemiah for the historical books,
 * after Song of Solomon for the wisdom books, and after Lamentations
 * for the prophetic books.
 *
 * Translations declare which books they include. The BookPicker
 * filters this list based on the active translation's manifest.
 */
export const BOOKS: readonly BookInfo[] = [
  // ── Old Testament ──
  { id: "gen", name: "Genesis", chapters: 50, testament: "OT" },
  { id: "exo", name: "Exodus", chapters: 40, testament: "OT" },
  { id: "lev", name: "Leviticus", chapters: 27, testament: "OT" },
  { id: "num", name: "Numbers", chapters: 36, testament: "OT" },
  { id: "deu", name: "Deuteronomy", chapters: 34, testament: "OT" },
  { id: "jos", name: "Joshua", chapters: 24, testament: "OT" },
  { id: "jdg", name: "Judges", chapters: 21, testament: "OT" },
  { id: "rut", name: "Ruth", chapters: 4, testament: "OT" },
  { id: "1sa", name: "1 Samuel", chapters: 31, testament: "OT" },
  { id: "2sa", name: "2 Samuel", chapters: 24, testament: "OT" },
  { id: "1ki", name: "1 Kings", chapters: 22, testament: "OT" },
  { id: "2ki", name: "2 Kings", chapters: 25, testament: "OT" },
  { id: "1ch", name: "1 Chronicles", chapters: 29, testament: "OT" },
  { id: "2ch", name: "2 Chronicles", chapters: 36, testament: "OT" },
  { id: "ezr", name: "Ezra", chapters: 10, testament: "OT" },
  { id: "neh", name: "Nehemiah", chapters: 13, testament: "OT" },
  // ── Deuterocanon: Historical books (Catholic/Orthodox placement) ──
  { id: "tob", name: "Tobit", chapters: 14, testament: "DC" },
  { id: "jdt", name: "Judith", chapters: 16, testament: "DC" },
  { id: "ade", name: "Additions to Esther", chapters: 6, testament: "DC" },
  { id: "est", name: "Esther", chapters: 10, testament: "OT" },
  { id: "1ma", name: "1 Maccabees", chapters: 16, testament: "DC" },
  { id: "2ma", name: "2 Maccabees", chapters: 15, testament: "DC" },
  // ── OT continued: Wisdom books ──
  { id: "job", name: "Job", chapters: 42, testament: "OT" },
  { id: "psa", name: "Psalms", chapters: 150, testament: "OT" },
  { id: "p15", name: "Psalm 151", chapters: 1, testament: "DC" },
  { id: "pro", name: "Proverbs", chapters: 31, testament: "OT" },
  { id: "ecc", name: "Ecclesiastes", chapters: 12, testament: "OT" },
  { id: "sng", name: "Song of Solomon", chapters: 8, testament: "OT" },
  // ── Deuterocanon: Wisdom books ──
  { id: "wis", name: "Wisdom of Solomon", chapters: 19, testament: "DC" },
  { id: "sir", name: "Sirach", chapters: 51, testament: "DC" },
  // ── OT continued: Major prophets ──
  { id: "isa", name: "Isaiah", chapters: 66, testament: "OT" },
  { id: "jer", name: "Jeremiah", chapters: 52, testament: "OT" },
  { id: "lam", name: "Lamentations", chapters: 5, testament: "OT" },
  // ── Deuterocanon: Prophetic additions ──
  { id: "bar", name: "Baruch", chapters: 6, testament: "DC" },
  { id: "add", name: "Additions to Daniel", chapters: 3, testament: "DC" },
  // ── OT continued: Major + minor prophets ──
  { id: "ezk", name: "Ezekiel", chapters: 48, testament: "OT" },
  { id: "dan", name: "Daniel", chapters: 12, testament: "OT" },
  { id: "hos", name: "Hosea", chapters: 14, testament: "OT" },
  { id: "jol", name: "Joel", chapters: 3, testament: "OT" },
  { id: "amo", name: "Amos", chapters: 9, testament: "OT" },
  { id: "oba", name: "Obadiah", chapters: 1, testament: "OT" },
  { id: "jon", name: "Jonah", chapters: 4, testament: "OT" },
  { id: "mic", name: "Micah", chapters: 7, testament: "OT" },
  { id: "nah", name: "Nahum", chapters: 3, testament: "OT" },
  { id: "hab", name: "Habakkuk", chapters: 3, testament: "OT" },
  { id: "zep", name: "Zephaniah", chapters: 3, testament: "OT" },
  { id: "hag", name: "Haggai", chapters: 2, testament: "OT" },
  { id: "zec", name: "Zechariah", chapters: 14, testament: "OT" },
  { id: "mal", name: "Malachi", chapters: 4, testament: "OT" },
  // ── Orthodox extras (placed after Malachi, before NT) ──
  { id: "1es", name: "1 Esdras", chapters: 9, testament: "DC" },
  { id: "2es", name: "2 Esdras", chapters: 16, testament: "DC" },
  { id: "pma", name: "Prayer of Manasseh", chapters: 1, testament: "DC" },
  { id: "3ma", name: "3 Maccabees", chapters: 7, testament: "DC" },
  { id: "4ma", name: "4 Maccabees", chapters: 18, testament: "DC" },
  // ── New Testament ──
  { id: "mat", name: "Matthew", chapters: 28, testament: "NT" },
  { id: "mrk", name: "Mark", chapters: 16, testament: "NT" },
  { id: "luk", name: "Luke", chapters: 24, testament: "NT" },
  { id: "jhn", name: "John", chapters: 21, testament: "NT" },
  { id: "act", name: "Acts", chapters: 28, testament: "NT" },
  { id: "rom", name: "Romans", chapters: 16, testament: "NT" },
  { id: "1co", name: "1 Corinthians", chapters: 16, testament: "NT" },
  { id: "2co", name: "2 Corinthians", chapters: 13, testament: "NT" },
  { id: "gal", name: "Galatians", chapters: 6, testament: "NT" },
  { id: "eph", name: "Ephesians", chapters: 6, testament: "NT" },
  { id: "php", name: "Philippians", chapters: 4, testament: "NT" },
  { id: "col", name: "Colossians", chapters: 4, testament: "NT" },
  { id: "1th", name: "1 Thessalonians", chapters: 5, testament: "NT" },
  { id: "2th", name: "2 Thessalonians", chapters: 3, testament: "NT" },
  { id: "1ti", name: "1 Timothy", chapters: 6, testament: "NT" },
  { id: "2ti", name: "2 Timothy", chapters: 4, testament: "NT" },
  { id: "tit", name: "Titus", chapters: 3, testament: "NT" },
  { id: "phm", name: "Philemon", chapters: 1, testament: "NT" },
  { id: "heb", name: "Hebrews", chapters: 13, testament: "NT" },
  { id: "jas", name: "James", chapters: 5, testament: "NT" },
  { id: "1pe", name: "1 Peter", chapters: 5, testament: "NT" },
  { id: "2pe", name: "2 Peter", chapters: 3, testament: "NT" },
  { id: "1jn", name: "1 John", chapters: 5, testament: "NT" },
  { id: "2jn", name: "2 John", chapters: 1, testament: "NT" },
  { id: "3jn", name: "3 John", chapters: 1, testament: "NT" },
  { id: "jud", name: "Jude", chapters: 1, testament: "NT" },
  { id: "rev", name: "Revelation", chapters: 22, testament: "NT" },
] as const;

/** Quick lookup: book ID → BookInfo. Avoids scanning the array every time. */
export const BOOK_BY_ID: ReadonlyMap<BookId, BookInfo> = new Map(
  BOOKS.map((book) => [book.id, book])
);

/** Set of all valid book IDs for fast validation. */
export const VALID_BOOK_IDS: ReadonlySet<string> = new Set(
  BOOKS.map((book) => book.id)
);
