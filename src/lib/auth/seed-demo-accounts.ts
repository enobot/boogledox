import type { PGlite } from "@electric-sql/pglite";
import { DEMO_ACCOUNTS } from "@/lib/auth/demo-accounts";

export async function seedDemoAccounts(database: PGlite): Promise<void> {
  for (const account of DEMO_ACCOUNTS) {
    await database.query(
      `INSERT INTO profiles (id, email, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [account.id, account.email, account.displayName],
    );
  }
}
