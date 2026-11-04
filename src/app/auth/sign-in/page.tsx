"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Those credentials were not accepted.");
      }

      router.push("/");
      router.refresh();
    } catch (signInError) {
      setBusy(false);
      setError(
        signInError instanceof Error
          ? signInError.message
          : "Those credentials were not accepted.",
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-6 py-16 text-ink">
      <h1 className="text-3xl font-semibold text-plum">Sign in</h1>
      <p className="mt-2 text-sm text-muted">
        Reviewer accounts are created in the Supabase dashboard. This page does not accept the local demo switcher.
      </p>
      <form className="mt-6 flex flex-col gap-3" onSubmit={(event) => void submit(event)}>
        <label className="text-sm text-plum">
          Email
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2"
          />
        </label>
        <label className="text-sm text-plum">
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2"
          />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="cursor-pointer rounded-full bg-plum px-4 py-2 text-sm text-paper disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
