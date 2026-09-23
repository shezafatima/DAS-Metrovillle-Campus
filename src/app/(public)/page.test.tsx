import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renders inside the shell as a placeholder", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
  });

  it("includes the signup section (T023 — tested end to end before 006 builds the real page)", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /Join Over/ })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Phone" })).toBeInTheDocument();
  });
});
