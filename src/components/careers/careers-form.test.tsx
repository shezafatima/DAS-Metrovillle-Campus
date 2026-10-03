import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CareersForm } from "./careers-form";

const PDF_BYTES = new TextEncoder().encode("%PDF-1.4\n%%EOF\n");
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pdfFile(name = "cv.pdf") {
  return new File([PDF_BYTES as BlobPart], name, { type: "application/pdf" });
}

function jsonResponse(status: number, body: unknown = {}) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
}

function fillText(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillAll(file: File = pdfFile()) {
  fillText("Full name", "Ayesha Khan");
  fillText("Email", "ayesha@example.com");
  fillText("Mobile number", "03001234567");
  fillText("Highest qualification", "M.Ed");
  fireEvent.change(document.getElementById("careers-cv") as HTMLInputElement, { target: { files: [file] } });
  fireEvent.click(screen.getByRole("checkbox"));
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CareersForm", () => {
  it("shows a message next to every empty field, focuses the first, and does not call the server", async () => {
    render(<CareersForm />);
    submit();

    expect(await screen.findByText("Enter your full name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter a Pakistani mobile number, e.g. 03001234567.")).toBeInTheDocument();
    expect(screen.getByText("Enter your highest qualification.")).toBeInTheDocument();
    expect(screen.getByText("Choose your CV as a PDF file.")).toBeInTheDocument();
    expect(screen.getByText("Please tick the box to agree before applying.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Full name")).toHaveFocus();
  });

  it("puts each message in the field's accessible description", async () => {
    render(<CareersForm />);
    submit();
    const name = await screen.findByLabelText("Full name");
    const describedBy = name.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent("Enter your full name.");
  });

  it("catches a PNG renamed .pdf by its bytes before sending anything", async () => {
    render(<CareersForm />);
    fillAll(new File([PNG_BYTES as BlobPart], "resume.pdf", { type: "application/pdf" }));
    submit();

    expect(await screen.findByText("Your CV must be a PDF file.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends FormData with the raw values, an empty honeypot and the CV file", async () => {
    fetchMock.mockReturnValue(jsonResponse(200, { ok: true }));
    render(<CareersForm />);
    fillAll();
    submit();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/public/careers");
    expect(init.method).toBe("POST");
    const body = init.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("name")).toBe("Ayesha Khan");
    expect(body.get("email")).toBe("ayesha@example.com");
    expect(body.get("phone")).toBe("03001234567");
    expect(body.get("qualification")).toBe("M.Ed");
    expect(body.get("consent")).toBe("true");
    expect(body.get("website_url")).toBe("");
    expect((body.get("cv") as File).name).toBe("cv.pdf");
  });

  it("replaces the form with the confirmation on success", async () => {
    fetchMock.mockReturnValue(jsonResponse(200, { ok: true }));
    render(<CareersForm />);
    fillAll();
    submit();

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Thank you for applying!");
    expect(screen.queryByRole("button", { name: "Apply" })).not.toBeInTheDocument();
  });

  it("shows the server's field messages and keeps every typed value on a 400", async () => {
    fetchMock.mockReturnValue(jsonResponse(400, { error: "validation", fields: { email: "Enter a valid email address." } }));
    render(<CareersForm />);
    fillAll();
    submit();

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toHaveValue("Ayesha Khan");
    expect(screen.getByLabelText("Highest qualification")).toHaveValue("M.Ed");
  });

  it("tells the applicant when they may apply again on a 409, keeping their details", async () => {
    fetchMock.mockReturnValue(jsonResponse(409, { error: "already_applied", reapplyFrom: "2026-11-01" }));
    render(<CareersForm />);
    fillAll();
    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You applied recently. You can apply again from 1 November 2026.",
    );
    expect(screen.getByLabelText("Email")).toHaveValue("ayesha@example.com");
    expect(screen.getByText(/Selected: cv\.pdf/)).toBeInTheDocument();
  });

  it("keeps the typed details and the chosen file on a 503, and a retry sends the same file again", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse(503, { error: "store_unavailable" }));
    fetchMock.mockReturnValueOnce(jsonResponse(200, { ok: true }));
    render(<CareersForm />);
    fillAll();
    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't save your application just now. Please try again.");
    expect(screen.getByLabelText("Full name")).toHaveValue("Ayesha Khan");
    expect(screen.getByText(/Selected: cv\.pdf/)).toBeInTheDocument();

    submit();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const retryBody = fetchMock.mock.calls[1][1].body as FormData;
    expect((retryBody.get("cv") as File).name).toBe("cv.pdf");
    expect(await screen.findByRole("status")).toBeInTheDocument();
  });

  it("shows the rate-limit message on a 429 and keeps the details", async () => {
    fetchMock.mockReturnValue(jsonResponse(429, { error: "too_many_requests" }));
    render(<CareersForm />);
    fillAll();
    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts. Please try again shortly.");
    expect(screen.getByLabelText("Full name")).toHaveValue("Ayesha Khan");
  });

  it("shows the size message next to the CV field on a 413", async () => {
    fetchMock.mockReturnValue(jsonResponse(413, { error: "too_large" }));
    render(<CareersForm />);
    fillAll();
    submit();

    expect(await screen.findByText("Your CV must be 4 MB or smaller.")).toBeInTheDocument();
  });

  it("falls back to the try-again message when the network fails", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    render(<CareersForm />);
    fillAll();
    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't save your application just now.");
  });

  it("lets Urdu names and qualifications be typed, direction following the text, and keeps email and phone left-to-right", () => {
    render(<CareersForm />);
    expect(screen.getByLabelText("Full name")).toHaveAttribute("dir", "auto");
    expect(screen.getByLabelText("Highest qualification")).toHaveAttribute("dir", "auto");
    expect(screen.getByLabelText("Email")).toHaveAttribute("dir", "ltr");
    expect(screen.getByLabelText("Mobile number")).toHaveAttribute("dir", "ltr");
    fillText("Full name", "عائشہ خان");
    expect(screen.getByLabelText("Full name")).toHaveValue("عائشہ خان");
  });

  it("hides the spam-trap field from the accessibility tree", () => {
    render(<CareersForm />);
    expect(screen.getByLabelText("Website", { selector: "input" }).closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
