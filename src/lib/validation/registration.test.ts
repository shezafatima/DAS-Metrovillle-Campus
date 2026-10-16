// @vitest-environment node
import { describe, expect, it } from "vitest";
import { registrationCopy } from "@/content/registration";
import { fieldErrors } from "@/lib/validation/field-errors";
import { buildRegistrationSchema } from "./registration";

const messages = registrationCopy.fieldErrors;
const CLASSES = ["Playgroup", "Nursery", "Class 1"];
const TODAY = "2027-03-10";

const schema = buildRegistrationSchema({ classes: CLASSES, today: TODAY });

function valid(overrides: Record<string, unknown> = {}) {
  return {
    studentName: "Zartasha Testchild",
    fatherName: "Imran Testfather",
    motherName: "Sana Testmother",
    email: "Parent@Example.com",
    dateOfBirth: "2020-05-01",
    fatherMobile: "0300 1234567",
    motherMobile: "",
    address: "House 12, Street 4, Metroville",
    emergencyName: "Uncle Testuncle",
    emergencyPhone: "03011234567",
    className: "Class 1",
    motherTongue: "urdu",
    motherTongueOther: "",
    vaccinated: "yes",
    medicalHistory: "",
    referenceName: "",
    referenceClass: "",
    referenceRelation: "",
    remarks: "",
    consent: true,
    ...overrides,
  };
}

function errorsFor(input: unknown, s: ReturnType<typeof buildRegistrationSchema> = schema): Record<string, string> {
  const result = s.safeParse(input);
  if (result.success) return {};
  return fieldErrors(result.error);
}

function ok(input: unknown, s: ReturnType<typeof buildRegistrationSchema> = schema) {
  const result = s.safeParse(input);
  if (!result.success) throw new Error(JSON.stringify(fieldErrors(result.error)));
  return result.data;
}

describe("buildRegistrationSchema: a valid submission", () => {
  it("is accepted and shaped for the model", () => {
    expect(ok(valid())).toEqual({
      studentName: "Zartasha Testchild",
      fatherName: "Imran Testfather",
      motherName: "Sana Testmother",
      email: "parent@example.com",
      dateOfBirth: "2020-05-01",
      fatherMobile: "+923001234567",
      motherMobile: null,
      address: "House 12, Street 4, Metroville",
      emergencyContact: { name: "Uncle Testuncle", phone: "+923011234567" },
      className: "Class 1",
      motherTongue: "urdu",
      motherTongueOther: null,
      vaccinated: true,
      medicalHistory: null,
      referenceStudent: null,
      remarks: null,
      consent: true,
    });
  });

  it("accepts Urdu names", () => {
    const data = ok(valid({ studentName: "زرتاشہ احمد", fatherName: "عمران احمد", motherName: "ثناء احمد" }));
    expect(data.studentName).toBe("زرتاشہ احمد");
  });

  it("drops a submitted date, status, reference or any other unknown key", () => {
    const data = ok(valid({ createdAt: "2001-01-01", status: "admitted", reference: "AAAAAAAA", submittedAt: "x", isAdmin: true }));
    expect(data).not.toHaveProperty("createdAt");
    expect(data).not.toHaveProperty("status");
    expect(data).not.toHaveProperty("reference");
    expect(data).not.toHaveProperty("isAdmin");
  });

  it("stores markup as typed", () => {
    expect(ok(valid({ remarks: "<b>x</b>" })).remarks).toBe("<b>x</b>");
  });
});

describe("required fields", () => {
  it.each([
    ["studentName", messages.studentName],
    ["fatherName", messages.fatherName],
    ["motherName", messages.motherName],
    ["email", messages.email],
    ["dateOfBirth", messages.dateOfBirth],
    ["address", messages.address],
    ["emergencyName", messages.emergencyName],
    ["emergencyPhone", messages.emergencyPhone],
    ["className", messages.className],
    ["motherTongue", messages.motherTongue],
    ["vaccinated", messages.vaccinated],
    ["consent", messages.consent],
  ])("%s empty or missing", (key, message) => {
    expect(errorsFor(valid({ [key]: "" }))[key]).toBe(message);
    const missing = valid() as Record<string, unknown>;
    delete missing[key];
    expect(errorsFor(missing)[key]).toBe(message);
  });
});

