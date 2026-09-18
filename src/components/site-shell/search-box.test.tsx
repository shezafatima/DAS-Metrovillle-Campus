import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchBox } from "./search-box";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("SearchBox", () => {
  it("shows a search icon button until activated", () => {
    render(<SearchBox />);
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("opens an input on activation and lists matching pages while typing", () => {
    render(<SearchBox />);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "about" } });

    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      "/about"
    );
  });

  it("shows a no-results message when nothing matches", () => {
    render(<SearchBox />);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "xyz-nonexistent-page" },
    });
    expect(screen.getByText("No pages found")).toBeInTheDocument();
  });

  it("closes on Escape", () => {
    render(<SearchBox />);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });
});
