# Submission

Boogle Dox is a lightweight document editor with import and owner/editor/viewer sharing. Next.js 16, React 19, TypeScript, Tiptap, Supabase Auth and Postgres (hosted), PGlite (local).

## Included

| Item | Where |
| --- | --- |
| Source code | This repository (`src/`, `supabase/migrations/`) |
| Setup and run instructions | `README.md` |
| Architecture note | `ARCHITECTURE.md` |
| AI workflow note | `AI_WORKFLOW.md` |
| Development log with every check and result | `DEVELOPMENT_LOG.md` |
| Reviewer walkthrough steps | `WALKTHROUGH_NOTES.md` |
| Demo GIF (hosted mode: import, imported formatting, sharing) | `docs/boogledox-demo.gif` |
| Walkthrough video URL | `VIDEO_URL.txt` |
| Live product URL | Not deployed yet. See "Status" below. |

## Reviewer accounts

Hosted sign-in uses accounts created in the Supabase dashboard: `tracy@boogledox.test` (owner of the demo documents), `nathan@boogledox.test` (editor), `nora@boogledox.test` (viewer). Passwords are provided privately with the submission, not in this public repository.

Locally, with no Supabase variables, the same three people are demo accounts chosen from the account menu. That switcher is not a login.

## Status

Working and verified:

- Create, rename, edit, bold, italic, underline, headings 1–3, bulleted and numbered lists, undo and redo, autosave with revision checks, and reopen after refresh. Verified locally and against the live Supabase project.
- Import of `.txt`, `.md`, and `.markdown` up to 500 KB into a new document. Verified through the file picker against Supabase.
- Sharing with one owner and editor or viewer roles. Granting Nathan as editor and Nora as viewer was verified against Supabase. Viewer read-only, editor update, hidden-from-stranger, duplicate share, and invalid role are verified locally in the browser and by automated tests, including tests of the hosted row-level-security SQL.
- 19 automated tests, ESLint, TypeScript, and a production build pass.
- Production without Supabase settings fails closed with 503 instead of using a local database.

Incomplete:

- Public deployment. The app has not been deployed to Vercel yet.
- Signed in as Nathan or Nora against the live project (editor save, viewer read-only, unauthorized account, copied link) has not been run.
- `anon` and `authenticated` still hold `REFERENCES`, `TRIGGER`, and `TRUNCATE` on the app tables in Supabase. The Data API cannot use them, but they should be revoked.
- Opening a document as owner saves it once with no edits, which bumps its revision.

Next with 2–4 more hours: deploy to Vercel and test the public URL with all three accounts, revoke the extra table privileges, stop the save-on-open, finish the share dialog focus trap, and add export to Markdown.

## Deliberately left out

Real-time co-editing and cursors, comments, version history, `.docx` import, Insert and Tools menus, extra formatting such as fonts and colors, and collaborative drafts with voting. Depth in editing, persistence, and access control came first.
