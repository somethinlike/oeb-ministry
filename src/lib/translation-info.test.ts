/**
 * Tests for translation-info — ensures translation data integrity.
 *
 * Verifies:
 * - Every SUPPORTED_TRANSLATIONS ID has a matching entry in TRANSLATION_INFO
 * - All required fields are present and well-formed
 * - Chronological sort helper returns entries in date order
 * - No orphan entries (info exists for a translation not in SUPPORTED_TRANSLATIONS)
 */

import { SUPPORTED_TRANSLATIONS } from "./constants";
import {
  TRANSLATION_INFO,
  getTranslationInfoChronological,
} from "./translation-info";

const supportedIds = SUPPORTED_TRANSLATIONS.map((t) => t.id);

describe("TRANSLATION_INFO", () => {
  it("has an entry for every supported translation", () => {
    for (const id of supportedIds) {
      expect(TRANSLATION_INFO.has(id)).toBe(true);
    }
  });

  it("has no orphan entries (every info ID exists in SUPPORTED_TRANSLATIONS)", () => {
    for (const [id] of TRANSLATION_INFO) {
      expect(supportedIds).toContain(id);
    }
  });

  it("entry IDs match their map keys", () => {
    for (const [key, info] of TRANSLATION_INFO) {
      expect(info.id).toBe(key);
    }
  });

  it("every entry has a non-empty name", () => {
    for (const [, info] of TRANSLATION_INFO) {
      expect(info.name.length).toBeGreaterThan(0);
    }
  });

  it("every entry has a valid yearPublished", () => {
    for (const [, info] of TRANSLATION_INFO) {
      expect(info.yearPublished).toBeGreaterThan(0);
      expect(info.yearPublished).toBeLessThan(2100);
    }
  });

  it("every entry has a valid tradition", () => {
    const validTraditions = ["Catholic", "Protestant", "Ecumenical"];
    for (const [, info] of TRANSLATION_INFO) {
      expect(validTraditions).toContain(info.tradition);
    }
  });

  it("every entry has a non-empty summary", () => {
    for (const [, info] of TRANSLATION_INFO) {
      expect(info.summary.length).toBeGreaterThan(0);
    }
  });

  it("every entry has at least one description paragraph", () => {
    for (const [, info] of TRANSLATION_INFO) {
      expect(info.description.length).toBeGreaterThanOrEqual(1);
      for (const paragraph of info.description) {
        expect(paragraph.length).toBeGreaterThan(0);
      }
    }
  });

  it("every entry has at least one significance bullet", () => {
    for (const [, info] of TRANSLATION_INFO) {
      expect(info.significance.length).toBeGreaterThanOrEqual(1);
      for (const point of info.significance) {
        expect(point.length).toBeGreaterThan(0);
      }
    }
  });

  it("every entry has at least one source language", () => {
    for (const [, info] of TRANSLATION_INFO) {
      expect(info.sourceLanguages.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("every entry has Tailwind color classes", () => {
    for (const [, info] of TRANSLATION_INFO) {
      expect(info.timelineColor).toMatch(/^bg-/);
      expect(info.badgeColor).toMatch(/^bg-/);
      expect(info.badgeTextColor).toMatch(/^text-/);
    }
  });
});

describe("getTranslationInfoChronological", () => {
  it("returns entries sorted by yearPublished ascending", () => {
    const sorted = getTranslationInfoChronological();
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].yearPublished).toBeGreaterThanOrEqual(
        sorted[i - 1].yearPublished
      );
    }
  });

  it("returns all entries from TRANSLATION_INFO", () => {
    const sorted = getTranslationInfoChronological();
    expect(sorted.length).toBe(TRANSLATION_INFO.size);
  });

  it("first entry is DRA (1582) and last is OEB (2010)", () => {
    const sorted = getTranslationInfoChronological();
    expect(sorted[0].id).toBe("dra");
    expect(sorted[sorted.length - 1].id).toBe("oeb-us");
  });
});
