# Architecture

This describes the code that exists now. Collaborative drafts are not built.

## Application

Next.js App Router with React and TypeScript.

- `/` lists documents the current demo account owns or can access, creates a document, and imports `.txt` or `.md`.
- `/documents/[id]` opens the Tiptap editor. Viewers get a read-only page. Owners can open the share panel.
- `/api/documents` creates and lists documents.
- `/api/documents/[id]` reads and updates one document.
- `/api/documents/import` creates a document from an uploaded text or Markdown file.
- `/api/documents/[id]/access` lists, grants, changes, and removes editor or viewer access.
- `/api/session` reads and sets the local demo account cookie.

The editor stores Tiptap JSON, not HTML. Reloading renders that JSON through the editor schema, so formatting is data rather than injected markup.

## Persistence

Local development uses [PGlite](https://pglite.dev), a PostgreSQL build that runs inside the Node process and writes to disk. Startup reads every SQL file in `supabase/migrations` and applies the ones not already recorded.

`002_permissions.sql` adds `profiles` and `document_permissions`. Startup applies each migration file only when its id is missing from `schema_migrations`.

The same statements are intended for hosted Supabase PostgreSQL. There is no hosted project connected yet, and `DATABASE_URL` is not read. Switching hosts should keep the repository queries and change the database client. Demo profile rows are inserted by `seedDemoAccounts` after migration, not by the SQL file.

The database file lives outside the project directory by default (`~/.boogledox/pglite`) because this folder is inside OneDrive.

## Ownership

`LOCAL_DEV_USER_ID` in `src/lib/auth/local-user.ts` is Tracy's demo id and the default when the `boogledox_user` cookie is missing or not one of the three allowlisted accounts. The cookie is HttpOnly and SameSite=Lax. Route handlers read it on the server. Request bodies cannot choose an arbitrary owner. Mutating requests that send an `Origin` header must match the `Host` header.

`src/lib/permissions/access.ts` decides view, edit, and share rights. The repository loads `document_permissions` and calls those functions before it reads or writes. A missing or unauthorized document returns the same 404. A viewer who can see the document gets 403 `read_only` on save. Only the owner can grant, change, or revoke access. The owner is not stored as a permission row.

Updates require the revision the editor last saved. The SQL update matches that revision and increments it. A mismatch returns HTTP 409 and the editor keeps the unsaved text on screen.

## Save path

The editor debounces changes and sends `PATCH /api/documents/:id` with the title, Tiptap JSON, and revision. The status line shows Saving, Saved, Unsaved changes, or the save error. A failed save does not replace the editor contents.

## Not built yet

Supabase Auth, hosted Postgres, deployment, Insert and Tools menus, extra formatting beyond the first milestone, and collaborative drafts. The demo switcher is not authentication.
