"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DocumentDetails, RichTextDocument } from "@/lib/documents/types";
import { getTitleError } from "@/lib/documents/validation";

export type SaveStatus =
  | { state: "saved" }
  | { state: "saving" }
  | { state: "unsaved" }
  | { state: "error"; message: string; retry: boolean; reload: boolean };

type Draft = {
  title: string;
  content: RichTextDocument;
};

type SaveResponse = {
  error?: string;
  document?: DocumentDetails;
};

function fingerprint(draft: Draft): string {
  return JSON.stringify({ title: draft.title.trim(), content: draft.content });
}

export function useDocumentSave(
  documentId: string,
  initial: Draft & { revision: number },
) {
  const [status, setStatus] = useState<SaveStatus>({ state: "saved" });
  const draftRef = useRef<Draft>({
    title: initial.title,
    content: initial.content,
  });
  const savedFingerprintRef = useRef(
    fingerprint({ title: initial.title, content: initial.content }),
  );
  const revisionRef = useRef(initial.revision);
  const blockedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tailRef = useRef<Promise<void>>(Promise.resolve());

  const performSave = useCallback(async (): Promise<boolean> => {
    if (blockedRef.current) {
      return false;
    }

    const snapshot = draftRef.current;
    const nextFingerprint = fingerprint(snapshot);

    if (nextFingerprint === savedFingerprintRef.current) {
      setStatus({ state: "saved" });
      return true;
    }

    const titleError = getTitleError(snapshot.title);

    if (titleError) {
      setStatus({
        state: "error",
        message: titleError,
        retry: false,
        reload: false,
      });
      return false;
    }

    setStatus({ state: "saving" });

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: snapshot.title,
          content: snapshot.content,
          revision: revisionRef.current,
        }),
      });
      const body = (await response.json().catch(() => null)) as SaveResponse | null;

      if (response.status === 409) {
        blockedRef.current = true;
        setStatus({
          state: "error",
          message:
            body?.error ??
            "This document was updated somewhere else. Your changes are still in this editor and were not saved.",
          retry: false,
          reload: true,
        });
        return false;
      }

      if (!response.ok || !body?.document) {
        setStatus({
          state: "error",
          message: body?.error ?? "Save failed. Your changes are still in this editor.",
          retry: true,
          reload: false,
        });
        return false;
      }

      revisionRef.current = body.document.revision;
      savedFingerprintRef.current = nextFingerprint;

      if (fingerprint(draftRef.current) !== savedFingerprintRef.current) {
        const latestTitleError = getTitleError(draftRef.current.title);
        setStatus(
          latestTitleError
            ? {
                state: "error",
                message: latestTitleError,
                retry: false,
                reload: false,
              }
            : { state: "unsaved" },
        );
        return false;
      }

      setStatus({ state: "saved" });
      return true;
    } catch {
      setStatus({
        state: "error",
        message: "Save failed. Your changes are still in this editor.",
        retry: true,
        reload: false,
      });
      return false;
    }
  }, [documentId]);

  const saveNow = useCallback(() => {
    const run = tailRef.current.then(performSave, performSave);
    tailRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }, [performSave]);

  const updateDraft = useCallback(
    (partial: Partial<Draft>) => {
      draftRef.current = { ...draftRef.current, ...partial };

      if (blockedRef.current) {
        return;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const titleError = getTitleError(draftRef.current.title);

      if (fingerprint(draftRef.current) === savedFingerprintRef.current) {
        setStatus({ state: "saved" });
        return;
      }

      if (titleError) {
        setStatus({
          state: "error",
          message: titleError,
          retry: false,
          reload: false,
        });
        return;
      }

      setStatus({ state: "unsaved" });
      timerRef.current = setTimeout(() => {
        void saveNow();
      }, 700);
    },
    [saveNow],
  );

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (fingerprint(draftRef.current) !== savedFingerprintRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", warnBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { status, updateDraft, saveNow };
}
