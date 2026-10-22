import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    await waitFor(() => expect(screen.getByText(registrationCopy.fieldErrors.fatherName)).toBeInTheDocument());
    expect(screen.getByText(registrationCopy.fieldErrors.email)).toBeInTheDocument();
    expect(screen.getByText(registrationCopy.fieldErrors.consent)).toBeInTheDocument();
    expect((screen.getByLabelText(/Student's name/) as HTMLInputElement).value).toBe("Zartasha Testchild");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("both parents' mobiles empty marks both fields", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: registrationCopy.submit }));
    await waitFor(() => expect(screen.getAllByText(registrationCopy.fieldErrors.parentMobile).length).toBe(2));
    expect(screen.getByLabelText(/Father's mobile/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/Mother's mobile/)).toHaveAttribute("aria-invalid", "true");
  });

  it("error messages use the body font", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: registrationCopy.submit }));
    const message = await screen.findByText(registrationCopy.fieldErrors.fatherName);
    expect(message.className).toContain("font-body");
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
    await waitFor(() => expect(screen.getByText(registrationCopy.fieldErrors.className)).toBeInTheDocument());
  });

  it("the privacy notice carries the retention months and the 30-day sentence", () => {
    renderForm(6);
    const notice = document.getElementById("registration-privacy-notice");
    expect(notice?.textContent).toContain("We keep registrations for 6 months after submission");
    expect(notice?.textContent).toContain("Deleted records are permanently removed within 30 days");
  });

  it("includes the hidden spam-trap field", () => {
    renderForm();
    expect(document.querySelector('input[name="website_url"]')).not.toBeNull();
  });
});
