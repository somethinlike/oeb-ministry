/**
 * Translation metadata and historical context for the info page.
 *
 * Kept separate from constants.ts so this ~2KB of descriptive text
 * doesn't inflate the workspace bundle — only the /translations page
 * and the info icon tooltip import from here.
 *
 * Each entry's `id` must match a SUPPORTED_TRANSLATIONS[].id from constants.ts.
 */

export interface TranslationInfo {
  /** Must match SUPPORTED_TRANSLATIONS[].id */
  id: string;
  /** Full display name */
  name: string;
  /** Year the original edition was first published */
  yearPublished: number;
  /** Year of the specific edition we use, if different from the original */
  yearEdition?: number;
  /** Christian tradition this translation comes from */
  tradition: "Catholic" | "Protestant" | "Ecumenical";
  /** One-sentence summary for timeline cards */
  summary: string;
  /** 2-3 paragraph description for the detail section */
  description: string[];
  /** Bullet-point significance facts */
  significance: string[];
  /** Number of books in the canon this translation includes */
  canonBookCount: string;
  /** Source languages the translation was made from */
  sourceLanguages: string[];
  /** Tailwind color class for the timeline dot and accent */
  timelineColor: string;
  /** Tailwind color class for the tradition badge background */
  badgeColor: string;
  /** Tailwind color class for the tradition badge text */
  badgeTextColor: string;
}

/**
 * Historical info for each supported translation.
 *
 * Ordered chronologically — DRA (1582), KJV (1611), WEB (2000), OEB (2010).
 * The map key matches SUPPORTED_TRANSLATIONS[].id from constants.ts.
 */
