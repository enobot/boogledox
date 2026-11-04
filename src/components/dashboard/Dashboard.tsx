"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AccountSwitcher } from "@/components/account/AccountSwitcher";
import { Logo } from "@/components/brand/Logo";
import type { DocumentSummary } from "@/lib/documents/types";

export function Dashboard() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/documents", {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = (await response.json().catch(() => null)) as {
          error?: string;
          documents?: DocumentSummary[];
        } | null;

        if (!response.ok || !body?.documents) {
          throw new Error(body?.error ?? "Could not load your documents.");
        }

        setDocuments(body.documents);
        setError(null);
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load your documents.",
        );
      }
    }

    void load();

    return () => controller.abort();
  }, []);

  async function createDocument() {
    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        document?: { id: string };
      } | null;

      if (!response.ok || !body?.document) {
        throw new Error(body?.error ?? "Could not create the document.");
      }

      router.push(`/documents/${body.document.id}`);
    } catch (createError) {
      setCreating(false);
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create the document.",
      );
    }
  }

  async function importFile(file: File) {
    setImporting(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);

    try {
      const response = await fetch("/api/documents/import", {
        method: "POST",
        body: form,
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        document?: { id: string };
      } | null;

      if (!response.ok || !body?.document) {
        throw new Error(body?.error ?? "Could not import that file.");
      }

      router.push(`/documents/${body.document.id}`);
    } catch (importError) {
      setImporting(false);
      setError(
        importError instanceof Error ? importError.message : "Could not import that file.",
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-desk text-ink">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo className="h-10 w-10" />
            <div>
              <p className="text-lg font-semibold tracking-tight text-plum">Boogle Dox</p>
              <p className="text-sm text-muted">Collaboration made easier</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <AccountSwitcher />
            <label className="cursor-pointer rounded-full border border-line bg-paper px-4 py-2 text-sm font-medium text-plum">
              {importing ? "Importing…" : "Import .txt or .md"}
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.markdown,text/plain,text/markdown"
                className="sr-only"
                disabled={importing}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void importFile(file);
                  }
                }}
              />
            </label>
            <button
              type="button"
              className="cursor-pointer rounded-full bg-plum px-4 py-2 text-sm font-medium text-paper hover:bg-plum-deep disabled:cursor-wait disabled:opacity-70"
              onClick={() => void createDocument()}
              disabled={creating || importing}
            >
              {creating ? "Creating…" : "New document"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8">
        <h1 className="text-2xl font-semibold text-plum">My documents</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Import a .txt or .md file up to 500 KB. The text is saved as a document. HTML and scripts stay as text.
          Local demo accounts are Tracy, Nathan, and Nora. This switcher is not a login.
        </p>
        {error ? (
          <div className="mt-4 rounded-xl border border-danger/30 bg-paper px-4 py-3 text-sm text-danger">
            <p>{error}</p>
            <button
              type="button"
              className="mt-2 cursor-pointer font-medium text-plum underline"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        ) : null}

        {documents === null && !error ? (
          <p className="mt-8 text-muted">Loading documents…</p>
        ) : null}

        {documents && documents.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-muted/40 bg-paper px-6 py-12 text-center">
            <h2 className="text-xl font-semibold text-plum">No documents yet</h2>
            <p className="mx-auto mt-2 max-w-md text-muted">
              Create a page, add a heading or a list, and it will still be here after a refresh.
            </p>
            <button
              type="button"
              className="mt-5 cursor-pointer rounded-full bg-lavender px-4 py-2 text-sm font-medium text-plum"
              onClick={() => void createDocument()}
              disabled={creating}
            >
              {creating ? "Creating…" : "Create your first document"}
            </button>
          </div>
        ) : null}

        {documents && documents.some((document) => document.access === "owner") ? (
          <DocumentGrid
            documents={documents.filter((document) => document.access === "owner")}
          />
        ) : null}

        {documents && documents.some((document) => document.access !== "owner") ? (
          <section className="mt-10">
            <h2 className="text-xl font-semibold text-plum">Shared with me</h2>
            <DocumentGrid
              documents={documents.filter((document) => document.access !== "owner")}
            />
          </section>
        ) : null}
      </main>
    </div>
  );
}

function DocumentGrid({ documents }: { documents: DocumentSummary[] }) {
  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2">
      {documents.map((document) => (
        <li key={document.id}>
          <a
            href={`/documents/${document.id}`}
            className="block rounded-2xl border border-line bg-paper px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-lavender"
          >
            <h2 className="truncate text-lg font-semibold text-plum">{document.title}</h2>
            <p className="mt-2 text-sm text-muted">
              {document.access === "owner"
                ? "Owner"
                : document.access === "editor"
                  ? "Editor"
                  : "Viewer"}
              {" · "}
              Edited {formatUpdated(document.updatedAt)}
            </p>
          </a>
        </li>
      ))}
    </ul>
  );
}

function formatUpdated(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
