# Boogle Dox

A lightweight browser-based document editor inspired by familiar document workflows, with rich-text editing, persistence, file import, and intentional sharing controls.

> **Documentation preview.** Source code and deployment have not been included in this planning pack. Replace placeholders and update the feature checklist after implementation.

## Live demo

**URL:** [ADD LIVE PRODUCT URL]  
**Demo accounts:** [ADD REVIEWER ACCOUNTS OR DEMO SIGN-IN INSTRUCTIONS]

## Implemented functionality

[After building, list only features that work end to end. Do not leave planning features under an "implemented" heading.]

## Known limitations

[Add accurate limitations, partial functionality, and any important bugs.]

## Stack

**Proposed:** Next.js / React / TypeScript, Tiptap, Supabase PostgreSQL / Auth, Tailwind CSS, Vitest, Vercel. Update this line to match what was actually used.

## Local setup

1. Install Node.js [VERSION TESTED].
2. Clone or unzip the source code.
3. Run `npm install`.
4. Copy `.env.example` to `.env.local` and fill in the required development credentials. **Never upload secret values.**
5. Apply the database setup [ADD ACTUAL MIGRATION COMMAND].
6. Run `npm run dev` and visit `http://localhost:3000`.
7. Run `npm test` [CONFIRM ACTUAL TEST COMMAND].

### Environment variables

[LIST ACTUAL NAMES AND WHETHER PUBLIC OR SERVER-SIDE; DO NOT INCLUDE SECRETS]

## File import

**Intended formats:** `.txt`, `.md`. **Maximum size:** [ADD ACTUAL LIMIT].

## Sharing demo

1. Sign in as [OWNER USER].
2. Open [DOCUMENT] and grant [SECOND USER] viewer access.
3. Copy the document link.
4. Open the link as [SECOND USER] and verify read-only behavior.
5. Repeat with editor access; confirm changes persist.
6. Confirm [UNAUTHORIZED USER] receives an access-denied result.

## Automated testing

[LIST EXACT TEST COMMAND, TEST CASES, AND PASSING RESULTS AFTER RUNNING]

## Architecture and decisions

See `ARCHITECTURE.md` and `PRODUCT_REQUIREMENTS.md`.

## AI disclosure

See `AI_WORKFLOW.md` for specific tool use, decisions, and verification.

## What I'd do with 2–4 more hours

[BASED ON WHAT REMAINS INCOMPLETE; likely improve edit-session status, page/ruler controls, and finer formatting behavior.]
