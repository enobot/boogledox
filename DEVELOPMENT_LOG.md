# Development log

## 2026-11-04

### Environment

- The project folder was empty and was not a git repository.
- Node.js and Git were not installed. Node.js 26.13.0 and npm 11.20.0 were installed with winget to `C:\Program Files\nodejs`. Git 2.56.0 was installed the same way.
- A portable Node copy was also downloaded to `%LOCALAPPDATA%\nodejs-portable` while the installer waited for administrator approval. The Program Files install is the one on PATH.
- Python and C++ were not installed. This app does not use them. React 19.3.0 is installed as a Next.js dependency.

### Milestone 1

Stack initialized with `create-next-app`: Next.js 16.4.5, React 19.3.0, TypeScript, Tailwind CSS 4.

Added Tiptap 3.32.2 and `@electric-sql/pglite` 0.5.15.

Decision: persist the first milestone in local PGlite using the Supabase migration file, instead of blocking on a hosted Supabase project. The product behavior for this milestone is still create, edit, save, refresh, and reopen. Hosted Supabase Auth and Postgres remain required before deployment.

Implemented:

- Document create, list, open, rename through the title field
- Bold, italic, underline, headings 1–3, bulleted list, numbered list, undo, redo
- File, Edit, Format, and View menus for those working actions only
- Autosave with revision checks
- Letter-size page, one-inch padding, visual ruler, zoom that is not stored

### Milestone 1 verification

Checked on 2026-11-04 with the app running at http://localhost:3000.

API:

- Create returned 201 and revision 1.
- Update stored the title and Tiptap JSON and incremented the revision.
- A second read returned the same content.
- A write with the old revision returned 409 `stale_revision`.
- An empty title returned 400 `title_empty` and did not change the saved document.

Browser:

- Dashboard listed the saved document, including an empty-to-list loading state.
- New document opened the editor.
- Title rename, bold, italic, underline, heading, bulleted list, and numbered list were saved.
- Undo and redo worked. Zoom changed the page to 125% and returned to 100% after refresh, so zoom is not stored.
- Refresh reopened the title and formatting. The logo returned to the dashboard, which showed the renamed document.

Tiptap 3's StarterKit already includes underline. A second Underline extension was removed after the console reported a duplicate extension name.

### Import and sharing

Added text and Markdown import, profile and permission tables, and three local demo accounts. Vitest calls the repository and import parser against a temporary PGlite directory.

Verification on 2026-11-04:

- `npx tsc --noEmit` passed.
- `npx eslint src vitest.config.ts --max-warnings 0` passed before the final role-narrowing edit. That edit was type-only and `npx tsc --noEmit` passed again.
- `npx vitest run` passed: 9 tests. The added cases reject an unknown email, a role of owner, and a viewer who tries to share.
- `npm run build` completed. Routes `/`, `/api/documents`, `/api/documents/[id]`, `/api/documents/import`, `/api/documents/[id]/access`, and `/api/session` were included. `/documents/[id]` was partially prerendered.
- `npm start` served the production build. The dashboard returned 200, the session was Tracy with 3 accounts, and the saved documents included lesson, Browser check, and Persisted page. The lesson content still contained the imported heading.
- API: list returned the existing documents after migration 002. Import of `lesson.md` returned 201. Sharing with Nathan as editor and Nora as viewer returned 201. A second share to Nathan returned 409 `duplicate_share`. Nora's cookie could read the document as viewer and a save returned 403 `read_only`.
- Browser at http://localhost:3000: Tracy's dashboard listed lesson, Browser check, and Persisted page. The imported page showed heading "Imported lesson" and the script tag as text. Share listed Tracy as owner, Nathan as editor, and Nora as viewer. Nora's editor had a read-only title and disabled formatting buttons. Nora's dashboard showed lesson under Shared with me as Viewer. The account was switched back to Tracy.

The file picker itself was not driven from the browser. Import was verified through `POST /api/documents/import`. The dev server had to be restarted so the already-open database applied `002_permissions.sql`.

