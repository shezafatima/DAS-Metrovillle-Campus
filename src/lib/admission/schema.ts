import { z } from "zod";
import { itemId, text, uniqueIds } from "@/lib/content/fields";

/**
 * Shapes of the Admission page content (020, data-model.md §4–§5). The uniform
 * entries are the shape the 014 Admission tab will edit.
 */

const line = text(600);

const block = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text: line }),
  z.object({ type: z.literal("subheading"), text: text(80) }),
  z.object({ type: z.literal("bullets"), items: z.array(line).min(1) }),
  z.object({ type: z.literal("numbered"), items: z.array(line).min(1) }),
  z.object({
    type: z.literal("steps"),
    steps: z
      .array(
        z.object({
          id: itemId,
          /** Without the "1. " prefix: the ordered list numbers it. */
          text: line,
          bullets: z.array(line).min(1).optional(),
          fees: z.array(z.object({ letter: text(2), name: text(60), note: text(60) })).min(1).optional(),
        }),
      )
      .min(1)
      .refine(uniqueIds, "step ids must be unique"),
  }),
]);

export type ProcedureBlock = z.infer<typeof block>;

export const procedureSchema = z.object({
  source: z.literal("https://das.edu.pk/admission/"),
  sections: z
    .array(
      z.object({
        id: itemId,
        /** Verbatim, including the step number: "1. Eligibility". */
        heading: text(80),
        /** The step's intro line, shown centred under its heading. */
        intro: line,
        blocks: z.array(block),
      }),
    )
    .length(4)
    .refine(uniqueIds, "section ids must be unique"),
});

export type AdmissionProcedure = z.infer<typeof procedureSchema>;
export type ProcedureSection = AdmissionProcedure["sections"][number];

export const UNIFORM_IMAGE_DIR = "/images/admission/uniform/";

export const uniformGroupSchema = z.object({
  id: itemId,
  category: text(60),
  gender: z.enum(["Boys", "Girls"]),
  items: z.array(text(80)).min(1),
  image: z.object({ src: z.string().startsWith(UNIFORM_IMAGE_DIR), alt: text(300) }).optional(),
});

export type UniformGroup = z.infer<typeof uniformGroupSchema>;

export const uniformSchema = z.object({
  source: z.literal("https://das.edu.pk/admission/uniform/"),
  uniform: z.array(uniformGroupSchema).min(1).refine(uniqueIds, "uniform ids must be unique"),
});

export type UniformContent = z.infer<typeof uniformSchema>;

export const admissionPageSchema = z.object({
  title: text(60),
  trail: z.array(text(60)).min(1),
  apply: z.object({ label: text(40), href: z.literal("/admission/register") }),
  uniformLabel: text(60),
});

/** Page copy: the validated strings plus the copy that takes a value (typed, not parsed). */
export type AdmissionPage = z.infer<typeof admissionPageSchema> & {
  /** The banner's close line, e.g. "Applications close on 31 March 2027". */
  closesOn: (date: string) => string;
  /** The uniform card flip button's name. */
  flipUniform: (title: string) => string;
};
