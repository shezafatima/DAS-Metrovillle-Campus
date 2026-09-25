import { describe, expect, it } from "vitest";
import { messageInputSchema, messageStatusUpdateSchema, MESSAGE_MAX_LENGTH } from "@/lib/validation/message";

function valid(overrides: Record<string, unknown> = {}) {
  return {
    name: "Ali Khan",
    email: "ali@example.com",
    phone: "",
    subject: "Admission",
    message: "Hello there.",
    ...overrides,
  };
}

describe("messageInputSchema", () => {
  it("requires name, subject and message (whitespace-only counts as empty)", () => {
    const result = messageInputSchema.safeParse(valid({ name: "   ", subject: "   ", message: "   " }));
    expect(result.success).toBe(false);
    if (result.success) return;
    const fields = Object.fromEntries(result.error.issues.map((i) => [i.path.join("."), i.message]));
    expect(fields.name).toBe("Name is required.");
    expect(fields.subject).toBe("Subject is required.");
    expect(fields.message).toBe("Message is required.");
  });

  it("collapses inner whitespace in name", () => {
    const result = messageInputSchema.safeParse(valid({ name: "  Ali   Khan " }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Ali Khan");
  });

  it("rejects an over-length name, subject and message with the matching limit messages", () => {
    const result = messageInputSchema.safeParse(
      valid({ name: "a".repeat(101), subject: "b".repeat(151), message: "c".repeat(5001) }),
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    const fields = Object.fromEntries(result.error.issues.map((i) => [i.path.join("."), i.message]));
    expect(fields.name).toBe("Name must be 100 characters or fewer.");
    expect(fields.subject).toBe("Subject must be 150 characters or fewer.");
    expect(fields.message).toBe("Message must be 5,000 characters or fewer.");
  });

  it("accepts a message of exactly 5,000 characters", () => {
    const result = messageInputSchema.safeParse(valid({ message: "x".repeat(MESSAGE_MAX_LENGTH) }));
    expect(result.success).toBe(true);
  });

  it("trims and lower-cases the email", () => {
    const result = messageInputSchema.safeParse(valid({ email: " Ali@Example.COM " }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("ali@example.com");
  });

  describe("phone", () => {
    it.each([undefined, "", "   "])("normalises %p to null", (phone) => {
      const result = messageInputSchema.safeParse(valid({ phone }));
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.phone).toBeNull();
    });

    it.each(["03001234567", "0300-1234567", "+92 300 1234567", "92 300 1234567"])(
      "normalises %s to +923001234567",
      (phone) => {
        const result = messageInputSchema.safeParse(valid({ phone }));
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.phone).toBe("+923001234567");
      },
    );

    it("rejects a landline", () => {
      const result = messageInputSchema.safeParse(valid({ phone: "042-35761234" }));
      expect(result.success).toBe(false);
      if (result.success) return;
      const fields = Object.fromEntries(result.error.issues.map((i) => [i.path.join("."), i.message]));
      expect(fields.phone).toBe("Enter a Pakistani mobile number, e.g. 03001234567.");
    });
  });

  describe("message newline handling", () => {
    it("normalises CRLF and CR to LF", () => {
      const result = messageInputSchema.safeParse(valid({ message: "a\r\nb\rc" }));
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.message).toBe("a\nb\nc");
    });

    it("keeps inner blank lines", () => {
      const result = messageInputSchema.safeParse(valid({ message: "a\n\nb" }));
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.message).toBe("a\n\nb");
    });
  });

  it("passes Urdu name, subject and message through unchanged", () => {
    const result = messageInputSchema.safeParse(
      valid({ name: "علی خان", subject: "داخلہ", message: "پہلا پیراگراف\n\nدوسرا پیراگراف" }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("علی خان");
      expect(result.data.subject).toBe("داخلہ");
      expect(result.data.message).toBe("پہلا پیراگراف\n\nدوسرا پیراگراف");
    }
  });
});

describe("messageStatusUpdateSchema", () => {
  it("accepts a known status", () => {
    expect(messageStatusUpdateSchema.safeParse({ status: "responded" }).success).toBe(true);
  });

  it("rejects an unknown status", () => {
    const result = messageStatusUpdateSchema.safeParse({ status: "archived" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.message).toBe("Choose New, Read or Responded.");
  });
});
