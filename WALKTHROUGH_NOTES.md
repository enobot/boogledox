# Walkthrough notes

These steps match the code as of 2026-11-04. Local mode is verified. Hosted sign-in is implemented but has not been tested against a live Supabase project, and there is no public deployment.

## Start (local mode)

Leave the Supabase variables unset, then:

```bash
npm install
npm run dev
```

Open http://localhost:3000. Run only one dev server at a time.

The account menu starts on Tracy. Tracy, Nathan, and Nora are local demo accounts. Choosing one stores an HttpOnly cookie. It is not a password login. With no cookie, the server uses Tracy.

## Create, edit, and reopen

1. Choose **New document**.
2. Rename the title.
3. Type a sentence. Use Bold, Italic, Underline, a heading, a bulleted list, and a numbered list.
4. Wait until the status says **Saved**.
5. Refresh. The title and formatting should still be there.
6. Use the Boogle Dox logo to return to the dashboard.

Zoom changes the on-screen page only. Refresh returns it to 100%.

## Import

On the dashboard, choose **Import .txt or .md**. The limit is 500 KB. A heading such as `# Lesson` becomes a heading. `**bold**` becomes bold. A `<script>` tag is stored as text and is not run.

Other file types, empty files, and files that contain null bytes are rejected.

## Share

1. Stay on Tracy and open a document you own.
2. Choose **Share**.
3. Share with `nathan@boogledox.test` as Editor, or `nora@boogledox.test` as Viewer.
4. **Copy link** copies the page address. Opening that address does not grant access.
5. Switch the account menu to Nora and open the same document. The title is read-only and the formatting buttons are disabled.
6. Nora's dashboard lists that document under **Shared with me**.
7. Switch to Nathan to edit a document shared as Editor.
8. Switch back to Tracy when finished.

Sharing the same person twice is rejected. An unknown email is rejected. A viewer cannot change who has access.

## Hosted mode (not yet verified)

After the setup in `README.md` → "Hosted mode setup", the app sends signed-out visitors to `/auth/sign-in`. Reviewers sign in with an account created in the Supabase dashboard. The account menu shows **Sign out** instead of the demo switcher. Local documents do not appear in hosted mode. Sharing uses the reviewers' Supabase emails.

Verified on 2026-11-04 against the live project as Tracy: sign-in, create, format, refresh, import, and sharing with Nathan as Editor and Nora as Viewer. Signing in as Nathan or Nora against the live project has not been done yet.

## Checks already run

- `npm test`: 19 Vitest tests in 4 files (local repository and import, runtime mode, hosted RLS SQL on a temporary PGlite, proxy).
- `npx tsc --noEmit` and `npx eslint src vitest.config.ts --max-warnings 0`: passed.
- `npm run build`: passed for the current tree.
- `npm start` without Supabase variables: every page and API returned 503, by design.
- Browser, local mode, after the hosted changes: dashboard and tagline, account switcher (Tracy → Nora → Tracy), reopening an existing document, Nora's read-only view of a shared document, and `/auth/sign-in` rendering. Creating, formatting, and importing through the browser were not repeated in this pass.
- Opening a document you own saves it once even with no edits, so its revision goes up. This is known and not yet fixed.

## Not in this checkout

A live Supabase project, a public HTTPS deployment, Insert and Tools menus, extra formatting, and collaborative drafts.
