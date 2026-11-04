# Continuation prompt

Paste this whole document into a new assistant chat before asking for more Boogle Dox work.

You are helping Tracy continue Boogle Dox, an original browser document editor for a Full Stack Product Engineer take-home. It is inspired by familiar document editing and a review workflow. Do not copy Google logos, names, or assets. The product name is Boogle Dox. GitHub: https://github.com/enobot/boogledox.

Tracy is the product owner and the only git author (`enobot`). Do not change git config. Do not commit, push, force-push, or open a pull request unless Tracy explicitly asks. Do not put any assistant or tool name in the author, committer, commit message, or a co-author trailer, and check the published commit for an appended trailer after any push. Do not invent credentials, hosted project URLs, or test results. Do not claim a feature works unless you ran it. Do not delete, skip, or weaken tests. Do not discard uncommitted work or delete local documents. Follow `CLAUDE.md`.

## Product decisions already made

- Stack: Next.js 16.4.5 App Router, React 19.3.0, TypeScript, Tailwind CSS 4, Tiptap 3.32.2, local PGlite 0.5.15, Vitest 5.1.0, `@supabase/supabase-js` ^2.119.0, `@supabase/ssr` ^0.12.7. Node.js 26.13.0, npm 11.20.0. No Python or C++.
- Brand: professional and slightly playful. Colors in `src/app/globals.css`. Original plum document logo in `src/components/brand/Logo.tsx` and `src/app/icon.svg`.
- Dashboard tagline, chosen by Tracy: "Collaboration made easier". Do not restore "A calm page for your writing".
- Rich text is stored as Tiptap JSON, not HTML. Zoom is CSS only and is not saved.
- Menus: File, Edit, View, Format, only for actions that exist. Insert and Tools are omitted on purpose.
- One owner per document. Roles: owner, editor, viewer. A copied URL does not grant access. The client is never trusted for user id, owner, or permission.
- Collaborative drafts and voting come later. Do not build them until create, edit, save, import, share, tests, and a real hosted deployment work.

## Git state

- `main` at `854c089` ("Add the local document editor so pages can be created, saved, imported, and shared before hosted auth is connected."), in sync with `origin/main`, author and committer `enobot`, no trailer.
- Everything in "Hosted mode" below, the proxy fix, `src/proxy.test.ts`, and these doc updates are **uncommitted**.

## Runtime modes (`src/lib/auth/runtime-mode.ts`)

| Environment | Supabase vars | Mode | Behavior |
| --- | --- | --- | --- |
| `npm run dev` / tests | absent or invalid | local | PGlite + demo cookie switcher |
| `npm run dev` | valid | hosted | Supabase Auth + Postgres |
| production (`npm start`, Vercel) | `https://` URL + `sb_publishable_...` key | hosted | Supabase Auth + Postgres |
| production | missing, `http://`, or legacy `eyJ...` JWT | misconfigured | 503 everywhere; never opens PGlite; ignores the demo cookie |

Only two variables are used: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No secret key, database password, or `DATABASE_URL` is needed for document routes. Never ask Tracy to paste key values into chat.

## Local mode (committed, verified earlier)

- Dashboard `/`, editor `/documents/[id]`, autosave with revision checks (409 `stale_revision`), import of `.txt`/`.md`/`.markdown` up to 500 KB, sharing with owner/editor/viewer. Details and limits are in `README.md` and `ARCHITECTURE.md`.
- Demo accounts (seeded in code with `ON CONFLICT DO NOTHING`): Tracy `...0001` tracy@boogledox.test, Nathan `...0002`, Nora `...0003` (prefix `00000000-0000-4000-8000-00000000`). Cookie `boogledox_user`, HttpOnly, SameSite=Lax, Secure only in production. No cookie means Tracy. The switcher is an allowlist, not authentication: anyone who can open the local copy can act as any of the three.
- Database: `%USERPROFILE%\.boogledox\pglite`, override `BOOGLEDOX_DATA_DIR`. One process-wide PGlite singleton; never open the same folder from two processes.
- Local documents that must not be deleted: "Browser check" (`8d758b59-56f1-410b-887f-385747f06dae`), "Persisted page" (`57b2b17b-4207-4049-a19b-2613414163fc`), "lesson" (`507050aa-6c89-4ba4-9988-8858fc3ba57d`, shared with Nathan as editor and Nora as viewer). Hosted mode will not show them.
- A verified copy of that folder was taken on 2026-11-04 at `%USERPROFILE%\.boogledox\pglite-backup-2026-11-04-before-dev-restart`. A second copy, `pglite-verify-2026-11-04`, was made for a verification server and was not opened.

