import { describe, expect, it } from "vitest";
import { admissionDefinition } from "./groups/admission";
import { changedPastDates } from "./past-dates";

const fields = admissionDefinition.fields;
const TODAY = "2026-10-24";

describe("changedPastDates (027)", () => {
  it("refuses a changed date that is before today, naming the field", () => {
    expect(changedPastDates(fields, { opensOn: "2026-10-23", closesOn: "2026-11-30" }, { opensOn: "", closesOn: "" }, TODAY)).toEqual(["opensOn"]);
    expect(changedPastDates(fields, { opensOn: "2026-10-01", closesOn: "2026-10-02" }, {}, TODAY)).toEqual(["opensOn", "closesOn"]);
  });

  it("accepts today and later days", () => {
    expect(changedPastDates(fields, { opensOn: TODAY, closesOn: "2026-10-25" }, {}, TODAY)).toEqual([]);
    expect(changedPastDates(fields, { opensOn: "2027-01-01", closesOn: "2027-03-31" }, {}, TODAY)).toEqual([]);
  });

  it("leaves a past date alone when it has not changed, so the rest of the panel can still be saved", () => {
    const stored = { opensOn: "2026-10-15", closesOn: "2026-10-31" };
    expect(changedPastDates(fields, { ...stored }, stored, TODAY)).toEqual([]);
    // Moving only the closing date: the past opening date is not a problem, a past closing date is.
    expect(changedPastDates(fields, { opensOn: "2026-10-15", closesOn: "2026-11-15" }, stored, TODAY)).toEqual([]);
    expect(changedPastDates(fields, { opensOn: "2026-10-15", closesOn: "2026-10-20" }, stored, TODAY)).toEqual(["closesOn"]);
  });

  it("allows clearing a date (an empty date means closed)", () => {
    expect(changedPastDates(fields, { opensOn: "", closesOn: "" }, { opensOn: "2026-10-15", closesOn: "2026-10-31" }, TODAY)).toEqual([]);
  });

  it("ignores fields that are not marked, and values that are not text", () => {
    expect(changedPastDates(fields, { announcement: "2020-01-01", opensOn: 5, closesOn: null }, {}, TODAY)).toEqual([]);
  });

  it("is switched on for the admission window's two dates only", () => {
    const flagged = fields.filter((field) => field.type === "date" && field.notBeforeToday).map((field) => field.key);
    expect(flagged).toEqual(["opensOn", "closesOn"]);
  });
});