describe("text length boundaries", () => {
  it.each(["studentName", "fatherName", "motherName", "emergencyName"])("%s: 1 char refused, 2 and 100 accepted, 101 refused", (key) => {
    expect(errorsFor(valid({ [key]: "A" }))[key]).toBeDefined();
    expect(errorsFor(valid({ [key]: "Al" }))[key]).toBeUndefined();
    expect(errorsFor(valid({ [key]: "a".repeat(100) }))[key]).toBeUndefined();
    expect(errorsFor(valid({ [key]: "a".repeat(101) }))[key]).toBeDefined();
  });

  it("address: 9 refused, 10 and 300 accepted, 301 refused", () => {
    expect(errorsFor(valid({ address: "a".repeat(9) })).address).toBe(messages.address);
    expect(errorsFor(valid({ address: "a".repeat(10) })).address).toBeUndefined();
    expect(errorsFor(valid({ address: "a".repeat(300) })).address).toBeUndefined();
    expect(errorsFor(valid({ address: "a".repeat(301) })).address).toBe(messages.address);
  });

  it("medical history and remarks: 1000 accepted, 1001 refused, empty becomes null", () => {
    expect(errorsFor(valid({ medicalHistory: "a".repeat(1000), remarks: "a".repeat(1000) }))).toEqual({});
    expect(errorsFor(valid({ medicalHistory: "a".repeat(1001) })).medicalHistory).toBe(messages.medicalHistory);
    expect(errorsFor(valid({ remarks: "a".repeat(1001) })).remarks).toBe(messages.remarks);
    const data = ok(valid({ medicalHistory: "   ", remarks: "" }));
    expect(data.medicalHistory).toBeNull();
    expect(data.remarks).toBeNull();
  });

  it("collapses spaces in single-line fields and keeps line breaks in text areas", () => {
    const data = ok(valid({ studentName: "  Zartasha    Testchild ", address: "Line one   here\r\n\r\n\r\n\r\nLine   two" }));
    expect(data.studentName).toBe("Zartasha Testchild");
    expect(data.address).toBe("Line one here\n\nLine two");
  });

  it("measures length after clean-up", () => {
    expect(errorsFor(valid({ studentName: "  A  " })).studentName).toBe(messages.studentName);
  });
});

describe("email", () => {
  it("is lower-cased and trimmed", () => {
    expect(ok(valid({ email: "  Parent@Example.COM " })).email).toBe("parent@example.com");
  });

  it("refuses a malformed address and one over 254 characters", () => {
    expect(errorsFor(valid({ email: "not-an-email" })).email).toBe(messages.email);
    expect(errorsFor(valid({ email: `${"a".repeat(250)}@example.com` })).email).toBe(messages.email);
  });
});

describe("date of birth (age 2 to 18 on the Pakistan date)", () => {
  const dob = (value: string) => errorsFor(valid({ dateOfBirth: value })).dateOfBirth;

  it("accepts a child who turns 2 today and refuses one who turns 2 tomorrow", () => {
    expect(dob("2025-03-10")).toBeUndefined();
    expect(dob("2025-03-11")).toBe(messages.dateOfBirthAge);
  });

  it("accepts 18 years and 364 days and refuses the 19th birthday", () => {
    expect(dob("2008-03-11")).toBeUndefined();
    expect(dob("2008-03-10")).toBe(messages.dateOfBirthAge);
  });

  it("refuses a future date with its own message", () => {
    expect(dob("2027-03-11")).toBe(messages.dateOfBirthFuture);
  });

  it("refuses an impossible or malformed date", () => {
    expect(dob("2021-02-30")).toBe(messages.dateOfBirth);
    expect(dob("10/05/2020")).toBe(messages.dateOfBirth);
  });

  it("uses the supplied today, not the clock", () => {
    const later = buildRegistrationSchema({ classes: CLASSES, today: "2040-01-01" });
    expect(errorsFor(valid({ dateOfBirth: "2020-05-01" }), later).dateOfBirth).toBe(messages.dateOfBirthAge);
  });
});

describe("mobiles", () => {
  it.each([
    ["03001234567", "+923001234567"],
    ["0300-1234567", "+923001234567"],
    ["+92 300 1234567", "+923001234567"],
    ["923001234567", "+923001234567"],
    ["(0300) 123.4567", "+923001234567"],
  ])("normalises %s", (typed, stored) => {
    expect(ok(valid({ fatherMobile: typed })).fatherMobile).toBe(stored);
  });

  it("refuses a landline with the shared message, on the field", () => {
    expect(errorsFor(valid({ fatherMobile: "02112345678" })).fatherMobile).toBe(messages.phone);
    expect(errorsFor(valid({ emergencyPhone: "02112345678" })).emergencyPhone).toBe(messages.emergencyPhone);
  });

  it("both parents' mobiles empty puts the message on both fields", () => {
    const errors = errorsFor(valid({ fatherMobile: "", motherMobile: "  " }));
    expect(errors.fatherMobile).toBe(messages.parentMobile);
    expect(errors.motherMobile).toBe(messages.parentMobile);
  });

  it("accepts the mother's mobile alone", () => {
    const data = ok(valid({ fatherMobile: "", motherMobile: "03211234567" }));
    expect(data.fatherMobile).toBeNull();
    expect(data.motherMobile).toBe("+923211234567");
  });

  it("an invalid father's mobile does not mark the empty mother's field", () => {
    const errors = errorsFor(valid({ fatherMobile: "123", motherMobile: "" }));
    expect(errors.fatherMobile).toBe(messages.phone);
    expect(errors.motherMobile).toBeUndefined();
  });
});

