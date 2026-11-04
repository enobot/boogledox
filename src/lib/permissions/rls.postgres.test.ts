import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const owner = "00000000-0000-4000-8000-0000000000a1";
const editor = "00000000-0000-4000-8000-0000000000a2";
const viewer = "00000000-0000-4000-8000-0000000000a3";
const stranger = "00000000-0000-4000-8000-0000000000a4";

type Database = {
  exec: (sql: string) => Promise<unknown>;
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
  close: () => Promise<void>;
};

let database: Database;
let directory = "";
let documentId = "";

beforeEach(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "boogledox-rls-"));
  const { PGlite } = await import("@electric-sql/pglite");
  database = new PGlite(directory);
  await database.exec(await readMigration("001_documents.sql"));
  await database.exec(await readMigration("002_permissions.sql"));
  await database.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
  `);
  await database.exec(await readMigration("003_rls.hosted.sql"));

  documentId = crypto.randomUUID();
  await database.query(
    `INSERT INTO profiles (id, email, display_name) VALUES
      ($1, 'owner@boogledox.test', 'Owner'),
      ($2, 'editor@boogledox.test', 'Editor'),
      ($3, 'viewer@boogledox.test', 'Viewer'),
      ($4, 'stranger@boogledox.test', 'Stranger')`,
    [owner, editor, viewer, stranger],
  );
  await database.query(
    `INSERT INTO documents (id, owner_id, title, content)
     VALUES ($1, $2, 'Shared', '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb)`,
    [documentId, owner],
  );
  await database.query(
    `INSERT INTO document_permissions (document_id, user_id, role) VALUES
      ($1, $2, 'editor'),
      ($1, $3, 'viewer')`,
    [documentId, editor, viewer],
  );
});

afterEach(async () => {
  await database?.close();
  await fs.rm(directory, { recursive: true, force: true });
});

describe("hosted row level security", () => {
  it("lets the owner and editor save, and keeps a stale revision from replacing the page", async () => {
    const saved = await asUser(owner, () =>
      database.query(`SELECT public.save_document($1, $2, $3::jsonb, $4) AS saved`, [
        documentId,
        "Owner edit",
        '{"type":"doc"}',
        1,
      ]),
    );
    expect(JSON.stringify(saved.rows[0]?.saved)).toContain("Owner edit");

    await expect(
      asUser(owner, () =>
        database.query(`SELECT public.save_document($1, $2, $3::jsonb, $4)`, [
          documentId,
          "Stale",
          '{"type":"doc"}',
          1,
        ]),
      ),
    ).rejects.toThrow(/stale revision/i);

    const edited = await asUser(editor, () =>
      database.query(`SELECT public.save_document($1, $2, $3::jsonb, $4) AS saved`, [
        documentId,
        "Editor edit",
        '{"type":"doc"}',
        2,
      ]),
    );
    expect(JSON.stringify(edited.rows[0]?.saved)).toContain("Editor edit");
  });

  it("keeps viewers read-only and hides the document from an unauthorized account", async () => {
    await expect(
      asUser(viewer, () =>
        database.query(`SELECT public.save_document($1, 'Nope', '{"type":"doc"}'::jsonb, 1)`, [
          documentId,
        ]),
      ),
    ).rejects.toThrow(/read only/i);

    const hidden = await asUser(stranger, () =>
      database.query(`SELECT id FROM documents WHERE id = $1`, [documentId]),
    );
    expect(hidden.rows).toHaveLength(0);

    await expect(
      asUser(stranger, () =>
        database.query(`SELECT public.save_document($1, 'Nope', '{"type":"doc"}'::jsonb, 1)`, [
          documentId,
        ]),
      ),
    ).rejects.toThrow(/not found/i);
  });

  it("lets only the owner change sharing, and blocks ownership or direct permission writes", async () => {
    await expect(
      asUser(editor, () =>
        database.query(
          `SELECT public.grant_document_access($1, 'stranger@boogledox.test', 'editor')`,
          [documentId],
        ),
      ),
    ).rejects.toThrow(/only the owner/i);

    await asUser(owner, () =>
      database.query(
        `SELECT public.grant_document_access($1, 'stranger@boogledox.test', 'viewer')`,
        [documentId],
      ),
    );

    await expect(
      asUser(editor, () =>
        database.query(
          `INSERT INTO document_permissions (document_id, user_id, role) VALUES ($1, $2, 'editor')`,
          [documentId, stranger],
        ),
      ),
    ).rejects.toThrow(/permission denied/i);

    await expect(
      asUser(editor, () =>
        database.query(`UPDATE documents SET title = 'Taken' WHERE id = $1`, [documentId]),
      ),
    ).rejects.toThrow(/permission denied/i);

    await expect(
      asUser(editor, () =>
        database.query(`INSERT INTO documents (id, owner_id, title, content) VALUES ($1, $2, 'Mine', '{"type":"doc"}'::jsonb)`, [
          crypto.randomUUID(),
          owner,
        ]),
      ),
    ).rejects.toThrow(/row-level security|permission denied/i);

    await database.exec("RESET ROLE");
    await expect(
      database.query(`UPDATE documents SET owner_id = $1 WHERE id = $2`, [editor, documentId]),
    ).rejects.toThrow(/ownership cannot be changed/i);
  });
});

async function asUser<T>(userId: string, action: () => Promise<T>): Promise<T> {
  await database.exec("RESET ROLE");
  await database.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [userId]);
  await database.exec("SET ROLE authenticated");

  try {
    return await action();
  } finally {
    await database.exec("RESET ROLE");
  }
}

function readMigration(fileName: string): Promise<string> {
  return fs.readFile(path.join(process.cwd(), "supabase", "migrations", fileName), "utf8");
}
