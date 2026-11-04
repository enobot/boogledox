import { LOCAL_DEV_USER_ID } from "@/lib/auth/local-user";

export type DemoAccount = {
  id: string;
  email: string;
  displayName: string;
};

/**
 * Local review accounts. These are not a login system.
 * The server only accepts one of these ids from the demo switcher.
 */
export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    id: LOCAL_DEV_USER_ID,
    email: "tracy@boogledox.test",
    displayName: "Tracy",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    email: "nathan@boogledox.test",
    displayName: "Nathan",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    email: "nora@boogledox.test",
    displayName: "Nora",
  },
];

export function findDemoAccount(userId: string): DemoAccount | null {
  return DEMO_ACCOUNTS.find((account) => account.id === userId) ?? null;
}
