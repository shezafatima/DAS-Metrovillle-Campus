import { describe, expect, it } from "vitest";
import { careerApplicationFieldsSchema } from "./career-application";
import { fieldErrors } from "@/lib/validation/field-errors";

const valid = {
  name: "Ayesha Khan",
  email: "ayesha@example.com",
  phone: "03001234567",
  qualification: "M.Ed",
  consent: true,
};

describe("careerApplicationFieldsSchema", () => {
  it("accepts valid input and normalises it", () => {
    const result = careerApplicationFieldsSchema.safeParse({
      ...valid,
      name: "  Ayesha   Khan ",
      email: "  Ayesha@Example.COM ",
      qualification: "  M.Ed   (Hons) ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        name: "Ayesha Khan",
        email: "ayesha@example.com",
        phone: "+923001234567",
        qualification: "M.Ed (Hons)",
        consent: true,
      });
    }
  });

  it("keeps Urdu names and qualifications verbatim", () => {
    const result = careerApplicationFieldsSchema.safeParse({
      ...valid,
      name: "عائشہ خان",
      qualification: "ایم اے اردو",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("عائشہ خان");
      expect(result.data.qualification).toBe("ایم اے اردو");
    }
  });

  it.each(["0300-1234567", "+92 300 1234567", "92 300 1234567", "0300 123 4567"])(
    "normalises the phone %s to E.164",
    (phone) => {
      const result = careerApplicationFieldsSchema.safeParse({ ...valid, phone });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.phone).toBe("+923001234567");
    },
  );

  it("rejects a landline with the shared phone message", () => {
    const result = careerApplicationFieldsSchema.safeParse({ ...valid, phone: "042-35761234" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error).phone).toBe("Enter a Pakistani mobile number, e.g. 03001234567.");
    }
  });

  it("accepts the multipart string \"true\" for consent", () => {
    expect(careerApplicationFieldsSchema.safeParse({ ...valid, consent: "true" }).success).toBe(true);
  });

  it.each([undefined, false, "false", "on", "", "yes"])("rejects consent %p", (consent) => {
    const result = careerApplicationFieldsSchema.safeParse({ ...valid, consent });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).consent).toBe("Please tick the box to agree before applying.");
  });

  it("rejects a one-character name and an over-long qualification", () => {
    const result = careerApplicationFieldsSchema.safeParse({ ...valid, name: "A", qualification: "x".repeat(151) });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrors(result.error);
      expect(errors.name).toBe("Enter your full name.");
      expect(errors.qualification).toBe("Qualification must be 150 characters or fewer.");
    }
  });

  it("returns every field error together", () => {
    const result = careerApplicationFieldsSchema.safeParse({
      name: "",
      email: "nope",
      phone: "123",
      qualification: "",
      consent: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(fieldErrors(result.error)).sort()).toEqual(["consent", "email", "name", "phone", "qualification"]);
    }
  });
});
