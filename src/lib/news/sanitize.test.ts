import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { sanitizeBody } from "./sanitize";

describe("sanitizeBody", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  });

  it("strips script tags entirely", () => {
    const { html } = sanitizeBody("<p>Hello</p><script>alert(1)</script>");
    expect(html).not.toContain("script");
    expect(html).toContain("Hello");
  });

  it("strips onclick and other event attributes", () => {
    const { html } = sanitizeBody('<p onclick="alert(1)">Hi</p>');
    expect(html).not.toContain("onclick");
  });

  it("strips style attributes", () => {
    const { html } = sanitizeBody('<p style="color:red">Hi</p>');
    expect(html).not.toContain("style");
  });

  it("strips disallowed tags (img, h1, table) but keeps their text", () => {
    const { html } = sanitizeBody(
      '<h1>Title</h1><img src="x.jpg"><table><tr><td>cell</td></tr></table>',
    );
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<h1");
    expect(html).not.toContain("<table");
    expect(html).toContain("Title");
    expect(html).toContain("cell");
  });

  it("drops the href of a javascript: scheme link, leaving it non-clickable", () => {
    const { html } = sanitizeBody('<p><a href="javascript:alert(1)">click</a></p>');
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("href");
  });

  it("adds rel and target to an external link", () => {
    const { html } = sanitizeBody('<p><a href="https://example.com">ex</a></p>');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it("does not add rel/target to a same-origin link", () => {
    const { html } = sanitizeBody('<p><a href="http://localhost:3000/about">about</a></p>');
    expect(html).not.toContain("target=");
    expect(html).not.toContain("rel=");
  });

  it("reports empty text for formatting-only content (empty headings/list items)", () => {
    const { text } = sanitizeBody("<p></p><ul><li></li></ul><h2></h2>");
    expect(text).toBe("");
  });

  it("keeps Urdu text untouched", () => {
    const { html, text } = sanitizeBody("<p>فکر اقبال اور تعلیمی نظام</p>");
    expect(html).toContain("فکر اقبال اور تعلیمی نظام");
    expect(text).toBe("فکر اقبال اور تعلیمی نظام");
  });
});
