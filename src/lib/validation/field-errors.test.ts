import { describe, expect, it } from "vitest";
import { z } from "zod";
import { collapseInlineSpaces, collapseSpaces, fieldErrors } from "@/lib/validation/field-errors";

describe("collapseInlineSpaces", () => {
  it("normalises CRLF and CR to LF", () => {
    expect(collapseInlineSpaces("a\r\nb\rc")).toBe("a\nb\nc");
  });

  it("trims the whole value and each line", () => {
    expect(collapseInlineSpaces("  a  \n  b  ")).toBe("a\nb");
  });

  it("collapses runs of spaces and tabs inside a line", () => {
    expect(collapseInlineSpaces("a \t  b")).toBe("a b");
  });

  it("collapses 3 or more newlines to 2 and keeps a single blank line", () => {
    expect(collapseInlineSpaces("a\n\n\n\nb")).toBe("a\n\nb");
    expect(collapseInlineSpaces("a\n\nb")).toBe("a\n\nb");
  });

  it("returns an empty string for whitespace only", () => {
    expect(collapseInlineSpaces(" \n\t ")).toBe("");
  });
});

describe("collapseSpaces", () => {
  it("collapses inner whitespace runs and trims", () => {
    expect(collapseSpaces("  Ali   Khan ")).toBe("Ali Khan");
  });
});

describe("fieldErrors", () => {
  const schema = z.object({
    name: z.string().min(1, "Name is required."),
    email: z.string().min(1, "Email is required."),
    nested: z.object({ value: z.string().min(1, "Value is required.") }),
  });

  it("returns one message per failing top-level field, first message wins", () => {
    const result = schema.safeParse({ name: "", email: "", nested: { value: "" } });
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = fieldErrors(result.error);
    expect(errors.name).toBe("Name is required.");
    expect(errors.email).toBe("Email is required.");
    expect(Object.keys(errors)).toHaveLength(3);
  });

  it("joins nested paths with a dot", () => {
    const result = schema.safeParse({ name: "Ali", email: "a@b.com", nested: { value: "" } });
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = fieldErrors(result.error);
    expect(errors["nested.value"]).toBe("Value is required.");
  });
});
