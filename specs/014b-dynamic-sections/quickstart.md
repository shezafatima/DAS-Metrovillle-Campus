# Quickstart: Dynamic Sections (014b)

**Prerequisite**: 014 slice 1 is committed (or merged) and its checks pass. This feature builds on its panels, actions and access value.

## Run the checks

Run these one at a time: never `npm run build` and Playwright together.

```bash
npm run lint
npx vitest run
npm run build
npx playwright test e2e/admin-settings-portal-links.spec.ts e2e/admin-settings-class-levels.spec.ts \
  e2e/admin-settings-syllabi.spec.ts e2e/admin-settings-examination.spec.ts e2e/admin-settings-seeded.spec.ts \
  e2e/public-dynamic-sections.spec.ts e2e/registration*.spec.ts e2e/page-sections.spec.ts \
  e2e/admin-roles-access-matrix.spec.ts
```

Diff the full E2E failure set against the admin baseline (`specs/014-page-settings/baseline-failures.txt`), and fix every new failure.

## Local check (by hand)

1. **Portal links**: as the main admin, go to Settings → Site-wide → Portal links. Add "LMS App" → `https://example.org` and "Student Login" → `http://203.0.113.5/`. The second link shows the not-secure warning. Try `javascript:alert(1)`: the field is refused. Save. Every public page's footer lists both links, and each opens a new tab. Remove both and save. The footer shows three columns. Open `/portal/lms-app` and you land on `/`.
2. **Class Levels**: on Settings → Admission → Class Levels, add Playgroup "2½ to 3½ years" and Class 1 "5½ to 6½ years", and set the date to 1 April. Save. `/admission#class-levels` shows "Age on 1 April". At 375 px the rows are stacked.
3. **Checklist**: in "Classes open for admission", tick Class 1 and save. With the window open, `/admission/register` lists only Class 1. Rename Class 1 to "Grade 1" in Class Levels and save. The form now shows "Grade 1". Delete it from Class Levels: the Admission tab warns, and the form shows Closed.
4. **Migration**: with typed classes left over from 013 (or seeded by a test helper), run `npm run migrate:class-levels`. Read the dry-run report, then run it with `-- --confirm`. Matched names become ticked, and unmatched ones are listed under "Not linked" and still offered in the form.
5. **Seed**: `npm run seed:sections -- syllabi` (dry run), then `-- syllabi --confirm`. Settings → Academics → Syllabi shows 11 levels and the pending notice. Run it again: it is refused. Edit a topic and save: the notice remains. Use "Mark as confirmed by client": the notice disappears. Repeat for `examination` and `portal-links`.
6. **Syllabi public**: open `/academics#syllabi`. The first level is selected, and Left/Right/Home/End move between tabs. Pick Class 4: the address becomes `#syllabi-class-4`, and Back leaves the page. Reload: Class 4 is selected. At 375 and 640 px a "Choose a class" select replaces the tabs.
7. **Examination public**: `/academics#examination` shows cards, 2 per row at 768 px and 1 at 375 px.
8. **Empty states**: clear Syllabi, Examination and Class Levels. The sections and their menu and search entries disappear, and `/academics/syllabi` lands at the top of `/academics`.
9. **Permissions**: as a Settings-only manager, the Academics tab is hidden and Class Levels is read-only. As a Pages-only manager, Portal links (Site-wide) is unreachable and the checklist is read-only.

## Recovering a removed item (runbook)

1. Find the entry: in `mongosh`, `db.settingsChanges.find({ group: "<group>" }).sort({ at: -1 }).limit(5)`. Each entry names who removed what, and when, and holds the full previous value under `removed[].value`, with a readable `label`.
2. Re-enter the item in its panel (Settings → the tab → the panel) from that value, then save. The save is checked, logged and revalidated as usual. Never write the settings record directly.

## Release order

1. Deploy (no data change is required: existing typed classes read as "not linked" and stay offered).
2. Optional, when the user decides: `npm run migrate:class-levels`, then `-- --confirm`, after the client has entered Class Levels.
3. Optional, when the user decides: `npm run seed:sections -- <section>`, then `--confirm`, for each section.
