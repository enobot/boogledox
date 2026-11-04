export const MAX_TITLE_LENGTH = 200;
export const MAX_CONTENT_BYTES = 1_000_000;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type RichTextDocument = {
  type: "doc";
  [key: string]: JsonValue | undefined;
};

export type DocumentAccess = "owner" | "editor" | "viewer";

export type DocumentSummary = {
  id: string;
  title: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  access: DocumentAccess;
};

export type DocumentDetails = DocumentSummary & {
  content: RichTextDocument;
};

export type StoredDocument = {
  id: string;
  ownerId: string;
  title: string;
  content: RichTextDocument;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type DocumentPerson = {
  userId: string;
  email: string;
  displayName: string;
  role: DocumentAccess;
};

export function emptyDocument(): RichTextDocument {
  return {
    type: "doc",
    content: [{ type: "paragraph" }],
  };
}