## Live Supabase status (2026-11-04)

- Project `boogledox` (ref `xjqxbzaizsunaemtfrqr`, Free plan, East US) in Tracy's `drawgorithms` org. Do not touch the separate `drawgorithms` project. "Automatically expose new tables" is off and automatic RLS is on. `001`–`004` are applied. Users `tracy@`, `nathan@`, `nora@boogledox.test` exist with profiles. `.env.local` (gitignored) points the dev server at it.
- VERIFIED as Tracy from `npm run dev`: sign-in, create, rename, format, refresh, import through the file picker, share with Nathan as Editor and Nora as Viewer. Signed-out 401 and redirect, generic 401 for bad credentials, 403 cross-origin, demo cookie ignored.
- NOT TESTED live: signed in as Nathan or Nora, an unauthorized account, a copied link by another account, sign-out, Vercel.
- To do: revoke `REFERENCES, TRIGGER, TRUNCATE` from `anon, authenticated` on the app tables (new migration), update the dashboard text that mentions the demo switcher in hosted mode, deploy to Vercel. The assistant must not create accounts, type passwords, or paste keys into Vercel; Tracy does those.

## Hosted mode code

- `src/proxy.ts` (Next.js 16 proxy) refreshes the Supabase session cookie and copies Cache-Control, Expires, and Pragma onto replacement responses. Signed out: `/api/*` returns 401 JSON, other pages redirect to `/auth/sign-in`. `/auth/*` pages and `/api/auth/*` routes stay reachable without a session. In misconfigured production it returns 503 for every matched path.
- Identity on the server uses `supabase.auth.getClaims()`, not `getSession()`.
- `POST /api/auth/sign-in` (email + password, generic 401 on bad credentials) and `POST /api/auth/sign-out`. Both return 503 unless the mode is hosted. `POST /api/session` refuses to set the demo cookie outside local mode. In hosted mode the account menu shows **Sign out**.
- `src/lib/documents/repository.ts` delegates to `src/lib/documents/hosted-repository.ts` when hosted. It uses the user-scoped server client (publishable key + cookies), never a secret key. List, get, insert use PostgREST under RLS. Save and sharing use SQL functions.
- `src/lib/db/client.ts` refuses to open PGlite in hosted or misconfigured mode. The local migration runner skips `*.hosted.sql`.
- `supabase/migrations/003_rls.hosted.sql`: RLS, revoked direct writes on permissions, no direct update grant on documents, `SECURITY DEFINER` functions with `search_path = public` (`caller_can_view`, `current_user_owns`, `save_document`, `grant_document_access`, `change_document_access`, `revoke_document_access`), and a trigger that blocks id/owner changes and requires `revision = old + 1`. User ids stay `text`. Any signed-in user can select `profiles`, so registered emails can be enumerated. That is a known, disclosed limit.
- `supabase/migrations/004_profile_trigger.hosted.sql`: creates a profile row after insert on `auth.users`. It has no automated test.
- `src/lib/supabase/client.ts` (browser client) is not imported anywhere. If it is ever used in the browser, its mode check reads `process.env` as an object, which the browser bundle does not populate. Fix that before using it.

## Verification recorded on 2026-11-04 (this tree)

