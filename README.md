# Boogle Dox

Boogle Dox is a browser document editor. This checkout can create, edit, save, and reopen a document, import `.txt` and `.md` files, and share a document with the local demo accounts.

## Local setup

Install [Node.js 22 or newer](https://nodejs.org/) (this project was built with Node.js 26). Then, from this folder:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If `npm` fails with a certificate error, start the shell with `NODE_OPTIONS=--use-system-ca`.

Documents are stored in a local PostgreSQL-compatible database (PGlite) at `%USERPROFILE%\.boogledox\pglite`. Override the folder with `BOOGLEDOX_DATA_DIR`. See `.env.example`.

The account menu is a local demo switcher, not a login. It can select Tracy, Nathan, or Nora. With no cookie, the server uses Tracy so older local documents stay available. Anyone who can open this copy can choose any of those three accounts. Hosted Supabase Auth is still required before deployment.

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

`npm test` runs Vitest against the real document repository and import parser, using a temporary database directory. `npm run build` completed locally. `npm start` serves that build. There is no public deployment yet. See `WALKTHROUGH_NOTES.md` for the review path.

## Database

`supabase/migrations/001_documents.sql` is the document table. `002_permissions.sql` adds profiles and document permissions. Local startup applies any migration that is not already recorded. Hosted Supabase is not connected yet. When it is, apply the same files there. Do not seed the demo profiles from the SQL files; local startup inserts them in application code.
