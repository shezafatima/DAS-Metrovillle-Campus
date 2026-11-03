import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Field } from "@/lib/settings/types";
import { FieldControl } from "./field-control";

const urlField: Extract<Field, { type: "url" }> = {
  type: "url",
  key: "url",
  label: "Web address",
  maxLength: 2048,
  required: true,
  rejectCredentials: true,
  warnInsecure: true,
  testLink: true,
};

function renderUrl(value: string, onChange = vi.fn(), field: Field = urlField) {
  render(<FieldControl field={field} path="links.0.url" value={value} onChange={onChange} errors={{}} clearError={() => undefined} />);
  return onChange;
}

const WARNING = "Visitors' browsers will mark this site as not secure.";

describe("FieldControl: url with warnInsecure and testLink (014b)", () => {
  it("shows the not-secure warning for an http:// address", () => {
    renderUrl("http://203.0.113.5/login");
    expect(screen.getByText(WARNING)).toBeInTheDocument();
  });

  it("shows the warning whatever the case of the scheme", () => {
    renderUrl("HTTP://example.org");
    expect(screen.getByText(WARNING)).toBeInTheDocument();
  });

  it("shows no warning for https://, an empty field or text that is not an address", () => {
    for (const value of ["https://lms.example.org/", "", "not an address"]) {
      const { unmount } = render(<FieldControl field={urlField} path="u" value={value} onChange={() => undefined} errors={{}} clearError={() => undefined} />);
      expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
      unmount();
    }
  });

  it("offers a Test link that opens a valid address in a new tab, safely", () => {
    renderUrl("https://lms.example.org/");
    const link = screen.getByRole("link", { name: /^Test link/ });
    expect(link).toHaveAttribute("href", "https://lms.example.org/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("a Test link is offered for a valid http:// address too", () => {
    renderUrl("http://203.0.113.5/login");
    expect(screen.getByRole("link", { name: /^Test link/ })).toHaveAttribute("href", "http://203.0.113.5/login");
  });

  it.each(["", "   ", "javascript:alert(1)", "data:text/html,x", "/portal/x", "www.example.org", "https://user:pass@x.org"])(
    "is a disabled control with no destination while the address is %j",
    (value) => {
      renderUrl(value);
      expect(screen.queryByRole("link", { name: /Test link/ })).not.toBeInTheDocument();
      const disabled = screen.getByText("Test link");
      expect(disabled).toHaveAttribute("aria-disabled", "true");
      expect(disabled).not.toHaveAttribute("href");
    },
  );

  it("clicking Test link changes nothing in the form", () => {
    const onChange = renderUrl("https://lms.example.org/");
    const link = screen.getByRole("link", { name: /^Test link/ });
    // Stop the browser (jsdom) from trying to navigate.
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("typing still reports the new value", () => {
    const onChange = renderUrl("");
    fireEvent.change(screen.getByLabelText("Web address"), { target: { value: "https://x.example.org" } });
    expect(onChange).toHaveBeenCalledWith("https://x.example.org");
  });

  it("a url field without the options shows neither the warning nor a Test link", () => {
    renderUrl("http://example.org", vi.fn(), { type: "url", key: "site", label: "Site", maxLength: 100 });
    expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
    expect(screen.queryByText("Test link")).not.toBeInTheDocument();
  });
});

describe("FieldControl: date with notBeforeToday (027)", () => {
  const dateField = (notBeforeToday?: boolean): Field => ({ type: "date", key: "opensOn", label: "Opens on", ...(notBeforeToday ? { notBeforeToday } : {}) });
  const picker = () => screen.getByLabelText("Opens on") as HTMLInputElement;

  it("starts the picker at today in Pakistan, not at the visitor's own day", () => {
    vi.useFakeTimers();
    try {
      // 20:30 UTC on the 24th is 01:30 on the 25th in Pakistan (UTC+5).
      vi.setSystemTime(new Date("2026-10-24T20:30:00Z"));
      renderUrl("", vi.fn(), dateField(true));
      expect(picker().type).toBe("date");
      expect(picker().min).toBe("2026-10-25");
    } finally {
      vi.useRealTimers();
    }
  });

  it("has no minimum on a date that is not marked", () => {
    renderUrl("", vi.fn(), dateField());
    expect(picker().min).toBe("");
  });

  it("has no minimum while the field holds a past date, so the panel can still be saved, and has one again for today or later", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-10-24T10:00:00Z"));
      const { unmount } = render(<FieldControl field={dateField(true)} path="opensOn" value="2026-10-15" onChange={vi.fn()} errors={{}} clearError={() => undefined} />);
      expect(picker().min).toBe("");
      unmount();
      render(<FieldControl field={dateField(true)} path="opensOn" value="2026-10-24" onChange={vi.fn()} errors={{}} clearError={() => undefined} />);
      expect(picker().min).toBe("2026-10-24");
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps a past value that is already there, and still reports a typed change", () => {
    const onChange = renderUrl("2026-10-15", vi.fn(), dateField(true));
    expect(picker().value).toBe("2026-10-15");
    fireEvent.change(picker(), { target: { value: "2026-12-01" } });
    expect(onChange).toHaveBeenCalledWith("2026-12-01");
  });
});
