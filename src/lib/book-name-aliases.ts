/**
 * Book name aliases — maps human-readable book names (and their many
 * variants) to canonical BookId values.
 *
 * Used by the Bible parsers (EPUB, text) to resolve book names from
 * uploaded files. Bible translations use wildly inconsistent naming:
 * "Genesis", "Gen", "Gen.", "1 Samuel", "I Samuel", "First Samuel",
 * "1Sam", etc. This map covers ~300 common variants.
 *
 * All keys are lowercase. Lookup is case-insensitive via lowercasing input.
 */

import type { BookId } from "../types/bible";

/**
 * Map of lowercase book name variants → canonical BookId.
 *
 * Organized by book for maintainability. Each book has:
 * - Full canonical name
 * - Common abbreviations (with and without periods)
 * - Numbered variants (1/2/3, I/II/III, First/Second/Third)
 */
export const BOOK_NAME_ALIASES: ReadonlyMap<string, BookId> = new Map<string, BookId>([
  // ── Old Testament ──

  // Genesis
  ["genesis", "gen"], ["gen", "gen"], ["gen.", "gen"], ["gn", "gen"],

  // Exodus
  ["exodus", "exo"], ["exod", "exo"], ["exod.", "exo"], ["exo", "exo"], ["ex", "exo"], ["ex.", "exo"],

  // Leviticus
  ["leviticus", "lev"], ["lev", "lev"], ["lev.", "lev"], ["lv", "lev"],

  // Numbers
  ["numbers", "num"], ["num", "num"], ["num.", "num"], ["nm", "num"], ["numb", "num"],

  // Deuteronomy
  ["deuteronomy", "deu"], ["deut", "deu"], ["deut.", "deu"], ["deu", "deu"], ["dt", "deu"],

  // Joshua
  ["joshua", "jos"], ["josh", "jos"], ["josh.", "jos"], ["jos", "jos"],

  // Judges
  ["judges", "jdg"], ["judg", "jdg"], ["judg.", "jdg"], ["jdg", "jdg"], ["jgs", "jdg"],

  // Ruth
  ["ruth", "rut"], ["rut", "rut"], ["ru", "rut"],

  // 1 Samuel
  ["1 samuel", "1sa"], ["1samuel", "1sa"], ["1 sam", "1sa"], ["1sam", "1sa"],
  ["1 sam.", "1sa"], ["1sam.", "1sa"],
  ["i samuel", "1sa"], ["i sam", "1sa"], ["i sam.", "1sa"],
  ["first samuel", "1sa"], ["first sam", "1sa"],
  ["1sa", "1sa"],

  // 2 Samuel
  ["2 samuel", "2sa"], ["2samuel", "2sa"], ["2 sam", "2sa"], ["2sam", "2sa"],
  ["2 sam.", "2sa"], ["2sam.", "2sa"],
  ["ii samuel", "2sa"], ["ii sam", "2sa"], ["ii sam.", "2sa"],
  ["second samuel", "2sa"], ["second sam", "2sa"],
  ["2sa", "2sa"],

  // 1 Kings
  ["1 kings", "1ki"], ["1kings", "1ki"], ["1 kgs", "1ki"], ["1kgs", "1ki"],
  ["1 ki", "1ki"], ["1ki", "1ki"],
  ["i kings", "1ki"], ["i kgs", "1ki"],
  ["first kings", "1ki"], ["first kgs", "1ki"],

  // 2 Kings
  ["2 kings", "2ki"], ["2kings", "2ki"], ["2 kgs", "2ki"], ["2kgs", "2ki"],
  ["2 ki", "2ki"], ["2ki", "2ki"],
  ["ii kings", "2ki"], ["ii kgs", "2ki"],
  ["second kings", "2ki"], ["second kgs", "2ki"],

  // 1 Chronicles
  ["1 chronicles", "1ch"], ["1chronicles", "1ch"], ["1 chron", "1ch"], ["1chron", "1ch"],
  ["1 chr", "1ch"], ["1chr", "1ch"], ["1 ch", "1ch"], ["1ch", "1ch"],
  ["i chronicles", "1ch"], ["i chron", "1ch"],
  ["first chronicles", "1ch"], ["first chron", "1ch"],

  // 2 Chronicles
  ["2 chronicles", "2ch"], ["2chronicles", "2ch"], ["2 chron", "2ch"], ["2chron", "2ch"],
  ["2 chr", "2ch"], ["2chr", "2ch"], ["2 ch", "2ch"], ["2ch", "2ch"],
  ["ii chronicles", "2ch"], ["ii chron", "2ch"],
  ["second chronicles", "2ch"], ["second chron", "2ch"],

  // Ezra
  ["ezra", "ezr"], ["ezr", "ezr"], ["ezr.", "ezr"],

  // Nehemiah
  ["nehemiah", "neh"], ["neh", "neh"], ["neh.", "neh"], ["ne", "neh"],

  // Esther
  ["esther", "est"], ["esth", "est"], ["esth.", "est"], ["est", "est"], ["es", "est"],

  // Job
  ["job", "job"], ["jb", "job"],

  // Psalms
  ["psalms", "psa"], ["psalm", "psa"], ["psa", "psa"], ["ps", "psa"],
  ["ps.", "psa"], ["pss", "psa"], ["the psalms", "psa"],

  // Proverbs
  ["proverbs", "pro"], ["prov", "pro"], ["prov.", "pro"], ["pro", "pro"], ["pr", "pro"],

  // Ecclesiastes
  ["ecclesiastes", "ecc"], ["eccl", "ecc"], ["eccl.", "ecc"], ["ecc", "ecc"],
  ["eccles", "ecc"], ["qoh", "ecc"], ["qoheleth", "ecc"],

  // Song of Solomon
  ["song of solomon", "sng"], ["song of songs", "sng"], ["song", "sng"],
  ["songs", "sng"], ["sng", "sng"], ["sos", "sng"], ["ss", "sng"],
  ["canticles", "sng"], ["canticle of canticles", "sng"],

  // Isaiah
  ["isaiah", "isa"], ["isa", "isa"], ["isa.", "isa"], ["is", "isa"],

  // Jeremiah
  ["jeremiah", "jer"], ["jer", "jer"], ["jer.", "jer"], ["je", "jer"],

  // Lamentations
  ["lamentations", "lam"], ["lam", "lam"], ["lam.", "lam"], ["la", "lam"],

  // Ezekiel
  ["ezekiel", "ezk"], ["ezek", "ezk"], ["ezek.", "ezk"], ["ezk", "ezk"], ["ez", "ezk"],

  // Daniel
  ["daniel", "dan"], ["dan", "dan"], ["dan.", "dan"], ["dn", "dan"],

  // Hosea
  ["hosea", "hos"], ["hos", "hos"], ["hos.", "hos"], ["ho", "hos"],

  // Joel
  ["joel", "jol"], ["jol", "jol"], ["jl", "jol"],

  // Amos
  ["amos", "amo"], ["amo", "amo"], ["am", "amo"],

  // Obadiah
  ["obadiah", "oba"], ["obad", "oba"], ["obad.", "oba"], ["oba", "oba"], ["ob", "oba"],

  // Jonah
  ["jonah", "jon"], ["jon", "jon"], ["jnh", "jon"],

  // Micah
  ["micah", "mic"], ["mic", "mic"], ["mic.", "mic"], ["mi", "mic"],

  // Nahum
  ["nahum", "nah"], ["nah", "nah"], ["nah.", "nah"], ["na", "nah"],

  // Habakkuk
  ["habakkuk", "hab"], ["hab", "hab"], ["hab.", "hab"], ["hb", "hab"],

  // Zephaniah
  ["zephaniah", "zep"], ["zeph", "zep"], ["zeph.", "zep"], ["zep", "zep"],

  // Haggai
  ["haggai", "hag"], ["hag", "hag"], ["hag.", "hag"], ["hg", "hag"],

  // Zechariah
  ["zechariah", "zec"], ["zech", "zec"], ["zech.", "zec"], ["zec", "zec"],

  // Malachi
  ["malachi", "mal"], ["mal", "mal"], ["mal.", "mal"], ["ml", "mal"],

  // ── Deuterocanon ──

  // Tobit
  ["tobit", "tob"], ["tob", "tob"], ["tb", "tob"],

  // Judith
  ["judith", "jdt"], ["jdt", "jdt"], ["jdth", "jdt"],

  // Additions to Esther
  ["additions to esther", "ade"], ["add esth", "ade"], ["ade", "ade"],
  ["greek esther", "ade"], ["rest of esther", "ade"],

  // Wisdom of Solomon
  ["wisdom of solomon", "wis"], ["wisdom", "wis"], ["wis", "wis"],
  ["ws", "wis"], ["wisd", "wis"],

  // Sirach
  ["sirach", "sir"], ["sir", "sir"], ["ecclesiasticus", "sir"],
  ["ecclus", "sir"],

  // Baruch
  ["baruch", "bar"], ["bar", "bar"], ["ba", "bar"],
  ["letter of jeremiah", "bar"],

  // Additions to Daniel
  ["additions to daniel", "add"], ["add dan", "add"], ["add", "add"],
  ["prayer of azariah", "add"], ["susanna", "add"], ["bel and the dragon", "add"],

  // 1 Maccabees
  ["1 maccabees", "1ma"], ["1maccabees", "1ma"], ["1 macc", "1ma"], ["1macc", "1ma"],
  ["1 mac", "1ma"], ["1mac", "1ma"], ["1ma", "1ma"],
  ["i maccabees", "1ma"], ["i macc", "1ma"],
  ["first maccabees", "1ma"],

  // 2 Maccabees
  ["2 maccabees", "2ma"], ["2maccabees", "2ma"], ["2 macc", "2ma"], ["2macc", "2ma"],
  ["2 mac", "2ma"], ["2mac", "2ma"], ["2ma", "2ma"],
  ["ii maccabees", "2ma"], ["ii macc", "2ma"],
  ["second maccabees", "2ma"],

  // 1 Esdras
  ["1 esdras", "1es"], ["1esdras", "1es"], ["1 esd", "1es"], ["1esd", "1es"], ["1es", "1es"],
  ["i esdras", "1es"], ["first esdras", "1es"],

  // 2 Esdras
  ["2 esdras", "2es"], ["2esdras", "2es"], ["2 esd", "2es"], ["2esd", "2es"], ["2es", "2es"],
  ["ii esdras", "2es"], ["second esdras", "2es"],
  ["4 ezra", "2es"], ["4 esdras", "2es"],

  // Prayer of Manasseh
  ["prayer of manasseh", "pma"], ["pr man", "pma"], ["pma", "pma"],
  ["pr of man", "pma"], ["prayer of manasses", "pma"],

  // Psalm 151
  ["psalm 151", "p15"], ["ps 151", "p15"], ["p15", "p15"],

  // 3 Maccabees
  ["3 maccabees", "3ma"], ["3maccabees", "3ma"], ["3 macc", "3ma"], ["3macc", "3ma"],
  ["3 mac", "3ma"], ["3mac", "3ma"], ["3ma", "3ma"],
  ["iii maccabees", "3ma"], ["iii macc", "3ma"],
  ["third maccabees", "3ma"],

  // 4 Maccabees
  ["4 maccabees", "4ma"], ["4maccabees", "4ma"], ["4 macc", "4ma"], ["4macc", "4ma"],
  ["4 mac", "4ma"], ["4mac", "4ma"], ["4ma", "4ma"],
  ["iv maccabees", "4ma"], ["iv macc", "4ma"],
  ["fourth maccabees", "4ma"],

  // ── New Testament ──

  // Matthew
  ["matthew", "mat"], ["matt", "mat"], ["matt.", "mat"], ["mat", "mat"], ["mt", "mat"],

  // Mark
  ["mark", "mrk"], ["mrk", "mrk"], ["mk", "mrk"], ["mr", "mrk"],

  // Luke
  ["luke", "luk"], ["luk", "luk"], ["lk", "luk"],

  // John (Gospel)
  ["john", "jhn"], ["jhn", "jhn"], ["jn", "jhn"],

  // Acts
  ["acts", "act"], ["acts of the apostles", "act"], ["act", "act"],

  // Romans
  ["romans", "rom"], ["rom", "rom"], ["rom.", "rom"], ["ro", "rom"],

  // 1 Corinthians
  ["1 corinthians", "1co"], ["1corinthians", "1co"], ["1 cor", "1co"], ["1cor", "1co"],
  ["1 co", "1co"], ["1co", "1co"],
  ["i corinthians", "1co"], ["i cor", "1co"],
  ["first corinthians", "1co"],

  // 2 Corinthians
  ["2 corinthians", "2co"], ["2corinthians", "2co"], ["2 cor", "2co"], ["2cor", "2co"],
  ["2 co", "2co"], ["2co", "2co"],
  ["ii corinthians", "2co"], ["ii cor", "2co"],
  ["second corinthians", "2co"],

  // Galatians
  ["galatians", "gal"], ["gal", "gal"], ["gal.", "gal"], ["ga", "gal"],

  // Ephesians
  ["ephesians", "eph"], ["eph", "eph"], ["eph.", "eph"],

  // Philippians
  ["philippians", "php"], ["phil", "php"], ["phil.", "php"], ["php", "php"],

  // Colossians
  ["colossians", "col"], ["col", "col"], ["col.", "col"],

  // 1 Thessalonians
  ["1 thessalonians", "1th"], ["1thessalonians", "1th"], ["1 thess", "1th"], ["1thess", "1th"],
  ["1 th", "1th"], ["1th", "1th"],
  ["i thessalonians", "1th"], ["i thess", "1th"],
  ["first thessalonians", "1th"],

  // 2 Thessalonians
  ["2 thessalonians", "2th"], ["2thessalonians", "2th"], ["2 thess", "2th"], ["2thess", "2th"],
  ["2 th", "2th"], ["2th", "2th"],
  ["ii thessalonians", "2th"], ["ii thess", "2th"],
  ["second thessalonians", "2th"],

  // 1 Timothy
  ["1 timothy", "1ti"], ["1timothy", "1ti"], ["1 tim", "1ti"], ["1tim", "1ti"],
  ["1 ti", "1ti"], ["1ti", "1ti"],
  ["i timothy", "1ti"], ["i tim", "1ti"],
  ["first timothy", "1ti"],

  // 2 Timothy
  ["2 timothy", "2ti"], ["2timothy", "2ti"], ["2 tim", "2ti"], ["2tim", "2ti"],
  ["2 ti", "2ti"], ["2ti", "2ti"],
  ["ii timothy", "2ti"], ["ii tim", "2ti"],
  ["second timothy", "2ti"],

  // Titus
  ["titus", "tit"], ["tit", "tit"], ["ti", "tit"],

  // Philemon
  ["philemon", "phm"], ["phlm", "phm"], ["phm", "phm"], ["philem", "phm"],

  // Hebrews
  ["hebrews", "heb"], ["heb", "heb"], ["heb.", "heb"],

  // James
  ["james", "jas"], ["jas", "jas"], ["jas.", "jas"], ["jm", "jas"],

  // 1 Peter
  ["1 peter", "1pe"], ["1peter", "1pe"], ["1 pet", "1pe"], ["1pet", "1pe"],
  ["1 pe", "1pe"], ["1pe", "1pe"], ["1 pt", "1pe"],
  ["i peter", "1pe"], ["i pet", "1pe"],
  ["first peter", "1pe"],

  // 2 Peter
  ["2 peter", "2pe"], ["2peter", "2pe"], ["2 pet", "2pe"], ["2pet", "2pe"],
  ["2 pe", "2pe"], ["2pe", "2pe"], ["2 pt", "2pe"],
  ["ii peter", "2pe"], ["ii pet", "2pe"],
  ["second peter", "2pe"],

  // 1 John
  ["1 john", "1jn"], ["1john", "1jn"], ["1 jn", "1jn"], ["1jn", "1jn"],
  ["i john", "1jn"], ["i jn", "1jn"],
  ["first john", "1jn"],

  // 2 John
  ["2 john", "2jn"], ["2john", "2jn"], ["2 jn", "2jn"], ["2jn", "2jn"],
  ["ii john", "2jn"], ["ii jn", "2jn"],
  ["second john", "2jn"],

  // 3 John
  ["3 john", "3jn"], ["3john", "3jn"], ["3 jn", "3jn"], ["3jn", "3jn"],
  ["iii john", "3jn"], ["iii jn", "3jn"],
  ["third john", "3jn"],

  // Jude
  ["jude", "jud"], ["jud", "jud"], ["jd", "jud"],

  // Revelation
  ["revelation", "rev"], ["rev", "rev"], ["rev.", "rev"],
  ["revelations", "rev"], ["apocalypse", "rev"], ["apoc", "rev"],
  ["the revelation", "rev"],
]);

/**
 * Resolves a book name string to a canonical BookId.
 *
 * Case-insensitive. Strips leading/trailing whitespace and periods.
 * Returns null if the name can't be resolved.
 *
 * @example
 * resolveBookName("Genesis")    // → "gen"
 * resolveBookName("1 Sam.")     // → "1sa"
 * resolveBookName("JOHN")       // → "jhn"
 * resolveBookName("Unknown")    // → null
 */
export function resolveBookName(name: string): BookId | null {
  // Normalize: lowercase, trim whitespace, strip trailing periods
  const normalized = name.trim().toLowerCase().replace(/\.+$/, "");
  return BOOK_NAME_ALIASES.get(normalized) ?? null;
}
