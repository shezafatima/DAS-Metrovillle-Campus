"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";
import { Check } from "lucide-react";
import { registrationCopy } from "@/content/registration";

export interface ProgressSection {
  /** The id of the section's card, the target of its link. */
  id: string;
  title: string;
  optional: boolean;
  done: boolean;
}

const copy = registrationCopy.progress;

/**
 * Which section is "current": the last one whose top has scrolled above 35% of the viewport (the first one before
 * any has). Recomputed on scroll and resize, one animation frame at a time.
 */
export function useCurrentSection(ids: string[]): number {
  const [current, setCurrent] = useState(0);
  const key = ids.join("|");
  const list = useMemo(() => key.split("|"), [key]);

  useEffect(() => {
    let frame = 0;
    function compute() {
      frame = 0;
      const line = window.innerHeight * 0.35;
      let index = 0;
      list.forEach((id, position) => {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top <= line) index = position;
      });
      setCurrent(index);
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(compute);
    }
    compute();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [list]);

  return current;
}

/** True while the element is on screen (always true where IntersectionObserver is missing). */
export function useInView(ref: RefObject<HTMLElement | null>): boolean {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}

/** "3 of 4 sections complete": required sections only. */
export function completeText(sections: ProgressSection[]): string {
  const required = sections.filter((section) => !section.optional);
  return copy.completeOf(required.filter((section) => section.done).length, required.length);
}

function statusWord(section: ProgressSection): string {
  return section.done ? copy.statusDone : copy.statusTodo;
}

/** From 1024px: a sticky list beside the cards. Each item links to its section. */
export function ProgressList({ sections, current }: { sections: ProgressSection[]; current: number }) {
  return (
    <nav aria-label={copy.navLabel} className="hidden lg:block">
      <div data-testid="progress-list" className="sticky top-[calc(var(--header-h)+1.5rem)] rounded-xl border border-neutral-100 bg-white p-4 shadow-sm">
        <p className="font-bold font-heading text-primary text-sm">{completeText(sections)}</p>
        <ol className="mt-3 flex flex-col gap-1">
          {sections.map((section, index) => {
            const isCurrent = index === current;
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  aria-current={isCurrent ? "step" : undefined}
                  data-status={section.done ? "done" : isCurrent ? "current" : "todo"}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 font-body text-sm text-foreground outline-none transition-colors duration-(--motion-fast) hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary focus-visible:ring-4 focus-visible:ring-gold/40 ${isCurrent ? "bg-primary/10 font-bold" : ""}`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-primary font-bold text-xs ${
                      section.done ? "bg-gold text-primary" : isCurrent ? "bg-primary text-white" : "bg-white text-primary"
                    }`}
                  >
                    {section.done ? <Check focusable="false" className="size-4" /> : index + 1}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span>{section.title}</span>
                    {section.optional && <span className="font-normal text-xs">{copy.optional}</span>}
                  </span>
                  <span className="sr-only">
                    ({statusWord(section)}
                    {isCurrent ? `, ${copy.statusCurrent}` : ""})
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

/**
 * Below 1024px: a slim bar fixed under the header, "Section 2 of 6 · Parents". It shows only while the form is on
 * screen, and the form's controls scroll clear of it (--form-scroll-offset).
 */
export function ProgressBar({ sections, current, visible }: { sections: ProgressSection[]; current: number; visible: boolean }) {
  const total = sections.length;
  const text = copy.barText(current + 1, total, sections[current]?.title ?? "");
  return (
    <div
      data-testid="progress-bar"
      hidden={!visible}
      className="fixed inset-x-0 top-(--header-h) z-20 h-(--spacing-registration-progress-bar) border-neutral-100 border-b bg-white lg:hidden"
    >
      <div className="mx-auto flex h-full max-w-(--container-max-width) flex-col justify-center gap-1 px-(--container-gutter-x)">
        <p className="font-bold font-body text-primary text-sm">{text}</p>
        <div
          role="progressbar"
          aria-label={copy.navLabel}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={current + 1}
          aria-valuetext={text}
          className="h-1.5 overflow-hidden rounded-full bg-primary/10"
        >
          <div className="h-full rounded-full bg-primary transition-[width] duration-(--motion-fast) motion-reduce:transition-none" style={{ width: `${((current + 1) / total) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