describe("class", () => {
  it("must be in the current list", () => {
    expect(errorsFor(valid({ className: "Class 9" })).className).toBe(messages.className);
    expect(errorsFor(valid({ className: "class 1" })).className).toBe(messages.className);
    expect(ok(valid({ className: "Nursery" })).className).toBe("Nursery");
  });

  it("is refused when the list is empty", () => {
    const empty = buildRegistrationSchema({ classes: [], today: TODAY });
    expect(errorsFor(valid(), empty).className).toBe(messages.className);
  });

  it("is stored as the list spells it", () => {
    const spaced = buildRegistrationSchema({ classes: ["Class  1"], today: TODAY });
    expect(ok(valid({ className: "Class 1" }), spaced).className).toBe("Class  1");
  });
});

describe("mother tongue", () => {
  it("refuses an unknown language", () => {
    expect(errorsFor(valid({ motherTongue: "klingon" })).motherTongue).toBe(messages.motherTongue);
  });

  it("Other without text is refused", () => {
    expect(errorsFor(valid({ motherTongue: "other", motherTongueOther: "" })).motherTongueOther).toBe(messages.motherTongueOther);
    expect(errorsFor(valid({ motherTongue: "other", motherTongueOther: "a" })).motherTongueOther).toBe(messages.motherTongueOther);
  });

  it("Other with text keeps it (2 to 50 characters)", () => {
    expect(ok(valid({ motherTongue: "other", motherTongueOther: "Hindko" })).motherTongueOther).toBe("Hindko");
    expect(errorsFor(valid({ motherTongue: "other", motherTongueOther: "a".repeat(51) })).motherTongueOther).toBe(messages.motherTongueOther);
  });

  it("discards the Other text when another language is chosen", () => {
    const data = ok(valid({ motherTongue: "urdu", motherTongueOther: "Hindko" }));
    expect(data.motherTongueOther).toBeNull();
  });
});

describe("vaccinated", () => {
  it("maps yes and no to a boolean", () => {
    expect(ok(valid({ vaccinated: "yes" })).vaccinated).toBe(true);
    expect(ok(valid({ vaccinated: "no" })).vaccinated).toBe(false);
  });

  it("refuses anything else", () => {
    expect(errorsFor(valid({ vaccinated: "maybe" })).vaccinated).toBe(messages.vaccinated);
  });
});

describe("reference student (all or none)", () => {
  it("none filled gives null, spaces only counts as empty", () => {
    expect(ok(valid()).referenceStudent).toBeNull();
    expect(ok(valid({ referenceName: "   ", referenceClass: " ", referenceRelation: "" })).referenceStudent).toBeNull();
  });

  it("all three filled is kept", () => {
    expect(ok(valid({ referenceName: "Ali Khan", referenceClass: "Class 5", referenceRelation: "Cousin" })).referenceStudent).toEqual({
      name: "Ali Khan",
      className: "Class 5",
      relation: "Cousin",
    });
  });

  it("one of three filled marks the two empty ones", () => {
    const errors = errorsFor(valid({ referenceName: "Ali Khan" }));
    expect(errors.referenceClass).toBe(messages.reference);
    expect(errors.referenceRelation).toBe(messages.reference);
    expect(errors.referenceName).toBeUndefined();
  });

  it("two of three filled marks the empty one", () => {
    const errors = errorsFor(valid({ referenceName: "Ali Khan", referenceClass: "Class 5" }));
    expect(errors).toEqual({ referenceRelation: messages.reference });
  });

  it("each filled value must be 2 to 100 characters", () => {
    expect(errorsFor(valid({ referenceName: "A", referenceClass: "Class 5", referenceRelation: "Cousin" })).referenceName).toBe(messages.referenceLength);
    expect(errorsFor(valid({ referenceName: "a".repeat(101), referenceClass: "Class 5", referenceRelation: "Cousin" })).referenceName).toBe(messages.referenceLength);
  });
});

describe("consent", () => {
  it('accepts true and the string "true"', () => {
    expect(ok(valid({ consent: true })).consent).toBe(true);
    expect(ok(valid({ consent: "true" })).consent).toBe(true);
  });

  it("refuses false and anything else", () => {
    expect(errorsFor(valid({ consent: false })).consent).toBe(messages.consent);
    expect(errorsFor(valid({ consent: "on" })).consent).toBe(messages.consent);
  });
});

describe("all errors at once", () => {
  it("an empty form reports every required field together", () => {
    const errors = errorsFor({});
    for (const key of [
      "studentName",
      "fatherName",
      "motherName",
      "email",
      "dateOfBirth",
      "fatherMobile",
      "motherMobile",
      "address",
      "emergencyName",
      "emergencyPhone",
      "className",
      "motherTongue",
      "vaccinated",
      "consent",
    ]) {
      expect(errors[key], key).toBeDefined();
    }
  });
});
