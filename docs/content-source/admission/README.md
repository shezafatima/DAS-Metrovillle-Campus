# Admission content sources (020)

Verbatim text from the reference site, retrieved 2026-10-14 from the raw page HTML, one line per heading, paragraph or list item. **Pending client confirmation.**

| File | Source | Notes |
|---|---|---|
| `procedure.txt` | https://das.edu.pk/admission/ | The brief's `/admission/admission-procedure/` returns 404; the reference menu's "Admission Procedure" links here. Sections 1–4 only. Steps of "4. Admission Formalities" keep their written "1. "–"7. " numbers; fee rows are `letter \| fee \| note`. |
| `uniform.txt` | https://das.edu.pk/admission/uniform/ | Page published 2019-12-12. Category heading, then each gender heading followed by its items. |

Left out on purpose (spec Clarification Q1 and "Deviations from the reference"):

- the empty Eligibility age table (CLASS LEVELS / AGE on JULY 31st);
- the red next-step buttons "Registration", "Admission Test", "Admission Formalities", "Success" (deviation V3);
- everything from "4. Success" onward ("Apply Below!", "Join Over 500,000 Students…" and its contact form);
- the Hifz Students’ Uniform **Girls** group is kept in `uniform.txt` but not shown on the site (requester, 2026-10-14; spec deviation V8).

Photos: four are the reference's own files (`public/images/uniform/`, copied to `public/images/admission/uniform/`). The Hifz boys' photo (`hifz-uniform.png` → `hifz-boys.png`) was supplied by the requester on 2026-10-14 and is not from the reference; it shows a white cap and white socks and no waist coat or blazer, unlike the Hifz boys' list (on the client review list).

The text is shown word for word, including the reference's own grammar. `src/content/admission/fidelity.test.ts` checks the displayed text against these files.
