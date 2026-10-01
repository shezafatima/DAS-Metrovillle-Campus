import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminConfirmDeleteDialog } from "./admin-delete-dialog";

const copy = {
  trigger: "Delete slide",
  title: "Delete this slide?",
  body: "It leaves the site when you save.",
  cancel: "Cancel",
  confirm: "Delete",
};

describe("AdminConfirmDeleteDialog", () => {
  it("does nothing until the admin confirms", async () => {
    const onConfirm = vi.fn();
    render(<AdminConfirmDeleteDialog itemName="slide 1" copy={copy} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete slide: slide 1" }));
    expect(await screen.findByText("Delete this slide?")).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("calls onConfirm once when confirmed", async () => {
    const onConfirm = vi.fn();
    render(<AdminConfirmDeleteDialog itemName="slide 1" copy={copy} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete slide: slide 1" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it("does not call onConfirm when cancelled", async () => {
    const onConfirm = vi.fn();
    render(<AdminConfirmDeleteDialog itemName="slide 1" copy={copy} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete slide: slide 1" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByText("Delete this slide?")).not.toBeInTheDocument());
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("cannot be opened while disabled", () => {
    render(<AdminConfirmDeleteDialog itemName="slide 1" copy={copy} onConfirm={vi.fn()} disabled />);
    expect(screen.getByRole("button", { name: "Delete slide: slide 1" })).toBeDisabled();
  });
});