- VERIFIED `npx eslint src vitest.config.ts --max-warnings 0`: exit 0, before and after the proxy fix.
- VERIFIED `npx tsc --noEmit`: exit 0 after the fix.
- VERIFIED `npx vitest run`: 4 files, 19 tests passed (9 access/import, 3 runtime mode, 3 RLS on PGlite, 4 proxy).
- VERIFIED `npm run build`: passed before the fix and again after it. Between those, two builds FAILED with `EPERM ... unlink '.next\static\<id>'` because OneDrive turned the previous build's folder into a cloud placeholder, which Node's `readdir` reports as a symlink. Deleting that one stale generated folder fixed it. Moving the repo out of OneDrive would stop it recurring.
- VERIFIED `next start -p 3100` with no Supabase variables: `/`, `/auth/sign-in`, a document page, `GET /api/session`, `GET /api/documents`, and `POST /api/session` all returned 503 with `cache-control: private, no-store`. The PGlite folder was not written.
- FIXED: the proxy returned 401 to a signed-out `POST /api/auth/sign-in`, so hosted sign-in could never succeed, and `startsWith("/auth")` also exempted paths like `/authors`. `src/proxy.test.ts` reproduced both before the fix.
- VERIFIED in the browser (in-app Chromium pane, desktop width, local mode, real PGlite folder): tagline "Collaboration made easier", switcher on Tracy, all five documents listed, "Persisted page" reopened with its formatting, switch to Nora showed lesson under Shared with me as Viewer, Nora's lesson page was read-only with disabled formatting and the script shown as text, switched back to Tracy, `/auth/sign-in` rendered, no console errors. `POST /api/auth/sign-in` and `/sign-out` returned 503 in local mode.
- Before that, a stuck orphaned `next dev` (about 100% CPU, 12.6 GB RAM) had to be stopped. The database was backed up first and reopened cleanly afterward.
- FOUND, not fixed (pre-existing): opening a document as owner sends a save with no edits ("Persisted page" went from revision 2 to 3, content unchanged). Editor files are unchanged since `854c089`. This can cause a 409 for another open copy. Ask Tracy before changing autosave.
- NOT TESTED: anything against a live Supabase project, Vercel, Firefox, Safari, Edge, tablet, phone, performance (no LCP, INP, or CLS numbers exist).

## Known limits

- The share dialog focus trap is incomplete.
- Autosave edge: if `saveNow` returns false because a later draft is still dirty, going home can report a failed save even though the first snapshot was saved. Do not redesign unless Tracy asks.
- Mutating requests check `Origin` against `Host` only when `Origin` is present.
- `npm audit` reported 8 moderate vulnerabilities. Do not run `npm audit fix --force`.
- If npm fails certificate verification, use `NODE_OPTIONS=--use-system-ca`.
- Next.js 16: `src/proxy.ts` exports `proxy`. Do not add `middleware.ts`, `export const runtime`, or `dynamic = "force-dynamic"`. Route params are a Promise. Route handlers call `connection()` before database work. `cacheComponents` and `partialPrefetching` are on.
- Tiptap StarterKit already includes underline. `useEditor` needs `immediatelyRender: false`.

## Do this next, in order

1. Local browser check is done (see above).
2. Tracy sets up Supabase (steps in `README.md` → "Hosted mode setup"): create the project, put the two variables in `.env.local`, set the Auth site URL to `http://localhost:3000`, run `001_documents.sql`, `002_permissions.sql`, `003_rls.hosted.sql`, then `004_profile_trigger.hosted.sql` in the SQL editor (003 alters tables that 001 and 002 create), then create reviewer users under Authentication → Users so the 004 trigger makes their profiles. Check Supabase's Security Advisor afterward: `schema_migrations` has no RLS, and default grants to `anon`/`authenticated` have not been inspected.
3. Then test hosted mode: sign-in, create, rename, format, save, refresh, import, owner share, editor update, viewer read-only, unauthorized account, copied link, persistence, sign-out.
4. Vercel: connect `enobot/boogledox`, set the same two variables for Production, deploy, add the Vercel HTTPS URL to the Supabase Auth URL settings, redeploy after any env change, and test the public URL. Do not claim deployment works before that.
5. Commit and push only when Tracy asks.
6. Do not start collaborative drafts, voting, live cursors, Insert, Tools, or extra formatting.

## How to run

```bash
npm install
npm run dev
npm test
npm run build
```
