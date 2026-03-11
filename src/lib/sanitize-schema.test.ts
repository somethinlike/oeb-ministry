import { describe, it, expect } from "vitest";
import { sanitizeSchema, sanitizeMarkdownForPublishing } from "./sanitize-schema";

describe("sanitizeSchema", () => {
  it("includes standard markdown-output tags", () => {
    const tags = sanitizeSchema.tagNames ?? [];
    const expected = ["p", "em", "strong", "a", "code", "pre", "ul", "ol", "li", "h1", "h2", "h3", "blockquote"];
    for (const tag of expected) {
      expect(tags).toContain(tag);
    }
  });

  it("includes the safe HTML allowlist tags from CLAUDE.md", () => {
    const tags = sanitizeSchema.tagNames ?? [];
    const allowlist = ["mark", "details", "summary", "sup", "sub", "abbr", "blockquote", "table", "thead", "tbody", "tr", "th", "td", "br", "hr"];
    for (const tag of allowlist) {
      expect(tags).toContain(tag);
    }
  });

  it("excludes <input> from the tag list", () => {
    const tags = sanitizeSchema.tagNames ?? [];
    expect(tags).not.toContain("input");
  });

  it("allows title attribute on <abbr>", () => {
    const abbrAttrs = sanitizeSchema.attributes?.abbr;
    expect(abbrAttrs).toBeDefined();
    expect(abbrAttrs).toContain("title");
  });
});

describe("sanitizeMarkdownForPublishing", () => {
  it("returns clean markdown unchanged", () => {
    const clean = "This is **bold** and _italic_ with a [link](https://example.com)";
    expect(sanitizeMarkdownForPublishing(clean)).toBe(clean);
  });

  it("preserves safe HTML tags", () => {
    const safe = "This is <mark>highlighted</mark> text";
    expect(sanitizeMarkdownForPublishing(safe)).toBe(safe);
  });

  it("preserves <details> and <summary>", () => {
    const safe = "<details>\n<summary>Click me</summary>\n\nHidden content\n\n</details>";
    expect(sanitizeMarkdownForPublishing(safe)).toBe(safe);
  });

  it("preserves markdown tables", () => {
    const table = "| A | B |\n| - | - |\n| 1 | 2 |";
    expect(sanitizeMarkdownForPublishing(table)).toBe(table);
  });

  it("strips <script> tags with content", () => {
    const malicious = "Hello <script>alert('xss')</script> world";
    expect(sanitizeMarkdownForPublishing(malicious)).toBe("Hello alert('xss') world");
  });

  it("strips <script> tags with attributes", () => {
    const malicious = 'Before <script type="text/javascript" src="evil.js"></script> after';
    expect(sanitizeMarkdownForPublishing(malicious)).toBe("Before  after");
  });

  it("strips <iframe> tags", () => {
    const malicious = '<iframe src="https://evil.com"></iframe>';
    expect(sanitizeMarkdownForPublishing(malicious)).toBe("");
  });

  it("strips <object> tags", () => {
    const malicious = '<object data="malware.swf"></object>';
    expect(sanitizeMarkdownForPublishing(malicious)).toBe("");
  });

  it("strips <embed> tags", () => {
    const malicious = '<embed src="malware.swf">';
    expect(sanitizeMarkdownForPublishing(malicious)).toBe("");
  });

  it("strips <form> and <input> tags", () => {
    const malicious = '<form action="https://evil.com"><input type="text" name="password"></form>';
    expect(sanitizeMarkdownForPublishing(malicious)).toBe("");
  });

  it("strips <style> tags", () => {
    const malicious = "<style>body { display: none; }</style>Some text";
    expect(sanitizeMarkdownForPublishing(malicious)).toBe("body { display: none; }Some text");
  });

  it("strips on* event attributes from any tag", () => {
    const malicious = '<mark onclick="alert(1)">highlighted</mark>';
    expect(sanitizeMarkdownForPublishing(malicious)).toBe("<mark>highlighted</mark>");
  });

  it("strips multiple on* event attributes", () => {
    const malicious = '<div onmouseover="steal()" onerror="hack()">text</div>';
    expect(sanitizeMarkdownForPublishing(malicious)).toBe("<div>text</div>");
  });

  it("strips on* with single-quoted values", () => {
    const malicious = "<mark onclick='alert(1)'>text</mark>";
    expect(sanitizeMarkdownForPublishing(malicious)).toBe("<mark>text</mark>");
  });

  it("neutralizes javascript: URLs in href", () => {
    const malicious = '<a href="javascript:alert(1)">click me</a>';
    const result = sanitizeMarkdownForPublishing(malicious);
    expect(result).not.toContain("javascript:");
  });

  it("neutralizes javascript: URLs in src", () => {
    const malicious = '<img src="javascript:alert(1)">';
    const result = sanitizeMarkdownForPublishing(malicious);
    expect(result).not.toContain("javascript:");
  });

  it("handles case-insensitive tag stripping", () => {
    const malicious = "<SCRIPT>evil()</SCRIPT>";
    expect(sanitizeMarkdownForPublishing(malicious)).toBe("evil()");
  });

  it("handles self-closing dangerous tags", () => {
    const malicious = '<embed src="evil.swf" />';
    // The regex matches <embed ... > which includes the self-closing slash
    expect(sanitizeMarkdownForPublishing(malicious)).toBe("");
  });

  it("handles nested dangerous content", () => {
    const malicious = "Good <script>bad <script>worse</script></script> good";
    const result = sanitizeMarkdownForPublishing(malicious);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("</script");
  });

  it("preserves HTML table tags", () => {
    const table = "<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>";
    expect(sanitizeMarkdownForPublishing(table)).toBe(table);
  });
});
