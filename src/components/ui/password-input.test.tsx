import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PasswordInput } from "./password-input";

function field() {
  return screen.getByLabelText("Password", { selector: "input" }) as HTMLInputElement;
}

describe("PasswordInput", () => {
  it("is hidden by default, with a toggle that says what it will do", () => {
    render(
      <>
        <label htmlFor="pw">Password</label>
        <PasswordInput id="pw" name="password" />
      </>,
    );
    expect(field()).toHaveAttribute("type", "password");
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("the eye button shows and hides the value, and its name and pressed state follow", () => {
    render(
      <>
        <label htmlFor="pw">Password</label>
        <PasswordInput id="pw" defaultValue="hunter2-hunter2" />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(field()).toHaveAttribute("type", "text");
    expect(field()).toHaveValue("hunter2-hunter2");
    const hide = screen.getByRole("button", { name: "Hide password" });
    expect(hide).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(hide);
    expect(field()).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Show password" })).toHaveAttribute("aria-pressed", "false");
  });

  it("the toggle is a real button in the tab order, and never submits the form", () => {
    render(
      <form>
        <label htmlFor="pw">Password</label>
        <PasswordInput id="pw" />
      </form>,
    );
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle.tagName).toBe("BUTTON");
    expect(toggle).toHaveAttribute("type", "button");
    expect(toggle.tabIndex).toBe(0);
  });

  it("goes back to hidden when the form is submitted", () => {
    const { container } = render(
      <form onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="pw">Password</label>
        <PasswordInput id="pw" />
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(field()).toHaveAttribute("type", "text");

    fireEvent.submit(container.querySelector("form")!);
    expect(field()).toHaveAttribute("type", "password");
  });

  it("goes back to hidden when the form is reset", () => {
    const { container } = render(
      <form>
        <label htmlFor="pw">Password</label>
        <PasswordInput id="pw" />
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    fireEvent.reset(container.querySelector("form")!);
    expect(field()).toHaveAttribute("type", "password");
  });

  it("starts hidden again when it is mounted afresh (a closed and reopened panel)", () => {
    const first = render(
      <>
        <label htmlFor="pw">Password</label>
        <PasswordInput id="pw" />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    first.unmount();
    render(
      <>
        <label htmlFor="pw">Password</label>
        <PasswordInput id="pw" />
      </>,
    );
    expect(field()).toHaveAttribute("type", "password");
  });

  it("revealNonce shows the value (after Generate) but never hides it", () => {
    const view = render(
      <>
        <label htmlFor="pw">Password</label>
        <PasswordInput id="pw" revealNonce={0} />
      </>,
    );
    expect(field()).toHaveAttribute("type", "password");
    view.rerender(
      <>
        <label htmlFor="pw">Password</label>
        <PasswordInput id="pw" revealNonce={1} />
      </>,
    );
    expect(field()).toHaveAttribute("type", "text");
  });

  it("is still an ordinary input: name, autocomplete, controlled value, ref and custom labels pass through", () => {
    const ref = createRef<HTMLInputElement>();
    const onChange = () => {};
    render(
      <>
        <label htmlFor="pw">Password</label>
        <PasswordInput
          id="pw"
          name="newPassword"
          autoComplete="new-password"
          value="abc"
          onChange={onChange}
          ref={ref}
          showLabel="Reveal"
          hideLabel="Conceal"
        />
      </>,
    );
    expect(ref.current).toBe(field());
    expect(field()).toHaveAttribute("name", "newPassword");
    expect(field()).toHaveAttribute("autocomplete", "new-password");
    expect(field()).toHaveValue("abc");
    fireEvent.click(screen.getByRole("button", { name: "Reveal" }));
    expect(screen.getByRole("button", { name: "Conceal" })).toBeInTheDocument();
  });
});
