/**
 * Bible data types — defines the shape of Bible text loaded from
 * static JSON files in /public/bibles/.
 *
 * Supports Protestant (66 books), Catholic (73 books), and Orthodox
 * canons. Translations declare which books they include via their
 * manifest. The UI adapts accordingly.
 */

/**
 * Three-letter book identifiers following a simplified scheme.
 * Using short IDs keeps verse references compact (e.g., "oeb-us:jhn:3:16").
 *
 * This list covers the broadest canon (Orthodox) so any translation
 * can be represented. Individual translations only use a subset.
 */
export type BookId =
  // ── Old Testament (39 books — shared by all canons) ──
  | "gen" | "exo" | "lev" | "num" | "deu"
  | "jos" | "jdg" | "rut" | "1sa" | "2sa"
  | "1ki" | "2ki" | "1ch" | "2ch" | "ezr"
  | "neh" | "est" | "job" | "psa" | "pro"
  | "ecc" | "sng" | "isa" | "jer" | "lam"
  | "ezk" | "dan" | "hos" | "jol" | "amo"
  | "oba" | "jon" | "mic" | "nah" | "hab"
  | "zep" | "hag" | "zec" | "mal"
  // ── Deuterocanon (Catholic + Orthodox additions) ──
  // These are interspersed in the OT in traditional western ordering,
  // but grouped here for clarity in the type definition.
  | "tob"   // Tobit
  | "jdt"   // Judith
  | "ade"   // Additions to Esther (or Greek Esther)
  | "wis"   // Wisdom of Solomon
  | "sir"   // Sirach (Ecclesiasticus)
  | "bar"   // Baruch (includes Letter of Jeremiah as ch. 6)
  | "add"   // Additions to Daniel (Prayer of Azariah, Susanna, Bel & Dragon)
  | "1ma"   // 1 Maccabees
  | "2ma"   // 2 Maccabees
  // ── Orthodox extras ──
  | "1es"   // 1 Esdras
  | "pma"   // Prayer of Manasseh
  | "p15"   // Psalm 151
  | "3ma"   // 3 Maccabees
  | "4ma"   // 4 Maccabees (appendix in some traditions)
  | "2es"   // 2 Esdras (4 Esdras in Vulgate numbering)
  // ── New Testament (27 books — shared by all canons) ──
  | "mat" | "mrk" | "luk" | "jhn" | "act"
  | "rom" | "1co" | "2co" | "gal" | "eph"
  | "php" | "col" | "1th" | "2th" | "1ti"
  | "2ti" | "tit" | "phm" | "heb" | "jas"
  | "1pe" | "2pe" | "1jn" | "2jn" | "3jn"
  | "jud" | "rev";

/**
 * A canonical verse reference. This is the "address" format used throughout
 * the app to point to a specific verse: "translation:book:chapter:verse"
 * Example: { translation: "oeb-us", book: "jhn", chapter: 3, verse: 16 }
 */
export interface VerseRef {
  translation: string;
  book: BookId;
  chapter: number;
  verse: number;
}

/** A single verse of Bible text with its number and content. */
export interface Verse {
  number: number;
  text: string;
}

/**
 * One chapter's worth of Bible data — this is what gets loaded from
 * a single JSON file like /public/bibles/oeb-us/jhn/3.json
 */
export interface ChapterData {
  translation: string;
  book: BookId;
  bookName: string;
  chapter: number;
  verses: Verse[];
}

/**
 * Which section of the Bible a book belongs to.
 * - OT: Old Testament (shared by all traditions)
 * - DC: Deuterocanon / Apocrypha (Catholic & Orthodox)
 * - NT: New Testament (shared by all traditions)
 */
export type Testament = "OT" | "DC" | "NT";

/** Metadata for a single book within a translation. */
export interface BookInfo {
  id: BookId;
  name: string;
  chapters: number;
  testament: Testament;
}

/**
 * The manifest.json for a Bible translation. Lists all available books
 * and their chapter counts so the UI can build navigation without
 * loading every chapter file.
 */
export interface TranslationManifest {
  translation: string;
  name: string;
  language: string;
  license: string;
  books: BookInfo[];
}
