"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AccountSwitcher } from "@/components/account/AccountSwitcher";
import { Logo } from "@/components/brand/Logo";
import { MenuBar } from "@/components/editor/MenuBar";
import { Ruler } from "@/components/editor/Ruler";
import { SharePanel } from "@/components/editor/SharePanel";
import { useDocumentSave } from "@/components/editor/useDocumentSave";
import type { DocumentDetails, RichTextDocument } from "@/lib/documents/types";

type DocumentEditorProps = {
  params: Promise<{ id: string }>;
};

export function DocumentEditor({ params }: DocumentEditorProps) {
  const { id } = use(params);
  return <DocumentLoader key={id} documentId={id} />;
}

function DocumentLoader({ documentId }: { documentId: string }) {
  const [document, setDocument] = useState<DocumentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(`/api/documents/${documentId}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = (await response.json().catch(() => null)) as {
          error?: string;
          document?: DocumentDetails;
        } | null;

        if (!response.ok || !body?.document) {
          throw new Error(body?.error ?? "This document could not be opened.");
        }

        setDocument(body.document);
        setError(null);
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "This document could not be opened.",
        );
      }
    }

    void load();

    return () => controller.abort();
  }, [documentId]);

  if (error) {
    return (
      <StatusScreen
        title="Document unavailable"
        message={error}
        actionHref="/"
        actionLabel="Back to documents"
      />
    );
  }

  if (!document) {
    return <StatusScreen title="Opening document…" message="Fetching the saved page." />;
  }

  return <EditorSession document={document} />;
}

function EditorSession({ document }: { document: DocumentDetails }) {
  const router = useRouter();
  const [title, setTitle] = useState(document.title);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const canEdit = document.access === "owner" || document.access === "editor";
  const { status, updateDraft, saveNow } = useDocumentSave(document.id, document);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
    ],
    content: document.content,
    editable: canEdit,
    autofocus: canEdit ? "end" : false,
    editorProps: {
      attributes: {
        class: "boogle-editor",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor: current }) => {
      if (!canEdit) {
        return;
      }

      updateDraft({ content: current.getJSON() as RichTextDocument });
    },
  });

  useEffect(() => {
    window.document.title = `${title.trim() || "Untitled document"} · Boogle Dox`;
  }, [title]);

  async function openDashboard() {
    setBusy(true);
    const saved = await saveNow();
    setBusy(false);

    if (saved) {
      router.push("/");
      return;
    }

    setActionError("Stay on this page until the document saves.");
  }

  async function createDocument() {
    setBusy(true);
    setActionError(null);
    const saved = await saveNow();

    if (!saved) {
      setBusy(false);
      setActionError("Save this document before opening a new one.");
      return;
    }

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        document?: DocumentDetails;
      } | null;

      if (!response.ok || !body?.document) {
        throw new Error(body?.error ?? "Could not create the document.");
      }

      router.push(`/documents/${body.document.id}`);
    } catch (createError) {
      setBusy(false);
      setActionError(
        createError instanceof Error
          ? createError.message
          : "Could not create the document.",
      );
    }
  }

  const statusText =
    status.state === "saved"
      ? "Saved"
      : status.state === "saving"
        ? "Saving…"
        : status.state === "unsaved"
          ? "Unsaved changes"
          : status.message;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-desk text-ink">
      <div className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-2">
          <button
            type="button"
            className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-plum hover:bg-lavender/60"
            onClick={() => void openDashboard()}
          >
            <Logo />
            <span className="hidden text-sm font-semibold tracking-tight sm:inline">
              Boogle Dox
            </span>
          </button>
          <input
            aria-label="Document title"
            value={title}
            readOnly={!canEdit}
            onChange={(event) => {
              if (!canEdit) {
                return;
              }

              const nextTitle = event.target.value;
              setTitle(nextTitle);
              updateDraft({ title: nextTitle });
              setActionError(null);
            }}
            className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-plum outline-none"
          />
          {document.access === "owner" ? (
            <button
              type="button"
              className="cursor-pointer rounded-full bg-plum px-3 py-1 text-sm text-paper"
              onClick={() => setSharing(true)}
            >
              Share
            </button>
          ) : (
            <p className="text-sm text-muted">
              {document.access === "editor" ? "You can edit" : "View only"}
            </p>
          )}
          <AccountSwitcher />
          <div className="flex max-w-sm items-center justify-end gap-2 text-right text-sm">
            <p
              role="status"
              aria-live="polite"
              className={
                status.state === "error"
                  ? "text-danger"
                  : status.state === "saving"
                    ? "text-plum"
                    : "text-muted"
              }
            >
              {statusText}
            </p>
            {status.state === "error" && status.retry ? (
              <button
                type="button"
                className="cursor-pointer rounded-full bg-plum px-3 py-1 text-xs text-paper"
                onClick={() => void saveNow()}
              >
                Retry save
              </button>
            ) : null}
            {status.state === "error" && status.reload ? (
              <button
                type="button"
                className="cursor-pointer rounded-full border border-line px-3 py-1 text-xs text-plum"
                onClick={() => {
                  const leave = window.confirm(
                    "Reload the saved document? Unsaved typing in this tab will be replaced.",
                  );

                  if (leave) {
                    window.location.reload();
                  }
                }}
              >
                Reload saved version
              </button>
            ) : null}
          </div>
        </div>
        <MenuBar
          editor={canEdit ? editor : null}
          zoom={zoom}
          onZoom={setZoom}
          busy={busy}
          onNewDocument={() => void createDocument()}
          onOpenDashboard={() => void openDashboard()}
        />
        {actionError ? (
          <p className="px-4 pb-2 text-sm text-danger">{actionError}</p>
        ) : null}
      </div>

      <div className="overflow-auto px-4 py-8">
        <div className="mx-auto w-fit" style={{ zoom }}>
          <div className="sheet">
            <Ruler />
            <article className="page">
              {editor ? (
                <EditorContent editor={editor} />
              ) : (
                <p className="text-muted">Preparing the editor…</p>
              )}
            </article>
          </div>
        </div>
      </div>
      <SharePanel
        documentId={document.id}
        open={sharing}
        onClose={() => setSharing(false)}
      />
    </div>
  );
}

function StatusScreen({
  title,
  message,
  actionHref,
  actionLabel,
}: {
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 bg-desk px-6 text-center text-ink">
      <Logo className="h-12 w-12" />
      <h1 className="text-2xl font-semibold text-plum">{title}</h1>
      <p className="max-w-md text-muted">{message}</p>
      {actionHref && actionLabel ? (
        <a
          href={actionHref}
          className="mt-2 rounded-full bg-plum px-4 py-2 text-sm text-paper"
        >
          {actionLabel}
        </a>
      ) : null}
    </div>
  );
}
