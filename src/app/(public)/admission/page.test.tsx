import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const connection = vi.fn(async () => undefined);
const getAdmissionWindow = vi.fn();
const isAdmissionApplyOpen = vi.fn();
// 014b: Class Levels is admin-managed; the page shows it only while it has rows.
const classLevels = vi.hoisted(() => ({
  ageReferenceDate: "07-31",
  ageHeader: "31 July",
  levels: [] as { id: string; name: string; ageRule: string }[],
}));
vi.mock("@/lib/settings/public", () => ({ getPublicSettings: async () => classLevels }));
vi.mock("@/lib/page-sections/dynamic-server", () => ({
  resolveDynamicSections: async () => ({ syllabi: false, examination: false, "class-levels": classLevels.levels.length > 0 }),
}));

vi.mock("next/server", () => ({ connection: () => connection() }));
vi.mock("@/lib/admission/server", () => ({
  getAdmissionWindow: () => getAdmissionWindow(),
  isAdmissionApplyOpen: () => isAdmissionApplyOpen(),
}));

const { default: AdmissionPage } = await import("./page");

const OPEN = { state: { kind: "open", closesOn: "2027-03-31" }, announcement: "Admissions are now open", closedMessage: "" };

async function renderPage() {
  render(await AdmissionPage());
}

beforeEach(() => {
  connection.mockClear();
  getAdmissionWindow.mockReset().mockResolvedValue(OPEN);
  isAdmissionApplyOpen.mockReset();
  classLevels.levels = [];
  classLevels.ageHeader = "31 July";
});

describe("/admission Class Levels (014b)", () => {
  it("has no Class Levels section while there are no rows", async () => {
    isAdmissionApplyOpen.mockResolvedValue(false);
    await renderPage();
    expect(screen.queryByRole("heading", { level: 2, name: "Class Levels" })).toBeNull();
    expect(document.getElementById("class-levels")).toBeNull();
  });

  it("shows it between the procedure and the uniform, with the age header naming the reference date", async () => {
    isAdmissionApplyOpen.mockResolvedValue(false);
    classLevels.ageHeader = "1 April";
    classLevels.levels = [
      { id: "a", name: "Playgroup", ageRule: "2½ to 3½ years" },
      { id: "b", name: "Class 1", ageRule: "5½ to 6½ years" },
    ];
    await renderPage();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Admission Procedure", "Class Levels", "Uniform"]);
    expect(document.querySelector("#class-levels table")).not.toBeNull();
    expect(screen.getAllByText("Age on 1 April").length).toBeGreaterThan(0);
  });

  it("gives the Uniform section the other background so two muted bands never touch", async () => {
    isAdmissionApplyOpen.mockResolvedValue(false);
    await renderPage();
    expect(document.getElementById("uniform")).toHaveAttribute("data-background", "muted");
    classLevels.levels = [{ id: "a", name: "Playgroup", ageRule: "x" }];
    document.body.innerHTML = "";
    await renderPage();
    expect(document.getElementById("class-levels")).toHaveAttribute("data-background", "muted");
    expect(document.getElementById("uniform")).toHaveAttribute("data-background", "surface");
  });
});

describe("/admission (020)", () => {
  it("renders per request, with one h1 and the two sections in order", async () => {
    isAdmissionApplyOpen.mockResolvedValue(false);
    await renderPage();
    expect(connection).toHaveBeenCalled();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Admission Procedure", "Uniform"]);
  });

  it("shows Apply Now, below the procedure, only when isAdmissionApplyOpen() says so", async () => {
    isAdmissionApplyOpen.mockResolvedValue(true);
    await renderPage();
    const apply = screen.getAllByTestId("admission-apply");
    expect(apply).toHaveLength(1);
    expect(apply[0]).toHaveAttribute("href", "/admission/register");
    const steps = screen.getAllByTestId("procedure-step");
    // The button follows the last procedure step.
    expect(steps.at(-1)!.compareDocumentPosition(apply[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows nothing in its place when isAdmissionApplyOpen() is false, even with the window open", async () => {
    isAdmissionApplyOpen.mockResolvedValue(false);
    await renderPage();
    expect(screen.queryByTestId("admission-apply")).toBeNull();
    expect(screen.queryByText(/coming soon/i)).toBeNull();
    expect(screen.getByTestId("admission-banner")).toBeInTheDocument();
  });

  it("reads the Apply decision only through isAdmissionApplyOpen(): no page code imports the registration flag", () => {
    const roots = [path.join(process.cwd(), "src/app/(public)/admission"), path.join(process.cwd(), "src/components/admission")];
    const files = roots.flatMap(function walk(dir: string): string[] {
      return readdirSync(dir).flatMap((name) => {
        const full = path.join(dir, name);
        return statSync(full).isDirectory() ? walk(full) : [full];
      });
    });
    const offenders = files.filter((file) => !file.endsWith(".test.tsx") && /registrationFormExists|content\/admission\/registration/.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});
