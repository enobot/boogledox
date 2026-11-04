"use client";

import { useEffect, useState } from "react";
import type { DemoAccount } from "@/lib/auth/demo-accounts";

export function AccountSwitcher() {
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [currentId, setCurrentId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/session", {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = (await response.json().catch(() => null)) as {
          error?: string;
          account?: DemoAccount | null;
          accounts?: DemoAccount[];
        } | null;

        if (!response.ok || !body?.accounts || !body.account) {
          throw new Error(body?.error ?? "Could not load the demo accounts.");
        }

        setAccounts(body.accounts);
        setCurrentId(body.account.id);
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load the demo accounts.",
        );
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  async function choose(userId: string) {
    if (userId === currentId) {
      return;
    }

    setError(null);
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(body?.error ?? "Could not switch accounts.");
      return;
    }

    window.location.reload();
  }

  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <span className="sr-only">Local demo account</span>
      <select
        aria-label="Local demo account"
        className="rounded-full border border-line bg-paper px-3 py-2 text-sm text-plum"
        value={currentId}
        disabled={accounts.length === 0}
        onChange={(event) => void choose(event.target.value)}
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.displayName}
          </option>
        ))}
      </select>
      {error ? <span className="text-danger">{error}</span> : null}
    </label>
  );
}
