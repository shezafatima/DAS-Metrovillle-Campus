import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useEffect, useState } from "react";
import { describe, expect, it } from "vitest";
import type { GroupValue } from "@/lib/settings/types";
import type { SyllabusGroup, SyllabusLevel, SyllabusSubject } from "@/lib/syllabi/edit";
import { SyllabusEditor } from "./syllabus-editor";

const group = (o: Partial<SyllabusGroup> = {}): SyllabusGroup => ({ id: crypto.randomUUID(), heading: "", intro: "", topics: [], ...o });
const subject = (name: string, groups: SyllabusGroup[] = []): SyllabusSubject => ({ id: crypto.randomUUID(), name, groups });
const level = (name: string, subjects: SyllabusSubject[] = []): SyllabusLevel => ({ id: crypto.randomUUID(), name, subjects });

const latest: { value: GroupValue } = { value: { levels: [] } };

function Harness({ initial, readOnly = false, errors = {} }: { initial: SyllabusLevel[]; readOnly?: boolean; errors?: Record<string, string> }) {
  const [value, setValue] = useState<GroupValue>({ levels: initial });
  useEffect(() => {
    latest.value = value;
  });
  return <SyllabusEditor kind="syllabus" value={value} onChange={setValue} errors={errors} clearError={() => undefined} readOnly={readOnly} />;
}

const levelsNow = () => latest.value.levels as SyllabusLevel[];
const isOpen = (name: RegExp | string) => screen.getAllByTestId("syllabus-level").find((li) => within(li).queryByRole("button", { name }) && true)?.getAttribute("data-open") === "true";

