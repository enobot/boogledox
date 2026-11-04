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

### Unresolved
- Supabase project, auth, and hosted database are not connected.
- Deployment to a public host is not started. A local production build and `npm start` check did succeed.
- The demo account cookie is an allowlist, not authentication.
- Insert and Tools menus are omitted until they have working actions.
- Font family, font size, color, highlight, alignment, checklists, indentation, and line spacing are not started.
- Collaborative drafts are not started.
- The git remote `https://github.com/enobot/boogledox.git` has not been initialized or pushed.
- `npm` once failed with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` until `NODE_OPTIONS=--use-system-ca` was set. Later installs succeeded with that option.
