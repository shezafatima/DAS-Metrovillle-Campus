// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { StudentRegistration } from "@/models/student-registration";
import type { RegistrationOutput } from "@/lib/validation/registration";
import { duplicateKey } from "./duplicate-key";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const newReferenceMock = vi.hoisted(() => vi.fn<() => string>());
vi.mock("./reference", () => ({ newReference: () => newReferenceMock() }));

const { createRegistration, ReferenceExhaustedError } = await import("./mutations");

const INPUT: RegistrationOutput = {
  studentName: "Zartasha Testchild",
  fatherName: "Imran Testfather",
  motherName: "Sana Testmother",
  email: "parent@example.com",
  dateOfBirth: "2020-05-01",
  fatherMobile: "+923001234567",
  motherMobile: null,
  address: "House 12, Street 4, Metroville",
  emergencyPhone: "+923011234567",
  className: "Class 1",
  motherTongue: "urdu",
  motherTongueOther: null,
  vaccinated: true,
  medicalHistory: "PeanutAllergyMarker",
  referenceStudent: null,
  remarks: null,
  consent: true,
};

let counter = 0;

describeWithDb("createRegistration", ["studentRegistrations"], () => {
  beforeEach(() => {
    counter = 0;
    newReferenceMock.mockReset();
    newReferenceMock.mockImplementation(() => `REF${String(++counter).padStart(5, "2")}`);
  });

  it("stores the normalised fields, status new, a server consentAt and the duplicate key", async () => {
    const now = new Date("2027-02-01T06:00:00.000Z");
    const { id, reference } = await createRegistration(INPUT, now);
    expect(reference).toBe("REF22221");

    const doc = await StudentRegistration.findById(id).lean();
    expect(doc).toMatchObject({
      reference,
      studentName: "Zartasha Testchild",
      fatherMobile: "+923001234567",
      motherMobile: null,
      emergencyPhone: "+923011234567",
      className: "Class 1",
      vaccinated: true,
      medicalHistory: "PeanutAllergyMarker",
      referenceStudent: null,
      status: "new",
      history: [],
      deletedAt: null,
    });
    expect(doc?.consentAt).toEqual(now);
    expect(doc?.createdAt).toBeInstanceOf(Date);
    expect(doc?.duplicateKey).toBe(duplicateKey({ studentName: INPUT.studentName, dateOfBirth: INPUT.dateOfBirth, fatherMobile: INPUT.fatherMobile }));
    // The input's consent flag is not stored; the server's timestamp is.
    expect(doc).not.toHaveProperty("consent");
  });

  it("a registration with no father's mobile gets no duplicate key", async () => {
    const { id } = await createRegistration({ ...INPUT, fatherMobile: null, motherMobile: "+923211234567" });
    expect((await StudentRegistration.findById(id).lean())?.duplicateKey).toBeNull();
  });

  it("never refuses a repeat: the same child twice creates two records", async () => {
    await createRegistration(INPUT);
    await createRegistration(INPUT);
    expect(await StudentRegistration.countDocuments({})).toBe(2);
  });

  it("retries with a new reference when the first is already taken", async () => {
    await createRegistration(INPUT); // takes REF22221
    newReferenceMock.mockReset();
    newReferenceMock.mockReturnValueOnce("REF22221").mockReturnValue("FRESH222");
    const { reference } = await createRegistration(INPUT);
    expect(reference).toBe("FRESH222");
    expect(newReferenceMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after 5 tries with ReferenceExhaustedError and stores nothing", async () => {
    await createRegistration(INPUT);
    const before = await StudentRegistration.countDocuments({});
    newReferenceMock.mockReset();
    newReferenceMock.mockReturnValue("REF22221");
    await expect(createRegistration(INPUT)).rejects.toBeInstanceOf(ReferenceExhaustedError);
    expect(newReferenceMock).toHaveBeenCalledTimes(5);
    expect(await StudentRegistration.countDocuments({})).toBe(before);
  });
});
