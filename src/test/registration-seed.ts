import { StudentRegistration } from "@/models/student-registration";
import { duplicateKey } from "@/lib/registration/duplicate-key";
import { newReference } from "@/lib/registration/reference";

let counter = 0;

/** Inserts a registration straight into the collection (createdAt and deletedAt are settable). Test-only. */
export async function seedRegistration(overrides: Record<string, unknown> = {}): Promise<string> {
  counter += 1;
  const base = {
    reference: newReference(),
    studentName: `Student ${counter}`,
    fatherName: `Father ${counter}`,
    motherName: `Mother ${counter}`,
    email: `parent${counter}@example.com`,
    dateOfBirth: "2020-05-01",
    fatherMobile: `+92300${String(1000000 + counter)}`,
    motherMobile: null,
    address: "House 12, Street 4, Metroville",
    emergencyContact: { name: "Uncle", phone: "+923011234567" },
    className: "Class 1",
    motherTongue: "urdu",
    motherTongueOther: null,
    vaccinated: true,
    medicalHistory: null,
    referenceStudent: null,
    remarks: null,
    consentAt: new Date(),
    status: "new",
    history: [],
    deletedAt: null,
    deletedBy: null,
    createdAt: new Date(Date.now() - counter * 1000),
    updatedAt: new Date(),
    ...overrides,
  } as Record<string, unknown> & { studentName: string; dateOfBirth: string; fatherMobile: string | null };
  if (!("duplicateKey" in overrides)) {
    base.duplicateKey = duplicateKey({ studentName: base.studentName, dateOfBirth: base.dateOfBirth, fatherMobile: base.fatherMobile });
  }
  const result = await StudentRegistration.collection.insertOne(base as never);
  return result.insertedId.toString();
}
