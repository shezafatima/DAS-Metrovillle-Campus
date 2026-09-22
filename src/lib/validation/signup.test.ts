import { describe, expect, it } from "vitest";
import { fieldErrors, signupInputSchema } from "./signup";

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Ali Khan",
    email: "ali@example.com",
    phone: "03001234567",
    source: "home",
    ...overrides,
  };
}

describe("signupInputSchema — name", () => {
  it("rejects whitespace-only name as required", () => {
    const result = signupInputSchema.safeParse(validInput({ name: "   " }));
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!).name).toBe("Name is required.");
  });

  it("trims and collapses internal whitespace", () => {
    const result = signupInputSchema.safeParse(validInput({ name: "  Ali   Khan " }));
    expect(result.success).toBe(true);
    expect(result.data!.name).toBe("Ali Khan");
  });

  it("rejects a name over 100 characters", () => {
    const result = signupInputSchema.safeParse(validInput({ name: "a".repeat(101) }));
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!).name).toBe("Name must be 100 characters or fewer.");
  });

  it("accepts an Urdu name unchanged", () => {
    const result = signupInputSchema.safeParse(validInput({ name: "علی خان" }));
    expect(result.success).toBe(true);
    expect(result.data!.name).toBe("علی خان");
  });
});

describe("signupInputSchema — email", () => {
  it("trims and lower-cases", () => {
    const result = signupInputSchema.safeParse(validInput({ email: " Ali@Example.COM " }));
    expect(result.success).toBe(true);
    expect(result.data!.email).toBe("ali@example.com");
  });

  it("rejects a malformed email", () => {
    const result = signupInputSchema.safeParse(validInput({ email: "ali@example" }));
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!).email).toBe("Enter a valid email address.");
  });

  it("rejects an email over 254 characters", () => {
    const longLocal = "a".repeat(250);
    const result = signupInputSchema.safeParse(validInput({ email: `${longLocal}@example.com` }));
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!).email).toBe("Enter a valid email address.");
  });

  it("treats casing/spacing variants of the same address as the same value", () => {
    const emails = ["Ali@Example.COM", " ali@example.com ", "ALI@EXAMPLE.COM"];
    const parsed = emails.map((email) => signupInputSchema.safeParse(validInput({ email })).data?.email);
    expect(new Set(parsed).size).toBe(1);
    expect(parsed[0]).toBe("ali@example.com");
  });
});

describe("signupInputSchema — phone", () => {
  it.each(["03001234567", "0300-1234567", "+92 300 1234567", "92 300 1234567"])(
    "accepts %s and normalises to +923001234567",
    (phone) => {
      const result = signupInputSchema.safeParse(validInput({ phone }));
      expect(result.success).toBe(true);
      expect(result.data!.phone).toBe("+923001234567");
    },
  );

  it("rejects a landline with a phone-field message", () => {
    const result = signupInputSchema.safeParse(validInput({ phone: "021-12345678" }));
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!).phone).toBe("Enter a Pakistani mobile number, e.g. 03001234567.");
  });
});

describe("signupInputSchema — source", () => {
  it("rejects an unknown page", () => {
    const result = signupInputSchema.safeParse(validInput({ source: "admission" }));
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!).source).toBe("Unknown page.");
  });

  it("accepts home and resources", () => {
    expect(signupInputSchema.safeParse(validInput({ source: "home" })).success).toBe(true);
    expect(signupInputSchema.safeParse(validInput({ source: "resources" })).success).toBe(true);
  });
});

describe("fieldErrors", () => {
  it("returns one message per failing field and nothing for passing ones", () => {
    const result = signupInputSchema.safeParse({
      name: "",
      email: "ali@example.com",
      phone: "not-a-phone",
      source: "home",
    });
    expect(result.success).toBe(false);
    const errors = fieldErrors(result.error!);
    expect(Object.keys(errors).sort()).toEqual(["name", "phone"]);
  });
});
