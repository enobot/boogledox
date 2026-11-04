# Boogle Dox

Boogle Dox is a browser document editor. This checkout can create, edit, save, and reopen a document, import `.txt` and `.md` files, and share a document with the local demo accounts.

It runs in one of three modes, chosen on the server from the environment (`src/lib/auth/runtime-mode.ts`):

| Environment | Supabase variables | Mode | What happens |
| --- | --- | --- | --- |
| `npm run dev`, tests | absent or invalid | **local** | Local PGlite database and the demo account switcher |
| `npm run dev` | valid | **hosted** | Supabase Auth sign-in and Supabase Postgres |
| production (`npm start`, Vercel) | `https://` URL and `sb_publishable_...` key | **hosted** | Supabase Auth sign-in and Supabase Postgres |
| production | missing, `http://`, or a legacy `eyJ...` key | **misconfigured** | Every page and API returns 503. The local database and demo cookie are never used. |

Local mode is verified. Hosted mode was verified on 2026-11-04 against a live Supabase project from `npm run dev` as the owner account (sign-in, create, format, refresh, import, share). Editor and viewer accounts have not been exercised against the live project yet, and there is no public deployment yet. Submission details are in `SUBMISSION.md`, and a demo is in `docs/boogledox-demo.gif`.

## Local setup

Install [Node.js 22 or newer](https://nodejs.org/) (this project was built with Node.js 26). Then, from this folder:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If `npm` fails with a certificate error, start the shell with `NODE_OPTIONS=--use-system-ca`.

Documents are stored in a local PostgreSQL-compatible database (PGlite) at `%USERPROFILE%\.boogledox\pglite`. Override the folder with `BOOGLEDOX_DATA_DIR`. See `.env.example`.

In local mode the account menu is a demo switcher, not a login. It can select Tracy, Nathan, or Nora. With no cookie, the server uses Tracy so older local documents stay available. Anyone who can open this copy can choose any of those three accounts. In hosted mode the switcher is replaced by **Sign out**, and the demo cookie is ignored.

Keep only one `npm run dev` running. PGlite is a single-process database, and Next.js refuses to start a second dev server in the same folder.

## Verify the first milestone

1. Run `npm run dev` and open http://localhost:3000.
2. Choose **New document**.
3. Change the title.
4. Type a sentence. Use Bold, Italic, Underline, a heading, a bulleted list, and a numbered list.
5. Wait until the status says **Saved**.
6. Refresh the browser.
7. Confirm the title and formatting are still there.
8. Return to the dashboard with the Boogle Dox logo. The renamed document should be listed.

Zoom changes the page view only. It is not stored in the document.

## Import and sharing

On the dashboard, **Import .txt or .md** accepts a plain-text or Markdown file up to 500 KB. Other extensions, empty files, and files with null bytes are rejected. HTML and script text are stored as text.

Open a document you own and choose **Share**. Demo addresses:

- tracy@boogledox.test
- nathan@boogledox.test
- nora@boogledox.test

Editors can change the document. Viewers can read it. Copying the link does not grant access. Switch accounts from the menu, then reload shows that account's documents.

## Scripts

```bash
npm run dev
npm run lint
npm test
npm run build
```

`npm test` runs 19 Vitest tests: the real document repository and import parser on a temporary PGlite folder, the runtime-mode rules, the hosted row-level-security SQL on a separate temporary PGlite, and the proxy's signed-out behavior. `npm run build` completed on 2026-11-04 for the current tree. `npm start` without Supabase variables returns 503, by design. There is no public deployment yet. See `WALKTHROUGH_NOTES.md` for the review path.

If `npm run build` fails with `EPERM ... unlink '.next\static\...'`, OneDrive has turned the previous build output into a cloud placeholder. Delete that `.next\static\<id>` folder and build again, or move the repository out of OneDrive.

## Database

`supabase/migrations/001_documents.sql` is the document table. `002_permissions.sql` adds profiles and document permissions. Local startup applies any migration that is not already recorded and skips files ending in `.hosted.sql`. Do not seed the demo profiles from the SQL files; local startup inserts them in application code.

`003_rls.hosted.sql` adds row-level security and the save and sharing functions for Supabase. `004_profile_trigger.hosted.sql` creates a profile row when a Supabase user is created. Run these only in the Supabase SQL editor, never against the local PGlite folder.

## Hosted mode setup (Supabase)

Steps 1–6 were done on 2026-11-04 for the project `boogledox`. Step 7 is not done. No secret values belong in chat, git, or logs. When creating the project, turn off "Automatically expose new tables" and turn on "Enable automatic RLS".

1. Create a Supabase project.
2. In the SQL editor, run `001_documents.sql`, `002_permissions.sql`, `003_rls.hosted.sql`, then `004_profile_trigger.hosted.sql`, in that order.
3. Authentication → URL Configuration: set the Site URL to `http://localhost:3000` for now. After the first Vercel deploy, add the Vercel `https://` URL.
4. Authentication → Users: create the reviewer accounts (email and password) **after** step 2, so the `004` trigger creates their profile rows. The app has no sign-up page.
5. Create `.env.local` in this folder (it is gitignored) with only these two names, copied from the project's Connect dialog:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

   Do not use the secret key, the legacy `anon` JWT, the database password, or `DATABASE_URL`. The app does not read them.
6. Restart `npm run dev`. The app now redirects to `/auth/sign-in`. Local documents do not appear in hosted mode.
7. Vercel: import `enobot/boogledox`. No `vercel.json` is needed. Set the same two variables for Production, deploy, then redeploy after any variable change.
8. After step 2, open Supabase's Security Advisor. `schema_migrations` (created by `001`) has no row-level security, and Supabase's default table grants may give `anon` and `authenticated` more privileges than `003` grants. Document rows are still guarded by RLS, which has no UPDATE or DELETE policy, but review the advisor's findings before calling the hosted setup secure.
