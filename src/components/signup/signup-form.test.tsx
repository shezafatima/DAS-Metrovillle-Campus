import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignupForm } from "./signup-form";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function fillField(name: string, value: string) {
  fireEvent.change(screen.getByRole("textbox", { name }), { target: { value } });
}

describe("SignupForm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a required message per field and never calls fetch on an empty submit", async () => {
    render(<SignupForm source="home" />);

    fireEvent.click(screen.getByRole("button", { name: "Signup" }));

    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter a Pakistani mobile number, e.g. 03001234567.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows email and phone messages for a bad email and a landline", async () => {
    render(<SignupForm source="home" />);

    fillField("Name", "Ali Khan");
    fillField("Email", "not-an-email");
    fillField("Phone", "021-12345678");
    fireEvent.click(screen.getByRole("button", { name: "Signup" }));

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter a Pakistani mobile number, e.g. 03001234567.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("clears a field's message as soon as it is corrected (FR-007)", async () => {
    render(<SignupForm source="home" />);

    fillField("Name", "Ali Khan");
    fillField("Phone", "021-12345678");
    fireEvent.click(screen.getByRole("button", { name: "Signup" }));
    await screen.findByText("Enter a valid email address.");
    expect(screen.getByText("Enter a Pakistani mobile number, e.g. 03001234567.")).toBeInTheDocument();

    fillField("Email", "a");

    expect(screen.queryByText("Enter a valid email address.")).not.toBeInTheDocument();
    expect(screen.getByText("Enter a Pakistani mobile number, e.g. 03001234567.")).toBeInTheDocument();
  });

  it("has an accessible name for every field even though the label is sr-only", () => {
    render(<SignupForm source="home" />);
    expect(screen.getByRole("textbox", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Phone" })).toBeInTheDocument();
  });

  it("shows the thank-you and clears the form on a 200, then resets on 'Sign up someone else'", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    render(<SignupForm source="home" />);

    fillField("Name", "Ali Khan");
    fillField("Email", "ali@example.com");
    fillField("Phone", "03001234567");
    fireEvent.click(screen.getByRole("button", { name: "Signup" }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Thank you!");
    expect(screen.queryByRole("textbox", { name: "Name" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sign up someone else" }));

    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Phone" })).toHaveValue("");
  });

  it("shows a 400 field message and keeps the typed values", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(400, { error: "validation", fields: { email: "Server says no." } }),
    );
    render(<SignupForm source="home" />);

    fillField("Name", "Ali Khan");
    fillField("Email", "ali@example.com");
    fillField("Phone", "03001234567");
    fireEvent.click(screen.getByRole("button", { name: "Signup" }));

    expect(await screen.findByText("Server says no.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Ali Khan");
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("ali@example.com");
    expect(screen.getByRole("textbox", { name: "Phone" })).toHaveValue("03001234567");
  });

  it("shows the unavailable banner and keeps values on a network error", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network down"));
    render(<SignupForm source="home" />);

    fillField("Name", "Ali Khan");
    fillField("Email", "ali@example.com");
    fillField("Phone", "03001234567");
    fireEvent.click(screen.getByRole("button", { name: "Signup" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong — please try again.");
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Ali Khan");
  });

  it("sends the source and the visitor's raw typed values, not server-normalised ones", async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    render(<SignupForm source="home" />);

    fillField("Name", "Ali Khan");
    fillField("Email", "Ali@Example.COM");
    fillField("Phone", "0300-1234567");
    fireEvent.click(screen.getByRole("button", { name: "Signup" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init!.body as string);
    expect(body).toEqual({
      name: "Ali Khan",
      email: "Ali@Example.COM",
      phone: "0300-1234567",
      source: "home",
      website_url: "",
    });
  });

  it("keeps the honeypot field out of the accessibility tree and unfocusable", () => {
    render(<SignupForm source="home" />);
    expect(screen.queryByRole("textbox", { name: "Website" })).not.toBeInTheDocument();
    expect(document.getElementById("signup-website")).toHaveAttribute("tabindex", "-1");
  });

  it("shows the rate-limited banner and keeps values on a 429", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(429, { error: "too_many_requests" }));
    render(<SignupForm source="home" />);

    fillField("Name", "Ali Khan");
    fillField("Email", "ali@example.com");
    fillField("Phone", "03001234567");
    fireEvent.click(screen.getByRole("button", { name: "Signup" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Please try again shortly.");
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Ali Khan");
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("ali@example.com");
    expect(screen.getByRole("textbox", { name: "Phone" })).toHaveValue("03001234567");
  });

  it("sends a filled honeypot value in the body", async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    render(<SignupForm source="home" />);

    fillField("Name", "Ali Khan");
    fillField("Email", "ali@example.com");
    fillField("Phone", "03001234567");
    fireEvent.change(document.getElementById("signup-website")!, { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Signup" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init!.body as string);
    expect(body.website_url).toBe("x");
  });
});