export const TRANSLATION_INFO: ReadonlyMap<string, TranslationInfo> = new Map([
  [
    "dra",
    {
      id: "dra",
      name: "Douay-Rheims American Edition",
      yearPublished: 1582,
      yearEdition: 1899,
      tradition: "Catholic",
      summary:
        "The first complete English Catholic Bible, translated by scholars in exile.",
      description: [
        "The Douay-Rheims Bible began as a project by English Catholic scholars who had fled Protestant England during the reign of Elizabeth I. Working at the English College in Douai (then part of the Spanish Netherlands) and later in Rheims, France, they produced the New Testament in 1582 and the Old Testament in 1609-1610 — predating the King James Version by 29 years.",
        "The translation was made from the Latin Vulgate, the Catholic Church's official Bible text, rather than directly from the original Hebrew and Greek. This was a deliberate choice: the scholars believed Jerome's 4th-century Latin translation had been guided by the Holy Spirit and refined by over a thousand years of Church use.",
        "The edition we use is the 1899 American revision by Bishop Richard Challoner's updates (first revised 1749-1752), which modernized the language while preserving fidelity to the Vulgate. This is the version most familiar to English-speaking Catholics before the mid-20th century.",
      ],
      significance: [
        "First complete English Bible produced by Catholic scholars",
        "Predates the King James Version by 29 years (NT: 1582 vs. KJV: 1611)",
        "Includes 73+ books — the full Catholic canon with deuterocanonical books (Tobit, Judith, Wisdom, Sirach, Baruch, 1 & 2 Maccabees, and additions to Esther and Daniel)",
        "Translated from the Latin Vulgate, preserving the Catholic textual tradition",
        "Several phrasings from the Douay-Rheims were adopted by the KJV translators",
      ],
      canonBookCount: "73+ books (includes deuterocanon)",
      sourceLanguages: ["Latin (Vulgate)"],
      timelineColor: "bg-purple-600",
      badgeColor: "bg-purple-100",
      badgeTextColor: "text-purple-800",
    },
  ],
  [
    "kjv1611",
    {
      id: "kjv1611",
      name: "King James Version (1611)",
      yearPublished: 1611,
      tradition: "Protestant",
      summary:
        "The most influential English Bible ever produced — 47 scholars, 7 years, and a legacy that shaped the English language.",
      description: [
        "King James I of England commissioned this translation in 1604, hoping to settle disputes between the established Church of England and the growing Puritan movement. Forty-seven scholars organized into six committees worked for seven years, drawing on the best available Hebrew, Aramaic, and Greek manuscripts while consulting earlier English translations — including the Douay-Rheims.",
        "The 1611 edition originally included 80 books: the 39 Old Testament books, 14 books of the Apocrypha, and the 27 New Testament books. The Apocrypha was placed between the Old and New Testaments as an interlude — not considered equal to the canonical books by Protestant standards, but included for historical and devotional value. Later publishers began omitting the Apocrypha in the 19th century to reduce printing costs.",
        "The KJV's influence on the English language is unmatched by any other book. Phrases we use every day — \"salt of the earth,\" \"a drop in the bucket,\" \"the skin of my teeth,\" \"the writing on the wall,\" \"a labor of love\" — all come from the King James Bible. For over 300 years, it was the Bible for English-speaking Protestants worldwide.",
      ],
      significance: [
        "Most widely printed book in history — billions of copies in circulation",
        "47 scholars organized into 6 translation committees over 7 years",
        "Original 1611 edition included 80 books (OT + Apocrypha + NT)",
        "Shaped the English language — hundreds of common phrases originate from the KJV",
        "Remained the dominant English Protestant Bible for over 300 years",
        "Translated from the Masoretic Hebrew text (OT) and the Textus Receptus Greek (NT)",
      ],
      canonBookCount: "80 books (original included Apocrypha)",
      sourceLanguages: ["Hebrew", "Aramaic", "Greek (Textus Receptus)"],
      timelineColor: "bg-red-600",
      badgeColor: "bg-red-100",
      badgeTextColor: "text-red-800",
    },
  ],
  [
    "web",
    {
      id: "web",
      name: "World English Bible",
      yearPublished: 2000,
      tradition: "Ecumenical",
      summary:
        "A complete, modern English Bible in the public domain — the most widely used free translation online.",
      description: [
        "The World English Bible is an updated revision of the American Standard Version (1901), modernized into contemporary English by a team of volunteers led by Michael Paul Johnson starting in 1994. The full Bible — including all 66 Protestant books plus the deuterocanonical books — was completed in 2000 and continues to receive minor updates.",
        "What sets the WEB apart is its combination of completeness and freedom. It is one of the very few modern English translations that covers the full biblical canon (including deuterocanonical books) while being entirely in the public domain. No copyright restrictions, no permission needed, no licensing fees — anyone can freely use, quote, print, or redistribute the entire text.",
        "The WEB uses \"Yahweh\" for God's covenant name (the Hebrew tetragrammaton YHWH) rather than the traditional \"LORD\" in small capitals. This is a deliberate scholarly choice — transliterating the divine name rather than substituting a title. Our word choice toggles let you switch between \"Yahweh\" and \"LORD\" if you prefer the traditional rendering.",
      ],
      significance: [
        "Complete Bible — 66 Protestant books plus deuterocanonical books, fully translated",
        "Public domain — no copyright, freely usable without permission or payment",
        "Based on the American Standard Version (1901), updated to modern English",
        "Uses \"Yahweh\" for God's name (YHWH) rather than the traditional \"LORD\"",
        "One of the most widely used free Bible translations on the internet",
        "Translated from the Masoretic Hebrew text (OT) and the Byzantine Majority Greek text (NT)",
      ],
      canonBookCount: "81 books (includes deuterocanon)",
      sourceLanguages: [
        "Hebrew (Masoretic text)",
        "Greek (Byzantine Majority text)",
      ],
      timelineColor: "bg-green-600",
      badgeColor: "bg-green-100",
      badgeTextColor: "text-green-800",
    },
  ],
  [
    "oeb-us",
    {
      id: "oeb-us",
      name: "Open English Bible (US)",
      yearPublished: 2010,
      tradition: "Ecumenical",
      summary:
        "A modern, completely free Bible translation — open source and public domain (CC0).",
      description: [
        "The Open English Bible is a modern English translation released under Creative Commons Zero (CC0), making it completely free for anyone to use, modify, and distribute without restriction. It began in 2010 as a revision of the Twentieth Century New Testament (1904), updated to contemporary American English.",
        "What makes the OEB unique isn't just the translation itself — it's the licensing. Most modern Bible translations are copyrighted, meaning you need permission (and often payment) to quote more than a few verses. The OEB removes those barriers entirely. Churches, apps, websites, and individuals can use the full text without asking anyone.",
        "The New Testament is complete. The Old Testament is actively being developed by an open community of contributors. The OEB is the default translation on this site because its CC0 license aligns perfectly with our ethic of freely sharing God's word — the same principle that drove Tyndale, the King James translators, and every community that believed scripture should be accessible to all.",
      ],
      significance: [
        "Completely free — released under CC0 (Creative Commons Zero, public domain)",
        "No permission needed to quote, share, remix, or redistribute the full text",
        "Based on the Twentieth Century New Testament (1904), updated to modern English",
        "Open source development — anyone can contribute to the translation",
        "Default translation on this site — its CC0 license matches our ethic of free access",
        "New Testament complete; Old Testament in active development",
      ],
      canonBookCount: "Full NT; OT in progress",
      sourceLanguages: [
        "Greek (critical text)",
        "English (Twentieth Century NT base)",
      ],
      timelineColor: "bg-blue-600",
      badgeColor: "bg-blue-100",
      badgeTextColor: "text-blue-800",
    },
  ],
]);

/** Get translation info in chronological order (for timeline rendering). */
export function getTranslationInfoChronological(): TranslationInfo[] {
  return Array.from(TRANSLATION_INFO.values()).sort(
    (a, b) => a.yearPublished - b.yearPublished
  );
}