describe("SyllabusEditor (014b)", () => {
  it("opens the first level and shows the others as one row each", () => {
    render(<Harness initial={[level("Nursery", [subject("English")]), level("Class 1"), level("Class 2")]} />);
    const rows = screen.getAllByTestId("syllabus-level");
    expect(rows.map((row) => row.getAttribute("data-open"))).toEqual(["true", "false", "false"]);
    expect(screen.getAllByTestId("syllabus-subject")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /^Nursery/ })).toHaveAttribute("aria-expanded", "true");
  });

  it("only one level is open at a time: opening another closes the first", () => {
    render(<Harness initial={[level("Nursery", [subject("English")]), level("Class 1", [subject("Maths")])]} />);
    fireEvent.click(screen.getByRole("button", { name: /^Class 1/ }));
    expect(isOpen(/^Class 1/)).toBe(true);
    expect(isOpen(/^Nursery/)).toBe(false);
    expect(screen.getAllByTestId("syllabus-subject")).toHaveLength(1);
    expect(within(screen.getByTestId("syllabus-subject")).getByLabelText("Subject name")).toHaveValue("Maths");
  });

  it("collapses the open level when its row is clicked again", () => {
    render(<Harness initial={[level("Nursery")]} />);
    fireEvent.click(screen.getByRole("button", { name: /^Nursery/ }));
    expect(isOpen(/^Nursery/)).toBe(false);
  });

  it("adds a level and opens it", () => {
    render(<Harness initial={[level("Nursery")]} />);
    fireEvent.click(screen.getByRole("button", { name: "Add level" }));
    expect(levelsNow()).toHaveLength(2);
    expect(levelsNow()[1]).toMatchObject({ name: "", subjects: [] });
    const rows = screen.getAllByTestId("syllabus-level");
    expect(rows[1].getAttribute("data-open")).toBe("true");
    expect(rows[0].getAttribute("data-open")).toBe("false");
  });

  it("renames a level, and the row shows the new name", () => {
    render(<Harness initial={[level("Nursery")]} />);
    fireEvent.change(screen.getByLabelText("Level name"), { target: { value: "Pre-Nursery" } });
    expect(levelsNow()[0].name).toBe("Pre-Nursery");
    expect(screen.getByRole("button", { name: /^Pre-Nursery/ })).toBeInTheDocument();
  });

  it("adds a subject and a group inside the open level", () => {
    render(<Harness initial={[level("Nursery")]} />);
    fireEvent.click(screen.getByRole("button", { name: "Add subject" }));
    expect(levelsNow()[0].subjects).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Add group" }));
    expect(levelsNow()[0].subjects[0].groups).toHaveLength(1);
    expect(screen.getByLabelText("Group heading (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Intro (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Topics")).toBeInTheDocument();
  });

  it("moves levels up and down with buttons, and announces it", () => {
    render(<Harness initial={[level("A"), level("B"), level("C")]} />);
    fireEvent.click(screen.getByRole("button", { name: "Move level 3 up" }));
    expect(levelsNow().map((entry) => entry.name)).toEqual(["A", "C", "B"]);
    expect(screen.getByTestId("syllabus-announcement")).toHaveTextContent("level 3 moved to position 2 of 3");
    fireEvent.click(screen.getByRole("button", { name: "Move level 1 down" }));
    expect(levelsNow().map((entry) => entry.name)).toEqual(["C", "A", "B"]);
  });

  it("the first level cannot move up and the last cannot move down", () => {
    render(<Harness initial={[level("A"), level("B")]} />);
    expect(screen.getByRole("button", { name: "Move level 1 up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move level 2 down" })).toBeDisabled();
  });

  it("moves subjects and groups too", () => {
    render(
      <Harness
        initial={[level("Nursery", [subject("English", [group({ heading: "Reading" }), group({ heading: "Writing" })]), subject("Maths")])]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Move subject 2 up" }));
    expect(levelsNow()[0].subjects.map((entry) => entry.name)).toEqual(["Maths", "English"]);
    fireEvent.click(screen.getByRole("button", { name: "Move group 2 of subject 2 up" }));
    expect(levelsNow()[0].subjects[1].groups.map((entry) => entry.heading)).toEqual(["Writing", "Reading"]);
  });

  describe("removing", () => {
    const topics = (n: number) => Array.from({ length: n }, (_, i) => `t${i}`);

    it("a level asks first and says how many topics go; cancelling keeps everything", async () => {
      render(<Harness initial={[level("Nursery", [subject("English", [group({ topics: topics(3) })]), subject("Maths", [group({ topics: topics(2) })])]), level("Class 1")]} />);
      fireEvent.click(screen.getByRole("button", { name: "Remove level: Nursery" }));
      expect(await screen.findByText(/This removes 5 topics/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect(screen.queryByText(/This removes 5 topics/)).not.toBeInTheDocument());
      expect(levelsNow()).toHaveLength(2);
    });

    it("confirming removes the level", async () => {
      render(<Harness initial={[level("Nursery", [subject("English", [group({ topics: topics(1) })])]), level("Class 1")]} />);
      fireEvent.click(screen.getByRole("button", { name: "Remove level: Nursery" }));
      expect(await screen.findByText(/This removes 1 topic,/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Remove" }));
      await waitFor(() => expect(levelsNow().map((entry) => entry.name)).toEqual(["Class 1"]));
    });

    it("a subject asks first and says how many topics go", async () => {
      render(<Harness initial={[level("Nursery", [subject("English", [group({ topics: topics(4) })]), subject("Maths")])]} />);
      fireEvent.click(screen.getByRole("button", { name: "Remove subject: English" }));
      expect(await screen.findByText(/This removes 4 topics/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Remove" }));
      await waitFor(() => expect(levelsNow()[0].subjects.map((entry) => entry.name)).toEqual(["Maths"]));
    });

    it("a group with topics or an intro asks first", async () => {
      render(<Harness initial={[level("Nursery", [subject("English", [group({ intro: "Only an intro" }), group({ topics: topics(2) })])])]} />);
      fireEvent.click(screen.getByRole("button", { name: "Remove group: group 1 of subject 1" }));
      expect(await screen.findByText(/This removes 0 topics and its intro/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect(screen.queryByText(/This removes 0 topics/)).not.toBeInTheDocument());
      expect(levelsNow()[0].subjects[0].groups).toHaveLength(2);
    });

    it("an empty group is removed at once, with no question", () => {
      render(<Harness initial={[level("Nursery", [subject("English", [group(), group({ topics: topics(1) })])])]} />);
      fireEvent.click(screen.getByRole("button", { name: "Remove group: group 1 of subject 1" }));
      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(levelsNow()[0].subjects[0].groups).toHaveLength(1);
    });
  });

  describe("topics", () => {
    it("commits the trimmed, non-blank lines, one topic per line", () => {
      render(<Harness initial={[level("Nursery", [subject("English", [group()])])]} />);
      fireEvent.change(screen.getByLabelText("Topics"), { target: { value: "  Alphabet  \n\n   \nPhonics\n\tCVC words " } });
      expect(levelsNow()[0].subjects[0].groups[0].topics).toEqual(["Alphabet", "Phonics", "CVC words"]);
    });

    it("keeps a line break typed at the end, so the next topic can be typed", () => {
      render(<Harness initial={[level("Nursery", [subject("English", [group()])])]} />);
      const box = screen.getByLabelText("Topics") as HTMLTextAreaElement;
      fireEvent.change(box, { target: { value: "Alphabet\n" } });
      expect(box.value).toBe("Alphabet\n");
      expect(levelsNow()[0].subjects[0].groups[0].topics).toEqual(["Alphabet"]);
    });

    it("shows the count against the limit of 100", () => {
      render(<Harness initial={[level("Nursery", [subject("English", [group({ topics: ["a", "b"] })])])]} />);
      expect(screen.getByText(/2 of 100 topics/)).toBeInTheDocument();
    });

    it("shows an error from the server on the topics box", () => {
      render(<Harness initial={[level("Nursery", [subject("English", [group()])])]} errors={{ "levels.0.subjects.0.groups.0.topics": "Use 100 lines or fewer." }} />);
      expect(screen.getByRole("alert")).toHaveTextContent("Use 100 lines or fewer.");
      expect(screen.getByLabelText("Topics")).toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("duplicate names only warn (spec edge cases)", () => {
    it("two levels with the same name, ignoring case and spaces, show an inline warning on the open one and still allow editing", () => {
      render(<Harness initial={[level("Class 1"), level(" class  1 ")]} />);
      expect(screen.getByTestId("duplicate-warning")).toHaveTextContent('Another level is also called "Class 1". You can still save.');
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("two subjects of one level with the same name warn", () => {
      render(<Harness initial={[level("Nursery", [subject("English"), subject("english")])]} />);
      expect(screen.getAllByTestId("duplicate-warning")).toHaveLength(2);
      expect(screen.getAllByTestId("duplicate-warning")[0]).toHaveTextContent('Another subject is also called "English"');
    });

    it("distinct names show no warning", () => {
      render(<Harness initial={[level("Nursery", [subject("English"), subject("Maths")]), level("Class 1")]} />);
      expect(screen.queryByTestId("duplicate-warning")).toBeNull();
    });
  });

  it("links to the public section", () => {
    render(<Harness initial={[]} />);
    expect(screen.getByTestId("syllabus-preview")).toHaveAttribute("href", "/academics#syllabi");
    expect(screen.getByText(/No levels yet/)).toBeInTheDocument();
  });

  it("read-only: everything is disabled", () => {
    render(<Harness initial={[level("Nursery", [subject("English", [group({ topics: ["a"] })])]), level("Class 1")]} readOnly />);
    expect(screen.getByRole("button", { name: "Add level" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add subject" })).toBeDisabled();
    expect(screen.getByLabelText("Level name")).toBeDisabled();
    expect(screen.getByLabelText("Topics")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move level 2 up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove level: Nursery" })).toBeDisabled();
  });

  it("limits: no more than 20 levels, 10 subjects, 20 groups", () => {
    const twenty = Array.from({ length: 20 }, (_, i) => level(`L${i}`));
    const { unmount } = render(<Harness initial={twenty} />);
    expect(screen.getByRole("button", { name: "Add level" })).toBeDisabled();
    unmount();
    const subjects = Array.from({ length: 10 }, (_, i) => subject(`S${i}`));
    render(<Harness initial={[level("Nursery", subjects)]} />);
    expect(screen.getByRole("button", { name: "Add subject" })).toBeDisabled();
  });
});
