import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdmissionWindowNotice } from "./admission-window-notice";

const line = (date: string) => `Applications close on ${date}`;
const OPEN = { kind: "open", closesOn: "2027-03-31" } as const;

describe("AdmissionWindowNotice (020 US3)", () => {
  it("while open, shows a status banner with the announcement and the closing date", () => {
    render(<AdmissionWindowNotice state={OPEN} announcement="Admissions are now open" closedMessage="Soon" closesOnLine={line} />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveAttribute("data-testid", "admission-banner");
    expect(banner.textContent).toBe("Admissions are now openApplications close on 31 March 2027");
    expect(screen.queryByText("Soon")).toBeNull();
  });

  it("while open without an announcement, shows only the closing date", () => {
    render(<AdmissionWindowNotice state={OPEN} announcement="" closedMessage="" closesOnLine={line} />);
    expect(screen.getByRole("status").textContent).toBe("Applications close on 31 March 2027");
  });

  it("while closed, shows the closed message as a quiet note", () => {
    render(<AdmissionWindowNotice state={{ kind: "closed" }} announcement="Open!" closedMessage="Admissions will open soon" closesOnLine={line} />);
    expect(screen.getByTestId("admission-closed-note").textContent).toBe("Admissions will open soon");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByText("Open!")).toBeNull();
  });

  it("treats not-yet-open as closed", () => {
    render(<AdmissionWindowNotice state={{ kind: "upcoming", opensOn: "2027-01-01" }} announcement="Open!" closedMessage="Soon" closesOnLine={line} />);
    expect(screen.getByTestId("admission-closed-note")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("while closed without a message, renders nothing", () => {
    const { container } = render(<AdmissionWindowNotice state={{ kind: "closed" }} announcement="" closedMessage="" closesOnLine={line} />);
    expect(container).toBeEmptyDOMElement();
  });
});
