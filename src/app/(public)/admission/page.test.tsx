import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const connection = vi.fn(async () => undefined);
const getAdmissionWindow = vi.fn();
const isAdmissionApplyOpen = vi.fn();

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
