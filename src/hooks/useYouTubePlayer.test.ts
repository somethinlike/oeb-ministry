import { describe, it, expect } from "vitest";
import { extractYouTubeVideoId } from "./useYouTubePlayer";

describe("extractYouTubeVideoId", () => {
  // ── Standard youtube.com/watch URLs ──

  it("extracts video ID from standard youtube.com/watch URL", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("handles youtube.com without www", () => {
    expect(extractYouTubeVideoId("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("handles http (non-HTTPS) URLs", () => {
    expect(extractYouTubeVideoId("http://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("extracts video ID when URL has extra query params", () => {
    expect(
      extractYouTubeVideoId(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf",
      ),
    ).toBe("dQw4w9WgXcQ");
  });

  // ── Short youtu.be links ──

  it("extracts video ID from youtu.be short link", () => {
    expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("handles youtu.be with query params", () => {
    expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ?t=120")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  // ── Embed URLs ──

  it("extracts video ID from youtube.com/embed URL", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("extracts video ID from youtube-nocookie.com/embed URL", () => {
    expect(
      extractYouTubeVideoId("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("handles youtube-nocookie.com without www", () => {
    expect(
      extractYouTubeVideoId("https://youtube-nocookie.com/embed/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  // ── Direct video ID ──

  it("accepts a bare 11-character video ID", () => {
    expect(extractYouTubeVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("accepts a video ID with dashes and underscores", () => {
    expect(extractYouTubeVideoId("a1B2-c3_D4e")).toBe("a1B2-c3_D4e");
  });

  // ── Invalid inputs ──

  it("returns null for empty string", () => {
    expect(extractYouTubeVideoId("")).toBeNull();
  });

  it("returns null for non-YouTube URL", () => {
    expect(extractYouTubeVideoId("https://www.vimeo.com/123456")).toBeNull();
  });

  it("returns null for youtube.com without a video ID", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/watch")).toBeNull();
  });

  it("returns null for random text", () => {
    expect(extractYouTubeVideoId("not a url at all")).toBeNull();
  });

  it("returns null for a string that's too short for a video ID", () => {
    expect(extractYouTubeVideoId("abc")).toBeNull();
  });

  it("returns null for a string that's too long for a video ID", () => {
    expect(extractYouTubeVideoId("dQw4w9WgXcQx")).toBeNull();
  });

  it("handles whitespace around the input", () => {
    expect(extractYouTubeVideoId("  dQw4w9WgXcQ  ")).toBe("dQw4w9WgXcQ");
  });

  it("handles whitespace around a URL", () => {
    expect(
      extractYouTubeVideoId("  https://www.youtube.com/watch?v=dQw4w9WgXcQ  "),
    ).toBe("dQw4w9WgXcQ");
  });
});
