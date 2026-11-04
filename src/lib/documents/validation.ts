import { AppError } from "@/lib/documents/errors";
import {
  MAX_CONTENT_BYTES,
  MAX_TITLE_LENGTH,
  type RichTextDocument,
} from "@/lib/documents/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getTitleError(title: string): string | null {
  const trimmed = title.trim();

  if (!trimmed) {
    return "Document title cannot be empty.";
  }

  if (trimmed.length > MAX_TITLE_LENGTH) {
    return `Document titles must be ${MAX_TITLE_LENGTH} characters or fewer.`;
  }

  return null;
}

export function assertTitle(value: unknown): string {
  if (typeof value !== "string") {
    throw new AppError("Enter a document title.", 400, "invalid_title");
  }

  const error = getTitleError(value);

  if (!error) {
    return value.trim();
  }

  throw new AppError(
    error,
    400,
    value.trim() ? "title_too_long" : "title_empty",
  );
}

export function assertDocumentId(value: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw new AppError(
      "This document does not exist or you do not have access.",
      404,
      "not_found",
    );
  }

  return value;
}

export function assertRevision(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new AppError(
      "The save is missing a valid document revision.",
      400,
      "invalid_revision",
    );
  }

  return value;
}

export function assertRichText(value: unknown): RichTextDocument {
  let serialized: string;

  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new AppError(
      "Document content must be structured editor data.",
      400,
      "invalid_content",
    );
  }

  if (!serialized) {
    throw new AppError(
      "Document content must be structured editor data.",
      400,
      "invalid_content",
    );
  }

  if (serialized.length > MAX_CONTENT_BYTES) {
    throw new AppError("This document is too large to save.", 413, "content_too_large");
  }

  const parsed: unknown = JSON.parse(serialized);
  assertJsonTree(parsed, 0);

  if (!isRecord(parsed) || parsed.type !== "doc") {
    throw new AppError(
      "Document content must be a rich-text document.",
      400,
      "invalid_content",
    );
  }

  return parsed as RichTextDocument;
}

export function titleForCreate(body: unknown): string {
  if (body === undefined) {
    return "Untitled document";
  }

  if (!isRecord(body)) {
    throw new AppError("The request body must be a JSON object.", 400, "invalid_body");
  }

  if (body.title === undefined) {
    return "Untitled document";
  }

  return assertTitle(body.title);
}

export function parseDocumentUpdate(body: unknown): {
  title: string;
  content: RichTextDocument;
  revision: number;
} {
  if (!isRecord(body)) {
    throw new AppError("The request body must be a JSON object.", 400, "invalid_body");
  }

  return {
    title: assertTitle(body.title),
    content: assertRichText(body.content),
    revision: assertRevision(body.revision),
  };
}

function assertJsonTree(value: unknown, depth: number): void {
  if (depth > 40) {
    throw new AppError(
      "Document content is too deeply nested.",
      400,
      "invalid_content",
    );
  }

  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new AppError(
        "Document content must be structured editor data.",
        400,
        "invalid_content",
      );
    }

    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      assertJsonTree(entry, depth + 1);
    }

    return;
  }

  if (isRecord(value)) {
    for (const key of Object.keys(value)) {
      if (key === "__proto__" || key === "prototype" || key === "constructor") {
        throw new AppError(
          "Document content must be structured editor data.",
          400,
          "invalid_content",
        );
      }

      assertJsonTree(value[key], depth + 1);
    }

    return;
  }

  throw new AppError(
    "Document content must be structured editor data.",
    400,
    "invalid_content",
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
