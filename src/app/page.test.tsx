import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renders inside the shell as a placeholder", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
  });
});