### Hosted Supabase integration (uncommitted)

Commit `854c089` holds the local app. The work below is in the working tree only.

Implemented: runtime modes (local, hosted, misconfigured), `src/proxy.ts`, `getClaims()`-based identity, `/auth/sign-in`, `POST /api/auth/sign-in` and `/api/auth/sign-out`, a Sign out button in hosted mode, `src/lib/documents/hosted-repository.ts`, `003_rls.hosted.sql`, `004_profile_trigger.hosted.sql`, and the runtime-mode and RLS tests. `@supabase/supabase-js` and `@supabase/ssr` were added.

First verification, after the files were written: `npx tsc --noEmit` passed and `npx vitest run` passed 15 tests. ESLint flagged `window.location.assign` in `AccountSwitcher`; it was changed to `useRouter().push`.

Second verification, 2026-11-04 afternoon:

- `npx eslint src vitest.config.ts --max-warnings 0`: exit 0.
- `npm run build`: passed.
- Bug found by reading `src/proxy.ts`: a signed-out `POST /api/auth/sign-in` was answered 401 by the proxy before the route ran, so hosted sign-in could never succeed. `startsWith("/auth")` also treated paths like `/authors` as public. Added `src/proxy.test.ts`, which failed on both (401 instead of pass-through; 200 instead of a redirect). The proxy now exempts `/api/auth/*` from both the 401 and the redirect, and only `/auth/*` pages are public. The test then passed.
- `npx tsc --noEmit`: exit 0. `npx vitest run`: 4 files, 19 tests passed. ESLint: exit 0 again.
- `npm run build` failed twice with `EPERM: operation not permitted, unlink '.next\static\<build id>'`. Cause: OneDrive had turned the previous build's folder into a cloud placeholder (reparse tag `0x9000e01a`). Node's `readdir` reports it as a symlink, so Next.js's cleanup called `unlink` on a directory. Removing that one generated folder fixed it, and the build passed. It will recur while the repository is inside OneDrive.
- `next start -p 3100` with no Supabase variables: `/`, `/auth/sign-in`, `/documents/<id>`, `GET /api/session`, `GET /api/documents`, and `POST /api/session` all returned 503 with `cache-control: private, no-store`. The PGlite folder was not written.
- An orphaned `next dev` started at 1:01 PM by an earlier session was stuck at about 100% CPU and 12.6 GB RAM and did not answer requests. Next.js refused to start a second dev server in the same folder. Before it was stopped, the PGlite folder (992 files, 40,149,171 bytes, unchanged since 1:01 PM) was copied to `%USERPROFILE%\.boogledox\pglite-backup-2026-11-04-before-dev-restart` and verified by file count, byte count, and the `pg_control` hash. Tracy stopped the process.
- Fresh `npm run dev` with no Supabase variables, real PGlite folder: the database reopened after the forced stop. `GET /api/session` returned mode `local`, Tracy, and the three demo accounts. `GET /api/documents` listed lesson, Browser check, Persisted page, and two Untitled documents.
- Browser (in-app Chromium pane, desktop width, http://localhost:3000): the dashboard showed "Collaboration made easier", the account switcher on Tracy, and all five documents. "Persisted page" reopened with its H1 (bold, italic, underline), bullet, and numbered list. Switching to Nora showed only lesson under **Shared with me** as Viewer. Nora's lesson page showed "View only", a read-only title, non-editable content, all eight formatting buttons disabled, and the `<script>` text as text. The account was switched back to Tracy. `/auth/sign-in` rendered the email and password form. No console errors.
- `POST /api/auth/sign-in` and `/api/auth/sign-out` returned 503 `misconfigured` in local mode.
- Finding (pre-existing, not fixed): opening "Persisted page" as its owner sent a `PATCH` without any typing and moved it from revision 2 to 3. The content was unchanged. The editor files have not changed since `854c089`, so this predates the hosted work. It means opening a document can make another open copy's next save return 409. In development the editor showed "Opening document…" for several seconds on first open. That was not measured.

Not tested: a live Supabase project, hosted sign-in, `004_profile_trigger.hosted.sql`, Vercel, Firefox, Safari, Edge, tablet, phone. Performance was not measured.

### Live Supabase project, 2026-11-04 afternoon

- Created project `boogledox` (Free plan, East US) with "Automatically expose new tables" off and automatic RLS on. Ran `001`–`004` in the SQL editor. A check query showed RLS on `documents`, `document_permissions`, `profiles`, and `schema_migrations`, the eight app functions, and the `on_auth_user_created` trigger.
- Tracy created three users in the dashboard. The `004` trigger created a matching, confirmed profile for each.
- `.env.local` (gitignored) holds the project URL and publishable key. The dev server reloaded it and switched to hosted mode.
- Signed out: `/` redirected to `/auth/sign-in`, `GET /api/session` returned 401, a made-up account got the generic 401 from Supabase (this request was blocked by the proxy before the fix), a cross-origin sign-in got 403, and the demo cookie and `POST /api/session` got 401.
- Signed in as Tracy (Tracy signed in herself), in Chrome: Sign out replaced the demo switcher. Created "Hosted check" with an H1 and bold text, reloaded, and it reopened from Supabase with formatting. Imported `hosted-lesson.md` through the file picker: heading, bold, the script text as text, and the bullet list. Shared it with Nathan as Editor and Nora as Viewer; the panel listed Tracy as Owner. Recorded as `docs/boogledox-demo.gif`.
- Found: `anon` and `authenticated` hold `REFERENCES`, `TRIGGER`, and `TRUNCATE` on the app tables, because `REVOKE ... FROM PUBLIC` does not remove grants Supabase gives those roles. The Data API cannot use them. Revoke them in a follow-up migration.
- Found: the dashboard text still describes the local demo switcher in hosted mode.
- Not tested live: editor save as Nathan, viewer read-only as Nora, an unauthorized account, a copied link opened by another account, sign-out, duplicate share, unknown email. These are covered locally and by the RLS tests.

### Vercel deployment, 2026-11-04

- Commit `53dc329` was pushed to `main` (author and committer `enobot`, no trailer; checked on GitHub). Vercel project `boogledox-144u` imports `enobot/boogledox`, Next.js preset, with the two `NEXT_PUBLIC_SUPABASE_*` variables for Production and Preview (entered by Tracy). The first production build finished in 32 seconds.
- `https://boogledox-144u.vercel.app`: `/` returned 307 to `/auth/sign-in`, `/auth/sign-in` returned 200, `/api/session` returned 401, a made-up account got the generic 401 from Supabase, the demo cookie got 401, and `Strict-Transport-Security` was set.
- The Supabase Auth Site URL is still `http://localhost:3000`. Password sign-in does not use it, but email links would. Add the Vercel URL under Authentication → URL Configuration.

### Unresolved
- Signed-in flows on the public URL: see below if run.
- `schema_migrations` has no RLS in hosted Postgres, and Supabase's default grants have not been inspected on a live project.
- Any signed-in hosted user can read `profiles`, so registered emails can be enumerated.
- `src/lib/supabase/client.ts` is unused, and its mode check would not work in a browser bundle.
- Opening a document as owner or editor saves it once with no edits and bumps the revision.
- Deployment to a public host is not started.
- The demo account cookie is an allowlist, not authentication.
- The share dialog focus trap is incomplete.
- `npm audit` reported 8 moderate vulnerabilities. `npm audit fix --force` was not run.
- Insert and Tools menus are omitted until they have working actions.
- Font family, font size, color, highlight, alignment, checklists, indentation, and line spacing are not started.
- Collaborative drafts are not started.
- The local app is published at `https://github.com/enobot/boogledox` as commit `854c089`. The hosted work above is not committed.
- `npm` once failed with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` until `NODE_OPTIONS=--use-system-ca` was set. Later installs succeeded with that option.
