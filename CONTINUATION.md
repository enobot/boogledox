# Continuation prompt

Paste this whole document into a new ChatGPT or Grok chat before asking for more Boogle Dox work.

You are helping Tracy continue Boogle Dox, an original browser document editor for a Full Stack Product Engineer take-home. It is inspired by familiar document editing and a review workflow. Do not copy Google logos, names, or assets. The product name is Boogle Dox.

Tracy is the product owner. Do not change product behavior, creative direction, or architecture without explaining the tradeoff and asking first. Do not commit, push, or open a pull request unless Tracy explicitly asks. Git history must use Tracy's existing git identity only. Do not put an assistant, Cursor, ChatGPT, Grok, or any other tool name in the author, commit message, or co-author trailer. Do not invent credentials, hosted project URLs, or test results. Do not claim a feature works unless you ran it. Do not delete, skip, or weaken tests.

## Product decisions already made

- Stack: Next.js 16.4.5 App Router, React 19.3.0, TypeScript, Tailwind CSS 4, Tiptap 3.32.2, local PGlite 0.5.15, Vitest 5.1.0. Node.js 26.13.0 was used. Python and C++ are not part of the stack.
- Brand: professional and slightly playful. Colors already in `src/app/globals.css`: warm off-white desk, paper, lavender, muted purple, deep plum. The logo is an original plum document mark in `src/components/brand/Logo.tsx` and `src/app/icon.svg`.
- Dashboard tagline, chosen by Tracy: "Collaboration made easier". Do not restore "A calm page for your writing".
- Rich text stores Tiptap JSON, not HTML. Zoom is CSS on the page view and is not saved.
- Local database files live in `%USERPROFILE%\.boogledox\pglite` so OneDrive does not sync the live database. Override with `BOOGLEDOX_DATA_DIR`. `DATABASE_URL` is not read.
- Hosted Supabase is the intended production database and auth system. It is not connected. Do not pretend that it is. Do not block local work on credentials Tracy has not provided. The SQL in `supabase/migrations` is what should later be applied to hosted Postgres.
- Collaborative drafts and voting are the later product distinction. Do not build them until create, edit, save, import, share, tests, and a real hosted deployment work. Do not label a partial review flow complete.
- Demo accounts are Tracy, Nathan, and Nora. This switcher is not authentication.

## What already works

Verified on 2026-11-04.

- Dashboard at `/`: create a document, list owned documents, show documents shared with the current demo account, empty and loading and error states, import control.
- Editor at `/documents/[id]`: title, bold, italic, underline, headings 1–3, bullet list, numbered list, undo, redo. File, Edit, Format, and View menus only run those real actions. Insert and Tools are omitted on purpose.
- Autosave with Saving, Saved, Unsaved changes, and save error. A failed save does not discard editor text. Saves send a revision. A stale revision returns HTTP 409 `stale_revision` and does not replace the open draft.
- Empty titles are rejected. Titles are trimmed, required, and limited to 200 characters. Content is Tiptap document JSON, max 1,000,000 bytes, with depth and prototype-key checks.
- Import `POST /api/documents/import` accepts `.txt`, `.md`, and `.markdown` up to 500 KB. It rejects the wrong extension, empty files, oversized files, and null bytes. Markdown headings, bold, italic, and lists become Tiptap JSON. Script and HTML text stay text. The filename stem becomes the title.
- Sharing: one owner. Owner can grant editor or viewer to a known demo email, change that role, revoke it, and copy a link. The link does not grant access. Duplicate share returns 409. Unknown email returns 404. An invalid role returns 400. A viewer can read and gets 403 `read_only` on save. An unrelated account gets the same 404 as a missing document. Editors can update. Only the owner can change sharing.
- Permissions are enforced in `src/lib/documents/repository.ts` and `src/lib/permissions/access.ts`, not only by hiding buttons. The client cannot choose an arbitrary user id. The server allowlist is the three demo accounts. Cookie name: `boogledox_user`. HttpOnly, SameSite=Lax, Secure only when `NODE_ENV=production`. No cookie means Tracy, so older local documents still open.
- Demo ids: Tracy `00000000-0000-4000-8000-000000000001` tracy@boogledox.test, Nathan `00000000-0000-4000-8000-000000000002` nathan@boogledox.test, Nora `00000000-0000-4000-8000-000000000003` nora@boogledox.test. Profiles are seeded in application code after migration, not in the SQL file.

