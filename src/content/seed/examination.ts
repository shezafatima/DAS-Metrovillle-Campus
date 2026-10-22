// Examination seed: copied once from https://das.edu.pk/academics/examinations/ on 2026-10-20 by the capture described in specs/014b-dynamic-sections/research.md (R10).
// PENDING CLIENT CONFIRMATION: it has not been confirmed that this applies to the Metroville campus.
// It is written to the database only by `npm run seed:sections` (a dry run unless --confirm), and never over existing content.
import type { ExaminationSeed } from "./types";

export const examinationSeed: ExaminationSeed = {
  "source": "https://das.edu.pk/academics/examinations/",
  "capturedOn": "2026-10-20",
  "adaptations": [
    "Each H3 heading and the paragraph under it is one block, verbatim; the page has no tables or files."
  ],
  "blocks": [
    {
      "heading": "NURSERY, PREP",
      "body": "All assessments are carried out in a relaxed and informal manner. There are no formal end of term tests."
    },
    {
      "heading": "Grade-1 – 7",
      "body": "Formal mid-year examination is held at the end of the first term and an annual examination at the conclusion of the final term. In addition to the examination results, the term marks reflect a student’s all round progress, including performance in course-work assignments, projects and tests."
    },
    {
      "heading": "Class 8-10",
      "body": "Examinations are modeled on the Divisional Board pattern giving due consideration to the academic attainment targets of the classes concerned. Trial examinations are held in preparation for the final examination after course coverage."
    },
    {
      "heading": "UNIFIED EXAMINATION",
      "body": "The unified examinations ensure uniformity in syllabus coverage as well as the marking process. These examinations enhance the school’s philosophy of continually working towards academic excellence. Each campus has developed its own examination cell to ensure sanctity of the examination process."
    }
  ]
};
