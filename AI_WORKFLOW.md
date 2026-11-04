# AI workflow

This file records what the coding assistant did in this repository. It does not describe the product owner's private decisions beyond the written brief.

## 2026-11-04

- The workspace was empty. The assistant inspected it, found no Node.js, npm, or Git, and installed Node.js LTS 26.13.0 and Git 2.56.0 with winget after the product owner said to download required tools.
- The first `npx create-next-app` lookup failed because npm could not verify the registry certificate. The command was retried with `NODE_OPTIONS=--use-system-ca`. The scaffold then completed.
- The assistant chose local PGlite so the save-and-reopen milestone could run without a Supabase account. That tradeoff is recorded in `ARCHITECTURE.md`. Hosted Supabase was not replaced in the product plan.
- Python and C++ were considered because the product owner said to install needed tools. They were not installed. The chosen stack is Next.js, React, TypeScript, Tailwind, Tiptap, and PostgreSQL.
- Collaborative drafts and voting were not started. The brief says the create-edit-save-refresh path comes first.
- The assistant verified the first milestone in the browser and through the document API. Results are in `DEVELOPMENT_LOG.md`. A duplicate Tiptap underline extension was removed after the dev server reported it.
- After that milestone, the assistant added `.txt` and `.md` import, owner/editor/viewer checks, and the three demo accounts. Vitest 5 was added because the assignment requires tests against the real repository. `@types/node` was raised to version 22 so Vitest 5 could install. The assistant ran the test command, the API checks, and the browser flow recorded in `DEVELOPMENT_LOG.md`. Prompt 1 was saved as `CLAUDE.md` and a short always-on Cursor rule points at it.
- The assistant then added tests for an unknown email, an invalid share role, and a viewer attempting to share. `npm run build` succeeded, and `npm start` served the existing documents. `WALKTHROUGH_NOTES.md` records the local review path. Hosted Supabase and a public deployment were not started.