## Verification already recorded

- `npx tsc --noEmit` passed.
- `npx eslint src vitest.config.ts --max-warnings 0` passed before a one-line type narrowing. Typecheck passed after that line.
- `npx vitest run` passed: 9 tests in `src/lib/documents/access-and-import.test.ts`. They use a temporary PGlite directory and the real repository. Covered: owner update, editor update, viewer blocked, unrelated account hidden, stale revision, duplicate share, unknown email, invalid role, viewer cannot share, bad and empty and oversized and binary imports, Markdown heading and bold with a script tag stored as text.
- Browser on desktop Chrome through the Cursor browser, http://localhost:3000: create and format path from the first milestone; imported lesson showed a heading and the script tag as text; share panel listed Tracy, Nathan, and Nora; Nora was read-only; Nora's dashboard showed the document under Shared with me; account was switched back to Tracy. The file picker itself was not driven in the browser. Import was verified through the API.
- `npm run build` completed with Next.js 16.4.5. `npm start` then served `/` and the document API. The dev server was restarted afterward at http://localhost:3000.
- Firefox, Safari, Edge, tablet, and phone were not tested. Performance was not measured. Do not invent LCP, INP, or CLS numbers.

Local documents that must not be deleted: "Browser check", "Persisted page", and an imported document titled "lesson". They live in the local PGlite directory, not in git.

## Important code map

- `src/lib/db/client.ts` opens one PGlite database, applies `supabase/migrations/*.sql` when `schema_migrations` does not already contain that file's id, seeds demo profiles, and exposes `closeDatabaseForTests`.
- `src/lib/documents/repository.ts` lists, creates, reads, and updates documents and manages sharing.
- `src/lib/import/import-file.ts` parses uploads.
- `src/lib/auth/current-user.ts` reads and sets the demo cookie.
- `src/components/editor/DocumentEditor.tsx` and `useDocumentSave.ts` are the editor and autosave. Do not replace them to add a feature.
- `src/components/editor/SharePanel.tsx` and `src/components/account/AccountSwitcher.tsx` are the share and account UI.
- `src/components/dashboard/Dashboard.tsx` is the home page.
- API routes: `/api/documents`, `/api/documents/[id]`, `/api/documents/import`, `/api/documents/[id]/access`, `/api/session`.
- Docs: `README.md`, `ARCHITECTURE.md`, `DEVELOPMENT_LOG.md`, `AI_WORKFLOW.md`, `WALKTHROUGH_NOTES.md`, `CLAUDE.md`.
- Tests run with `fileParallelism: false` because PGlite is a process-wide singleton. `vitest.config.ts` uses Vite's built-in `resolve.tsconfigPaths`.

## Known limits

- The demo switcher is intentionally weak. Anyone who can open this copy can act as Tracy, Nathan, or Nora. Say that plainly. Do not call the app fully secure or production-ready.
- Mutating requests check `Origin` against `Host` only when `Origin` is present.
- Email lookup can only find the three seeded accounts.
- StarterKit already includes underline. Do not add `@tiptap/extension-underline` again.
- Next.js 16 Cache Components are enabled. Do not add `export const runtime` or `dynamic = "force-dynamic"`. Dynamic route params are a Promise. Route handlers call `connection()` from `next/server` before database work.
- `npm` once failed certificate verification until `NODE_OPTIONS=--use-system-ca`.
- Git remote intended: https://github.com/enobot/boogledox.git. Do not force-push.

## Do this next, in order

1. If hosted Supabase credentials exist, connect Supabase Auth and hosted Postgres using the existing migration SQL and server-side permission checks. Keep the local PGlite path working for tests. Ask Tracy for the project URL and keys rather than inventing them.
2. Deploy to Vercel over HTTPS and test the deployed URL separately from localhost.
3. Only after those work, consider collaborative drafts. Do not start them early.
4. Extra formatting, Insert, and Tools menus wait until each action really works.

## How to run

```bash
npm install
npm run dev
npm test
npm run build
```

Open http://localhost:3000. Review steps are in `WALKTHROUGH_NOTES.md`.
