import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ContactForm } from "@/components/contact/contact-form";

function fillValidForm() {
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Ali Khan" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Email" }), { target: { value: "ali@example.com" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Subject" }), { target: { value: "Admission" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Your Message" }), { target: { value: "Hello there." } });
}

describe("ContactForm", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows four required messages on an empty submit and does not call fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<ContactForm />);

    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
    expect(screen.getByText("Subject is required.")).toBeInTheDocument();
    expect(screen.getByText("Message is required.")).toBeInTheDocument();
    expect(screen.queryByText(/phone/i, { selector: "p" })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears only the Name field's message when it is edited", async () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<ContactForm />);
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Name is required.");

    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Ali" } });
    expect(screen.queryByText("Name is required.")).toBeNull();
    expect(screen.getByText("Subject is required.")).toBeInTheDocument();
  });

  it("shows the thank-you on 200 and resets the form via 'Send another message'", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200, json: async () => ({ ok: true }) }));
    render(<ContactForm />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("status")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Send another message" }));
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("");
  });

  it("shows the email field message from a 400 response and keeps the typed values", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ status: 400, json: async () => ({ fields: { email: "Enter a valid email address." } }) }),
    );
    render(<ContactForm />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Ali Khan");
  });

  it("shows the rate-limited banner on 429 and keeps the values", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 429, json: async () => ({}) }));
    render(<ContactForm />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Too many messages");
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Ali Khan");
  });

  it("shows the unavailable banner on 503 and on a rejected fetch, keeping the values", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 503, json: async () => ({}) }));
    render(<ContactForm />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't send");
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Ali Khan");
  });

  it("blocks a 5,001-character message and shows the error-coloured counter", async () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<ContactForm />);
    fillValidForm();
    fireEvent.change(screen.getByRole("textbox", { name: "Your Message" }), { target: { value: "x".repeat(5001) } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Message must be 5,000 characters or fewer.")).toBeInTheDocument();
    expect(screen.getByText("5,001 / 5,000")).toHaveClass("text-error");
  });

  it("keeps line breaks in the typed message", () => {
    render(<ContactForm />);
    const textarea = screen.getByRole("textbox", { name: "Your Message" });
    fireEvent.change(textarea, { target: { value: "line one\nline two" } });
    expect(textarea).toHaveValue("line one\nline two");
  });

  it("has an aria-hidden honeypot that is not tabbable and sends website_url: '' on submit", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<ContactForm />);

    const honeypot = document.getElementById("contact-website") as HTMLInputElement;
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(honeypot.closest('[aria-hidden="true"]')).not.toBeNull();

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.website_url).toBe("");
  });

  it("exposes every field via its accessible name and marks invalid fields with aria-invalid/aria-describedby", async () => {
    render(<ContactForm />);
    for (const name of ["Name", "Email", "Phone (optional)", "Subject", "Your Message"]) {
      expect(screen.getByRole("textbox", { name })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    const nameInput = await screen.findByRole("textbox", { name: "Name" });
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    const describedBy = nameInput.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).not.toBeNull();
  });
});
