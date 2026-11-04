import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { seedDemoAccounts } from "@/lib/auth/seed-demo-accounts";

const globalForDb = globalThis as unknown as {
  boogledoxDb?: Promise<PGlite>;
};

export function getDatabase(): Promise<PGlite> {
  if (!globalForDb.boogledoxDb) {
    globalForDb.boogledoxDb = openDatabase().catch((error: unknown) => {
      globalForDb.boogledoxDb = undefined;
      throw error;
    });
  }

  return globalForDb.boogledoxDb;
}

async function openDatabase(): Promise<PGlite> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir =
    process.env.BOOGLEDOX_DATA_DIR ??
    path.join(os.homedir(), ".boogledox", "pglite");

  await fs.mkdir(dataDir, { recursive: true });

  const database = new PGlite(dataDir);
  await database.waitReady;
  await applyMigrations(database);
  await seedDemoAccounts(database);

  return database;
}

export async function closeDatabaseForTests(): Promise<void> {
  const pending = globalForDb.boogledoxDb;
  globalForDb.boogledoxDb = undefined;

  if (!pending) {
    return;
  }

  const database = await pending;
  await database.close();
}

async function applyMigrations(database: PGlite): Promise<void> {
  const directory = path.join(process.cwd(), "supabase", "migrations");
  const files = (await fs.readdir(directory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  let migrationsReady = await migrationTableExists(database);

  for (const file of files) {
    const id = file.replace(/\.sql$/, "");

    if (migrationsReady) {
      const existing = await database.query<{ id: string }>(
        "SELECT id FROM schema_migrations WHERE id = $1",
        [id],
      );

      if (existing.rows.length > 0) {
        continue;
      }
    }

    const sql = await fs.readFile(path.join(directory, file), "utf8");
    await database.exec(sql);
    migrationsReady = true;
  }
}

async function migrationTableExists(database: PGlite): Promise<boolean> {
  const result = await database.query<{ name: string | null }>(
    "SELECT to_regclass('public.schema_migrations') AS name",
  );

  return Boolean(result.rows[0]?.name);
}
