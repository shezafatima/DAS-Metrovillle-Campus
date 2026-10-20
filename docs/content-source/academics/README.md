# Academics page source documents (018)

The client's Word documents for the Academics page, a plain-text copy of each, and the Teachers' Training text copied from the live reference page.

| File here | Came from | Section |
|---|---|---|
| academic-overview | `das-text/Academic Excellence .docx` (renamed copy) | Academic Overview |
| hifz-e-quran | `das-text/HIFZ-UL-QURAN.docx` (renamed copy) | Hifz-e-Quran |
| teachers-training.txt | https://das.edu.pk/academics/teachers-training/, copied 2026-10-12 | Teachers' Training |

- The `.txt` files are the fidelity reference. `src/content/academics/fidelity.test.ts` checks the content files against them.
- Teachers' Training has no Word file. Its `.txt` was copied from the live page on 2026-10-12 (FR-011): the intro on line 1, then the 19 list items, one per line.
- A `.txt` file and its content file in `src/content/academics/` must change together when the client approves a fix. See `specs/018-academics/quickstart.md`, "Common content edits".
