# Quickstart: Contact & Messages (008)

How to run and verify the feature locally. Assumes the 002 foundation
is set up (`specs/002-foundation/quickstart.md`): Atlas reachable,
admin seeded.

## 1. Configure

Nothing new — no environment variable, dependency or service
(research §18). The `messages` collection and its indexes are created
by Mongoose on first use.

## 2. Tokens and assets first (once, before building the public UI)

```bash
npx tsx research/extract-contact-tokens.ts
```

Writes `research/tokens/contact-page-{375,768,1024,1440}.json`
(per-element values — the existing `contact-*.json` files are the first
crawl's page aggregates and are left untouched) and downloads the
banner and four illustrations into `public/images/contact/`. Copy the
values into `research/design-tokens.md` ("Contact page (008)") and
`src/app/globals.css` `@theme`. If the live page differs from
`screenshots/das.edu.pk_contact_*.png`, stop and flag it
(Constitution I).

## 3. Run

```bash
npm run dev
```

- Public: `http://localhost:3000/contact`
- Admin: `http://localhost:3000/admin/messages` (log in first);
  `http://localhost:3000/admin` shows the Messages card.

## 4. Verify by hand (mirrors the E2E specs)

1. `/contact`: four detail columns, "Locate Us on Google Maps" + map
   with "Open in Google Maps" under it, yellow form band. At 1440px,
   open DevTools → Network before loading: no `maps.google.com`
   request until you scroll to the map, and the map fills its space
   without pushing the form down.
   "Click this link to view inquiry form" scrolls to the form and
   focuses Name.
2. Press Send with everything empty → Name, Email, Subject, Message
   "required" messages; Phone has none (optional). Enter `ali@example`
   and phone `12345` → email and phone format messages. Nothing saved.
3. Paste 5,001 characters into Message → counter turns red, message
   "Message must be 5,000 characters or fewer." on Send.
4. Send a valid message with no phone → thank-you, fields cleared.
   "Send another message" → empty form. Send a second, different
   message from `ALI@example.com`.
5. Admin sidebar shows **2** on Messages. `/admin/messages`: both
   rows, newest first, bold with a "New" badge, one-line previews.
6. Open one → status becomes **Read**, sidebar shows **1**. The Phone
   line says "Not provided" with no call/WhatsApp link. Back link
   returns to the inbox with filters intact.
7. Choose "Mark as responded" → toast "Status updated to Responded".
   Set it back to New → toast; sidebar shows **2** again.
8. Filter "Responded" / search part of the subject → correct rows.
9. Delete from the detail page → confirm → back in the inbox, row gone,
   counts drop. Opening its old URL shows "no longer available".
10. Send a message whose subject and body contain
    `<script>alert(1)</script><b>x</b>` → shown literally, no alert.
11. Send six messages quickly → the sixth says "Too many messages —
    please try again shortly." and keeps the typed text.

## 5. Tests

```bash
npm test                                   # Vitest (DB suites skip without MONGODB_URI)
npx playwright test --project=forms        # contact-public, contact-visual (+ signup specs)
npx playwright test --project=admin -g "messages"   # inbox, journey, protected
```
