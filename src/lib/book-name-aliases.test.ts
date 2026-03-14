import { describe, it, expect } from "vitest";
import { resolveBookName, BOOK_NAME_ALIASES } from "./book-name-aliases";

describe("resolveBookName", () => {
  describe("canonical full names", () => {
    it("resolves 'Genesis' to 'gen'", () => {
      expect(resolveBookName("Genesis")).toBe("gen");
    });

    it("resolves 'Revelation' to 'rev'", () => {
      expect(resolveBookName("Revelation")).toBe("rev");
    });

    it("resolves 'Psalms' to 'psa'", () => {
      expect(resolveBookName("Psalms")).toBe("psa");
    });

    it("resolves 'Ecclesiastes' to 'ecc'", () => {
      expect(resolveBookName("Ecclesiastes")).toBe("ecc");
    });
  });

  describe("common abbreviations", () => {
    it("resolves 'Gen' to 'gen'", () => {
      expect(resolveBookName("Gen")).toBe("gen");
    });

    it("resolves 'Rev' to 'rev'", () => {
      expect(resolveBookName("Rev")).toBe("rev");
    });

    it("resolves 'Matt' to 'mat'", () => {
      expect(resolveBookName("Matt")).toBe("mat");
    });

    it("resolves 'Exod' to 'exo'", () => {
      expect(resolveBookName("Exod")).toBe("exo");
    });

    it("resolves 'Deut' to 'deu'", () => {
      expect(resolveBookName("Deut")).toBe("deu");
    });

    it("resolves 'Prov' to 'pro'", () => {
      expect(resolveBookName("Prov")).toBe("pro");
    });

    it("resolves 'Heb' to 'heb'", () => {
      expect(resolveBookName("Heb")).toBe("heb");
    });
  });

  describe("numbered books (Arabic numerals)", () => {
    it("resolves '1 Samuel' to '1sa'", () => {
      expect(resolveBookName("1 Samuel")).toBe("1sa");
    });

    it("resolves '2 Kings' to '2ki'", () => {
      expect(resolveBookName("2 Kings")).toBe("2ki");
    });

    it("resolves '1 Chronicles' to '1ch'", () => {
      expect(resolveBookName("1 Chronicles")).toBe("1ch");
    });

    it("resolves '2 Corinthians' to '2co'", () => {
      expect(resolveBookName("2 Corinthians")).toBe("2co");
    });

    it("resolves '1 Thessalonians' to '1th'", () => {
      expect(resolveBookName("1 Thessalonians")).toBe("1th");
    });

    it("resolves '1 Peter' to '1pe'", () => {
      expect(resolveBookName("1 Peter")).toBe("1pe");
    });

    it("resolves '3 John' to '3jn'", () => {
      expect(resolveBookName("3 John")).toBe("3jn");
    });
  });

  describe("Roman numeral variants (I, II, III)", () => {
    it("resolves 'I Samuel' to '1sa'", () => {
      expect(resolveBookName("I Samuel")).toBe("1sa");
    });

    it("resolves 'II Kings' to '2ki'", () => {
      expect(resolveBookName("II Kings")).toBe("2ki");
    });

    it("resolves 'I Corinthians' to '1co'", () => {
      expect(resolveBookName("I Corinthians")).toBe("1co");
    });

    it("resolves 'II Timothy' to '2ti'", () => {
      expect(resolveBookName("II Timothy")).toBe("2ti");
    });

    it("resolves 'III John' to '3jn'", () => {
      expect(resolveBookName("III John")).toBe("3jn");
    });

    it("resolves 'I Peter' to '1pe'", () => {
      expect(resolveBookName("I Peter")).toBe("1pe");
    });
  });

  describe("ordinal word variants (First, Second, Third)", () => {
    it("resolves 'First John' to '1jn'", () => {
      expect(resolveBookName("First John")).toBe("1jn");
    });

    it("resolves 'Second Samuel' to '2sa'", () => {
      expect(resolveBookName("Second Samuel")).toBe("2sa");
    });

    it("resolves 'Third John' to '3jn'", () => {
      expect(resolveBookName("Third John")).toBe("3jn");
    });

    it("resolves 'First Peter' to '1pe'", () => {
      expect(resolveBookName("First Peter")).toBe("1pe");
    });

    it("resolves 'Second Kings' to '2ki'", () => {
      expect(resolveBookName("Second Kings")).toBe("2ki");
    });

    it("resolves 'First Corinthians' to '1co'", () => {
      expect(resolveBookName("First Corinthians")).toBe("1co");
    });

    it("resolves 'First Maccabees' to '1ma'", () => {
      expect(resolveBookName("First Maccabees")).toBe("1ma");
    });
  });

  describe("case insensitivity", () => {
    it("resolves 'GENESIS' (all caps) to 'gen'", () => {
      expect(resolveBookName("GENESIS")).toBe("gen");
    });

    it("resolves 'genesis' (all lowercase) to 'gen'", () => {
      expect(resolveBookName("genesis")).toBe("gen");
    });

    it("resolves 'GeNeSiS' (mixed case) to 'gen'", () => {
      expect(resolveBookName("GeNeSiS")).toBe("gen");
    });

    it("resolves 'REVELATION' to 'rev'", () => {
      expect(resolveBookName("REVELATION")).toBe("rev");
    });

    it("resolves 'matt' (lowercase abbreviation) to 'mat'", () => {
      expect(resolveBookName("matt")).toBe("mat");
    });

    it("resolves 'FIRST JOHN' (all caps ordinal) to '1jn'", () => {
      expect(resolveBookName("FIRST JOHN")).toBe("1jn");
    });
  });

  describe("trailing period stripping", () => {
    it("resolves 'Gen.' to 'gen'", () => {
      expect(resolveBookName("Gen.")).toBe("gen");
    });

    it("resolves 'Rev.' to 'rev'", () => {
      expect(resolveBookName("Rev.")).toBe("rev");
    });

    it("resolves 'Matt.' to 'mat'", () => {
      expect(resolveBookName("Matt.")).toBe("mat");
    });

    it("resolves 'Exod.' to 'exo'", () => {
      expect(resolveBookName("Exod.")).toBe("exo");
    });

    it("strips multiple trailing periods ('Gen..')", () => {
      expect(resolveBookName("Gen..")).toBe("gen");
    });
  });

  describe("whitespace handling", () => {
    it("trims leading whitespace", () => {
      expect(resolveBookName("  Genesis")).toBe("gen");
    });

    it("trims trailing whitespace", () => {
      expect(resolveBookName("Genesis  ")).toBe("gen");
    });

    it("trims whitespace on both sides", () => {
      expect(resolveBookName("  Genesis  ")).toBe("gen");
    });

    it("trims whitespace combined with trailing period", () => {
      expect(resolveBookName("  Gen.  ")).toBe("gen");
    });
  });

  describe("unknown or empty names return null", () => {
    it("returns null for a completely unknown name", () => {
      expect(resolveBookName("NotABook")).toBeNull();
    });

    it("returns null for an empty string", () => {
      expect(resolveBookName("")).toBeNull();
    });

    it("returns null for whitespace-only input", () => {
      expect(resolveBookName("   ")).toBeNull();
    });

    it("returns null for a number-only input", () => {
      expect(resolveBookName("123")).toBeNull();
    });

    it("returns null for a partial match that is not in the map", () => {
      expect(resolveBookName("Genesiss")).toBeNull();
    });
  });

  describe("Deuterocanon books resolve correctly", () => {
    it("resolves 'Tobit' to 'tob'", () => {
      expect(resolveBookName("Tobit")).toBe("tob");
    });

    it("resolves 'Sirach' to 'sir'", () => {
      expect(resolveBookName("Sirach")).toBe("sir");
    });

    it("resolves 'Wisdom' to 'wis'", () => {
      expect(resolveBookName("Wisdom")).toBe("wis");
    });

    it("resolves 'Judith' to 'jdt'", () => {
      expect(resolveBookName("Judith")).toBe("jdt");
    });

    it("resolves 'Baruch' to 'bar'", () => {
      expect(resolveBookName("Baruch")).toBe("bar");
    });

    it("resolves '1 Maccabees' to '1ma'", () => {
      expect(resolveBookName("1 Maccabees")).toBe("1ma");
    });

    it("resolves '2 Maccabees' to '2ma'", () => {
      expect(resolveBookName("2 Maccabees")).toBe("2ma");
    });

    it("resolves 'Wisdom of Solomon' to 'wis'", () => {
      expect(resolveBookName("Wisdom of Solomon")).toBe("wis");
    });

    it("resolves 'Prayer of Manasseh' to 'pma'", () => {
      expect(resolveBookName("Prayer of Manasseh")).toBe("pma");
    });

    it("resolves '1 Esdras' to '1es'", () => {
      expect(resolveBookName("1 Esdras")).toBe("1es");
    });
  });

  describe("New Testament books", () => {
    it("resolves 'Matthew' to 'mat'", () => {
      expect(resolveBookName("Matthew")).toBe("mat");
    });

    it("resolves 'John' to 'jhn'", () => {
      expect(resolveBookName("John")).toBe("jhn");
    });

    it("resolves 'Acts' to 'act'", () => {
      expect(resolveBookName("Acts")).toBe("act");
    });

    it("resolves 'Romans' to 'rom'", () => {
      expect(resolveBookName("Romans")).toBe("rom");
    });

    it("resolves 'Galatians' to 'gal'", () => {
      expect(resolveBookName("Galatians")).toBe("gal");
    });

    it("resolves 'Hebrews' to 'heb'", () => {
      expect(resolveBookName("Hebrews")).toBe("heb");
    });

    it("resolves 'James' to 'jas'", () => {
      expect(resolveBookName("James")).toBe("jas");
    });

    it("resolves 'Jude' to 'jud'", () => {
      expect(resolveBookName("Jude")).toBe("jud");
    });

    it("resolves 'Acts of the Apostles' (full title) to 'act'", () => {
      expect(resolveBookName("Acts of the Apostles")).toBe("act");
    });
  });

  describe("alternative and historical names", () => {
    it("resolves 'Song of Solomon' to 'sng'", () => {
      expect(resolveBookName("Song of Solomon")).toBe("sng");
    });

    it("resolves 'Song of Songs' to 'sng'", () => {
      expect(resolveBookName("Song of Songs")).toBe("sng");
    });

    it("resolves 'Canticles' to 'sng'", () => {
      expect(resolveBookName("Canticles")).toBe("sng");
    });

    it("resolves 'Ecclesiasticus' (alternate for Sirach) to 'sir'", () => {
      expect(resolveBookName("Ecclesiasticus")).toBe("sir");
    });

    it("resolves 'Apocalypse' (alternate for Revelation) to 'rev'", () => {
      expect(resolveBookName("Apocalypse")).toBe("rev");
    });

    it("resolves 'Revelations' (common misnomer) to 'rev'", () => {
      expect(resolveBookName("Revelations")).toBe("rev");
    });

    it("resolves 'Qoheleth' (alternate for Ecclesiastes) to 'ecc'", () => {
      expect(resolveBookName("Qoheleth")).toBe("ecc");
    });

    it("resolves 'The Revelation' to 'rev'", () => {
      expect(resolveBookName("The Revelation")).toBe("rev");
    });

    it("resolves 'Greek Esther' to 'ade'", () => {
      expect(resolveBookName("Greek Esther")).toBe("ade");
    });

    it("resolves 'Letter of Jeremiah' to 'bar'", () => {
      expect(resolveBookName("Letter of Jeremiah")).toBe("bar");
    });

    it("resolves 'Bel and the Dragon' to 'add'", () => {
      expect(resolveBookName("Bel and the Dragon")).toBe("add");
    });
  });
});

describe("BOOK_NAME_ALIASES", () => {
  it("contains more than 200 entries covering the breadth of Bible naming variants", () => {
    expect(BOOK_NAME_ALIASES.size).toBeGreaterThan(200);
  });

  it("contains more than 250 entries for thorough coverage", () => {
    expect(BOOK_NAME_ALIASES.size).toBeGreaterThan(250);
  });

  it("has all keys stored in lowercase (lookup normalization relies on this)", () => {
    for (const key of BOOK_NAME_ALIASES.keys()) {
      expect(key).toBe(key.toLowerCase());
    }
  });
});
