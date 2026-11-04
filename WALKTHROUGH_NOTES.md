# Walkthrough notes

These steps match the local app as of 2026-11-04. Hosted sign-in and a public deployment are not set up.

## Start

```bash
npm install
npm run dev
```

Open http://localhost:3000.

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

## Checks already run

- `npm test` — 9 Vitest tests against the real document store and import parser.
- `npm run build` — production build completed.
- `npm start` — the built app served the dashboard, the demo accounts, and the saved documents at http://localhost:3000.

## Not in this checkout

Supabase Auth, hosted Postgres, a public HTTPS deployment, Insert and Tools menus, extra formatting, and collaborative drafts.
