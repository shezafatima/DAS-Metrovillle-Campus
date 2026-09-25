import { describe, expect, it } from "vitest";
import { z } from "zod";
import { collapseSpaces, fieldErrors } from "@/lib/validation/field-errors";

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
