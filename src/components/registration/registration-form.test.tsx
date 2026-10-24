import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { registrationCopy } from "@/content/registration";
import { RegistrationForm } from "./registration-form";

vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

const CLASSES = ["Playgroup", "Nursery", "Class 1"];

function renderForm(months = 12) {
  return render(<RegistrationForm classes={CLASSES} today="2027-03-10" retentionMonths={months} />);
}

function type(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

/** The message shown next to a field (the error summary repeats it, so getByText would match both). */
const inlineError = (key: string) => document.getElementById("registration-" + key + "-error");

function fillValid() {
  type(/Student's name/, "Zartasha Testchild");
  type(/Date of birth/, "2020-05-01");
  type(/Admission for class/, "Class 1");
  type(/Father's name/, "Imran Testfather");
  type(/Mother's name/, "Sana Testmother");
  type(/Father's mobile/, "03001234567");
  type(/^Email address/, "parent@example.com");
  type(/^Address/, "House 12, Street 4, Metroville");
  type(/Emergency contact number/, "03011234567");
  fireEvent.click(screen.getByLabelText("Yes"));
  type(/Mother tongue/, "urdu");
  fireEvent.click(screen.getByLabelText(registrationCopy.privacy.consent));
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("RegistrationForm", () => {
  it("renders the six sections as labelled fieldsets", () => {
    renderForm();
    const legends = Array.from(document.querySelectorAll("fieldset > legend")).map((legend) => legend.textContent);
    expect(legends).toEqual(["Student", "Parents", "Contact & address", "Health", "Reference", "Remarks"]);
  });

  it("shows the medical history helper text and the class list in order", () => {
    renderForm();
    expect(screen.getByText("Allergies, conditions or medication the school should know about")).toBeInTheDocument();
    const options = Array.from((screen.getByLabelText(/Admission for class/) as HTMLSelectElement).options).map((option) => option.textContent);
    expect(options).toEqual(["Choose a class", ...CLASSES]);
  });

  it("shows the Other input only while Other is chosen and clears it when another language is picked", () => {
    renderForm();
    expect(screen.queryByLabelText(/please write it/)).toBeNull();
    type(/Mother tongue/, "other");
    type(/please write it/, "Hindko");
    type(/Mother tongue \(please/, "Hindko");
    type(/^Mother tongue \*/, "urdu");
    expect(screen.queryByLabelText(/please write it/)).toBeNull();
    type(/^Mother tongue \*/, "other");
    expect((screen.getByLabelText(/please write it/) as HTMLInputElement).value).toBe("");
  });

  it("an empty submit shows a message on required fields and keeps typed values", async () => {
    renderForm();
    type(/Student's name/, "Zartasha Testchild");
    fireEvent.click(screen.getByRole("button", { name: registrationCopy.submit }));
    await waitFor(() => expect(inlineError("fatherName")).toHaveTextContent(registrationCopy.fieldErrors.fatherName));
    expect(inlineError("email")).toHaveTextContent(registrationCopy.fieldErrors.email);
    expect(inlineError("consent")).toHaveTextContent(registrationCopy.fieldErrors.consent);
    expect((screen.getByLabelText(/Student's name/) as HTMLInputElement).value).toBe("Zartasha Testchild");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("both parents' mobiles empty marks both fields", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: registrationCopy.submit }));
    await waitFor(() => expect(inlineError("fatherMobile")).toHaveTextContent(registrationCopy.fieldErrors.parentMobile));
    expect(inlineError("motherMobile")).toHaveTextContent(registrationCopy.fieldErrors.parentMobile);
    expect(screen.getByLabelText(/Father's mobile/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/Mother's mobile/)).toHaveAttribute("aria-invalid", "true");
  });

  it("error messages use the body font", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: registrationCopy.submit }));
    await waitFor(() => expect(inlineError("fatherName")).not.toBeNull());
    expect(inlineError("fatherName")?.className).toContain("font-body");
  });

  it("a 200 resets the form and shows the reference", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true, reference: "K7MQ2XRT" }), { status: 200 }));
    renderForm();
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: registrationCopy.submit }));
    await waitFor(() => expect(screen.getByTestId("registration-reference")).toHaveTextContent("K7MQ2XRT"));
    expect(screen.queryByRole("button", { name: registrationCopy.submit })).toBeNull();
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(sent.fatherMobile).toBe("03001234567");
    expect(sent.consent).toBe(true);
  });

  it("a 403 shows the closed banner and keeps the values", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "closed", message: "Admissions are closed. Please check the Admission page for dates." }), { status: 403 }));
    renderForm();
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: registrationCopy.submit }));
    await waitFor(() => expect(document.querySelector('p[role="alert"]')).toHaveTextContent("Admissions are closed."));
    expect((screen.getByLabelText(/Student's name/) as HTMLInputElement).value).toBe("Zartasha Testchild");
  });

  it("a 429 and a 503 show their banners and keep the values", async () => {
    renderForm();
    fillValid();
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 429 }));
    fireEvent.click(screen.getByRole("button", { name: registrationCopy.submit }));
    await waitFor(() => expect(document.querySelector('p[role="alert"]')).toHaveTextContent(registrationCopy.banners.rateLimited));
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 503 }));
    fireEvent.click(screen.getByRole("button", { name: registrationCopy.submit }));
    await waitFor(() => expect(document.querySelector('p[role="alert"]')).toHaveTextContent(registrationCopy.banners.unavailable));
    expect((screen.getByLabelText(/Father's name/) as HTMLInputElement).value).toBe("Imran Testfather");
  });

  it("server field errors from a 400 appear next to the field", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "validation", fields: { className: registrationCopy.fieldErrors.className } }), { status: 400 }));
    renderForm();
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: registrationCopy.submit }));
    await waitFor(() => expect(inlineError("className")).toHaveTextContent(registrationCopy.fieldErrors.className));
  });

  describe("error summary (026)", () => {
    it("after a failed submit lists each problem as a link, takes focus itself, and a link moves focus to its field", async () => {
      renderForm();
      fireEvent.click(screen.getByRole("button", { name: registrationCopy.submit }));
      const summary = await screen.findByTestId("error-summary");
      expect(summary).toHaveAccessibleName("Please fix the following");
      await waitFor(() => expect(document.activeElement).toBe(summary));
      const link = within(summary).getByRole("link", { name: registrationCopy.fieldErrors.fatherName });
      expect(link).toHaveAttribute("href", "#registration-fatherName");
      // In page order: the student's name comes before the father's.
      const hrefs = within(summary).getAllByRole("link").map((a) => a.getAttribute("href"));
      expect(hrefs.indexOf("#registration-studentName")).toBeLessThan(hrefs.indexOf("#registration-fatherName"));
      fireEvent.click(link);
      expect(document.activeElement).toBe(document.getElementById("registration-fatherName"));
    });

    it("shows nothing before a submit, is not a role=alert (the banner is the only alert), and disappears as problems are fixed", async () => {
      renderForm();
      expect(screen.queryByTestId("error-summary")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: registrationCopy.submit }));
      const summary = await screen.findByTestId("error-summary");
      expect(summary).not.toHaveAttribute("role", "alert");
      type(/Student's name/, "Zartasha Testchild");
      expect(within(screen.getByTestId("error-summary")).queryByRole("link", { name: registrationCopy.fieldErrors.studentName })).toBeNull();
    });
  });

  describe("double submit (026)", () => {
    it("sends once however fast the button is clicked, shows Submitting with a spinner, and is disabled", async () => {
      let finish: (response: Response) => void = () => {};
      fetchMock.mockReturnValue(new Promise<Response>((resolve) => { finish = resolve; }));
      renderForm();
      fillValid();
      const form = document.querySelector("form") as HTMLFormElement;
      fireEvent.submit(form);
      fireEvent.submit(form);
      fireEvent.submit(form);
      const button = await screen.findByRole("button", { name: "Submitting…" });
      expect(button).toBeDisabled();
      expect(button.querySelector("svg[aria-hidden='true']")).not.toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      finish(new Response(JSON.stringify({ ok: true, reference: "K7MQ2XRT" }), { status: 200 }));
      await waitFor(() => expect(screen.getByText("K7MQ2XRT")).toBeInTheDocument());
    });

    it("can be sent again after a failure", async () => {
      fetchMock.mockResolvedValue(new Response("{}", { status: 503 }));
      renderForm();
      fillValid();
      fireEvent.click(screen.getByRole("button", { name: registrationCopy.submit }));
      await waitFor(() => expect(document.querySelector('p[role="alert"]')).toHaveTextContent(registrationCopy.banners.unavailable));
      fetchMock.mockResolvedValue(new Response("{}", { status: 503 }));
      fireEvent.click(screen.getByRole("button", { name: registrationCopy.submit }));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    });
  });

  describe("progress (026)", () => {
    const status = (title: string) => within(screen.getByRole("navigation", { name: "Registration progress" })).getByRole("link", { name: new RegExp("^" + title) }).getAttribute("data-status");

    it("counts required sections only, and marks Reference and Remarks Optional", () => {
      renderForm();
      const nav = screen.getByRole("navigation", { name: "Registration progress" });
      expect(within(nav).getByText("0 of 4 sections complete")).toBeInTheDocument();
      expect(within(nav).getAllByText("Optional")).toHaveLength(2);
      expect(within(nav).getAllByRole("link")).toHaveLength(6);
      expect(within(nav).getByRole("link", { name: /^Parents/ })).toHaveAttribute("href", "#registration-section-parents");
    });

    it("a section turns done once all its required fields are valid", () => {
      renderForm();
      expect(status("Student")).not.toBe("done");
      type(/Student's name/, "Zartasha Testchild");
      type(/Date of birth/, "2020-05-01");
      expect(status("Student")).not.toBe("done");
      type(/Admission for class/, "Class 1");
      expect(status("Student")).toBe("done");
      expect(within(screen.getByRole("navigation", { name: "Registration progress" })).getByText("1 of 4 sections complete")).toBeInTheDocument();
    });

    it("an optional section is done only once it is filled in validly, and does not count towards the total", () => {
      renderForm();
      expect(status("Reference")).not.toBe("done");
      type(/Reference student's name/, "Ali Khan");
      // All three or none: one field alone is not valid yet.
      expect(status("Reference")).not.toBe("done");
      type(/Reference student's class/, "Class 2");
      type(/Relation to the student/, "Cousin");
      expect(status("Reference")).toBe("done");
      expect(within(screen.getByRole("navigation", { name: "Registration progress" })).getByText("0 of 4 sections complete")).toBeInTheDocument();
    });

    it("the phone bar reads Section N of 6 with the section's title", () => {
      renderForm();
      const bar = screen.getByTestId("progress-bar");
      expect(bar.textContent).toMatch(/^Section \d of 6 · /);
      expect(within(bar).getByRole("progressbar")).toHaveAttribute("aria-valuemax", "6");
    });
  });

  describe("fields (026)", () => {
    it("has the right input types, keypads and autofill hints, and none for the child's name or birth date", () => {
      renderForm();
      const get = (label: RegExp) => screen.getByLabelText(label);
      expect(get(/^Email address/)).toHaveAttribute("type", "email");
      expect(get(/^Email address/)).toHaveAttribute("autocomplete", "email");
      expect(get(/Father's mobile/)).toHaveAttribute("inputmode", "tel");
      expect(get(/Father's mobile/)).toHaveAttribute("autocomplete", "tel");
      expect(get(/Emergency contact number/)).toHaveAttribute("autocomplete", "off");
      expect(get(/^Address/)).toHaveAttribute("autocomplete", "street-address");
      expect(get(/Date of birth/)).toHaveAttribute("type", "date");
      expect(get(/Date of birth/)).toHaveAttribute("autocomplete", "off");
      expect(get(/Student's name/)).toHaveAttribute("autocomplete", "off");
    });

    it("puts a decorative icon only on email, the mobile numbers and the date of birth, and pads the text clear of it", () => {
      renderForm();
      const iconFields = [/^Email address/, /Father's mobile/, /Mother's mobile/, /Emergency contact number/, /Date of birth/];
      for (const label of iconFields) {
        const input = screen.getByLabelText(label);
        const icon = input.parentElement?.querySelector("svg[aria-hidden='true']");
        expect(icon, String(label)).not.toBeNull();
        expect(icon?.getAttribute("class")).toContain("pointer-events-none");
        expect(input.className).toContain("pl-11");
      }
      for (const label of [/Student's name/, /Father's name/, /^Address/, /Remarks/]) {
        expect(screen.getByLabelText(label).parentElement?.querySelector("svg"), String(label)).toBeNull();
      }
    });
  });

  it("the privacy notice is short and carries the retention months and the reference-number note", () => {
    renderForm(6);
    const notice = document.getElementById("registration-privacy-notice");
    expect(notice?.textContent).toContain("Registrations are deleted automatically after 6 months");
    expect(notice?.textContent).toContain("note the reference number");
    expect(notice?.textContent?.length).toBeLessThan(450);
  });

  it("includes the hidden spam-trap field", () => {
    renderForm();
    expect(document.querySelector('input[name="website_url"]')).not.toBeNull();
  });
});
