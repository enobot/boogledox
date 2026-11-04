"use client";

import { useEffect, useState } from "react";
import type { DocumentPerson } from "@/lib/documents/types";

type SharePanelProps = {
  documentId: string;
  open: boolean;
  onClose: () => void;
};

export function SharePanel({ documentId, open, onClose }: SharePanelProps) {
  const [people, setPeople] = useState<DocumentPerson[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const controller = new AbortController();

    async function load() {
      const response = await fetch(`/api/documents/${documentId}/access`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        people?: DocumentPerson[];
      } | null;

      if (!response.ok || !body?.people) {
        setError(body?.error ?? "Could not load sharing.");
        return;
      }

      setPeople(body.people);
      setError(null);
    }

    void load().catch((loadError: unknown) => {
      if (!controller.signal.aborted) {
        setError(loadError instanceof Error ? loadError.message : "Could not load sharing.");
      }
    });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      controller.abort();
      window.removeEventListener("keydown", onKey);
    };
  }, [documentId, onClose, open]);

  if (!open) {
    return null;
  }

  async function grant() {
    setBusy(true);
    setNotice(null);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        person?: DocumentPerson;
      } | null;

      if (!response.ok || !body?.person) {
        throw new Error(body?.error ?? "Could not share this document.");
      }

      setPeople((current) => [...current.filter((person) => person.userId !== body.person?.userId), body.person!]);
      setEmail("");
      setNotice(`Shared with ${body.person.displayName}.`);
    } catch (grantError) {
      setError(grantError instanceof Error ? grantError.message : "Could not share this document.");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(person: DocumentPerson, nextRole: "editor" | "viewer") {
    setError(null);
    const response = await fetch(`/api/documents/${documentId}/access`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: person.userId, role: nextRole }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(body?.error ?? "Could not change that permission.");
      return;
    }

    setPeople((current) =>
      current.map((entry) =>
        entry.userId === person.userId ? { ...entry, role: nextRole } : entry,
      ),
    );
  }

  async function revoke(person: DocumentPerson) {
    setError(null);
    const response = await fetch(`/api/documents/${documentId}/access`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: person.userId }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(body?.error ?? "Could not remove that person.");
      return;
    }

    setPeople((current) => current.filter((entry) => entry.userId !== person.userId));
  }

  async function copyLink() {
    const link = `${window.location.origin}/documents/${documentId}`;
    await navigator.clipboard.writeText(link);
    setNotice("Link copied. Opening it does not grant access.");
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-plum-deep/30 px-4 py-16">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        className="w-full max-w-lg rounded-2xl border border-line bg-paper p-5 text-ink shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="share-title" className="text-lg font-semibold text-plum">
              Share
            </h2>
            <p className="mt-1 text-sm text-muted">
              Editors can change the page. Viewers can read it. A copied link does not grant access.
            </p>
          </div>
          <button type="button" className="cursor-pointer text-sm text-plum" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            aria-label="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nathan@boogledox.test"
            className="min-w-0 flex-1 rounded-full border border-line px-3 py-2 text-sm"
          />
          <select
            aria-label="Permission"
            value={role}
            onChange={(event) => setRole(event.target.value === "viewer" ? "viewer" : "editor")}
            className="rounded-full border border-line px-3 py-2 text-sm"
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            type="button"
            className="cursor-pointer rounded-full bg-plum px-4 py-2 text-sm text-paper disabled:opacity-60"
            disabled={busy}
            onClick={() => void grant()}
          >
            Share
          </button>
        </div>

        <ul className="mt-4 space-y-2">
          {people.map((person) => (
            <li key={person.userId} className="flex items-center justify-between gap-3 text-sm">
              <span>
                <span className="font-medium text-plum">{person.displayName}</span>
                <span className="ml-2 text-muted">{person.email}</span>
              </span>
              {person.role === "owner" ? (
                <span className="text-muted">Owner</span>
              ) : (
                <span className="flex items-center gap-2">
                  <select
                    aria-label={`Permission for ${person.displayName}`}
                    value={person.role}
                    onChange={(event) =>
                      void changeRole(
                        person,
                        event.target.value === "viewer" ? "viewer" : "editor",
                      )
                    }
                    className="rounded-full border border-line px-2 py-1"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    type="button"
                    className="cursor-pointer text-danger"
                    onClick={() => void revoke(person)}
                  >
                    Remove
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>

        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        {notice ? <p className="mt-3 text-sm text-plum">{notice}</p> : null}

        <button
          type="button"
          className="mt-4 cursor-pointer rounded-full border border-line px-4 py-2 text-sm text-plum"
          onClick={() => void copyLink()}
        >
          Copy link
        </button>
      </div>
    </div>
  );
}
