import { getDatabase } from "@/lib/db/client";
import { AppError } from "@/lib/documents/errors";
import {
  emptyDocument,
  type DocumentAccess,
  type DocumentDetails,
  type DocumentPerson,
  type DocumentSummary,
  type RichTextDocument,
  type StoredDocument,
} from "@/lib/documents/types";
import { assertRichText } from "@/lib/documents/validation";
import {
  assertAssignableRole,
  assertShareEmail,
  canEditDocument,
  canManageSharing,
  canViewDocument,
  resolveDocumentRole,
} from "@/lib/permissions/access";

type DocumentRow = {
  id: string;
  owner_id: string;
  title: string;
  content?: unknown;
  revision: number | string;
  created_at: Date | string;
  updated_at: Date | string;
  access?: string;
};

function notFound(): AppError {
  return new AppError(
    "This document does not exist or you do not have access.",
    404,
    "not_found",
  );
}

export async function listDocumentsForUser(
  userId: string,
): Promise<DocumentSummary[]> {
  const database = await getDatabase();
  const result = await database.query<DocumentRow>(
    `SELECT d.id, d.owner_id, d.title, d.revision, d.created_at, d.updated_at,
            CASE WHEN d.owner_id = $1 THEN 'owner' ELSE p.role END AS access
     FROM documents d
     LEFT JOIN document_permissions p
       ON p.document_id = d.id AND p.user_id = $1
     WHERE d.owner_id = $1 OR p.user_id IS NOT NULL
     ORDER BY d.updated_at DESC`,
    [userId],
  );

  return result.rows.map((row) => toSummary(row, accessFromColumn(row.access)));
}

export async function createDocument(
  userId: string,
  title: string,
  content: RichTextDocument = emptyDocument(),
): Promise<DocumentDetails> {
  const database = await getDatabase();
  const id = crypto.randomUUID();
  const result = await database.query<DocumentRow>(
    `INSERT INTO documents (id, owner_id, title, content)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING id, owner_id, title, content, revision, created_at, updated_at`,
    [id, userId, title, JSON.stringify(content)],
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("The document insert did not return a row.");
  }

  return toDetails(mapRow(row), "owner");
}

export async function getDocumentForUser(
  userId: string,
  documentId: string,
): Promise<DocumentDetails | null> {
  const stored = await findDocument(documentId);
  const role = stored ? await roleFor(userId, stored) : null;

  if (!stored || !role || !canViewDocument(role)) {
    return null;
  }

  return toDetails(stored, role);
}

export async function updateDocumentForUser(
  userId: string,
  documentId: string,
  input: { title: string; content: RichTextDocument; revision: number },
): Promise<DocumentDetails> {
  const existing = await findDocument(documentId);
  const role = existing ? await roleFor(userId, existing) : null;

  if (!existing || !role || !canViewDocument(role)) {
    throw notFound();
  }

  if (!canEditDocument(role)) {
    throw new AppError(
      "You have view-only access and cannot edit this document.",
      403,
      "read_only",
    );
  }

  if (existing.revision !== input.revision) {
    throw staleRevision(existing.revision);
  }

  const database = await getDatabase();
  const result = await database.query<DocumentRow>(
    `UPDATE documents
     SET title = $1,
         content = $2::jsonb,
         revision = revision + 1,
         updated_at = NOW()
     WHERE id = $3 AND revision = $4
     RETURNING id, owner_id, title, content, revision, created_at, updated_at`,
    [input.title, JSON.stringify(input.content), documentId, input.revision],
  );
  const row = result.rows[0];

  if (!row) {
    const current = await findDocument(documentId);

    if (!current || !canViewDocument(await roleFor(userId, current))) {
      throw notFound();
    }

    throw staleRevision(current.revision);
  }

  return toDetails(mapRow(row), role);
}

async function findDocument(documentId: string): Promise<StoredDocument | null> {
  const database = await getDatabase();
  const result = await database.query<DocumentRow>(
    `SELECT id, owner_id, title, content, revision, created_at, updated_at
     FROM documents
     WHERE id = $1`,
    [documentId],
  );
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return mapRow(row);
}

function staleRevision(currentRevision: number): AppError {
  return new AppError(
    "This document was updated somewhere else. Your changes are still in this editor and were not saved.",
    409,
    "stale_revision",
    currentRevision,
  );
}

function mapRow(row: DocumentRow): StoredDocument {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    content: readContent(row.content),
    revision: Number(row.revision),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export async function listDocumentPeople(
  userId: string,
  documentId: string,
): Promise<DocumentPerson[]> {
  const existing = await findDocument(documentId);
  const role = existing ? await roleFor(userId, existing) : null;

  if (!existing || !canViewDocument(role)) {
    throw notFound();
  }

  const database = await getDatabase();
  const result = await database.query<PersonRow>(
    `SELECT p.id, p.email, p.display_name, 'owner' AS role
     FROM documents d
     JOIN profiles p ON p.id = d.owner_id
     WHERE d.id = $1
     UNION ALL
     SELECT p.id, p.email, p.display_name, dp.role
     FROM document_permissions dp
     JOIN profiles p ON p.id = dp.user_id
     WHERE dp.document_id = $1`,
    [documentId],
  );

  return result.rows
    .map(mapPerson)
    .sort(
      (left, right) =>
        roleOrder(left.role) - roleOrder(right.role) ||
        left.displayName.localeCompare(right.displayName),
    );
}

export async function grantDocumentAccess(
  userId: string,
  documentId: string,
  emailInput: unknown,
  roleInput: unknown,
): Promise<DocumentPerson> {
  const document = await requireOwner(userId, documentId);
  const email = assertShareEmail(emailInput);
  const role = assertAssignableRole(roleInput);
  const database = await getDatabase();
  const profile = await database.query<PersonRow>(
    `SELECT id, email, display_name, '' AS role
     FROM profiles
     WHERE lower(email) = $1`,
    [email],
  );
  const account = profile.rows[0];

  if (!account) {
    throw new AppError(
      "No registered account uses that email.",
      404,
      "unknown_account",
    );
  }

  if (account.id === document.ownerId) {
    throw new AppError(
      "That account already owns this document.",
      409,
      "duplicate_share",
    );
  }

  const existingGrant = await database.query<{ user_id: string }>(
    `SELECT user_id FROM document_permissions
     WHERE document_id = $1 AND user_id = $2`,
    [documentId, account.id],
  );

  if (existingGrant.rows.length > 0) {
    throw new AppError(
      "That account already has access. Change their permission instead.",
      409,
      "duplicate_share",
    );
  }

  await database.query(
    `INSERT INTO document_permissions (document_id, user_id, role)
     VALUES ($1, $2, $3)`,
    [documentId, account.id, role],
  );

  return {
    userId: account.id,
    email: account.email,
    displayName: account.display_name,
    role,
  };
}

export async function changeDocumentAccess(
  userId: string,
  documentId: string,
  targetUserId: string,
  roleInput: unknown,
): Promise<DocumentPerson> {
  const document = await requireOwner(userId, documentId);
  const role = assertAssignableRole(roleInput);

  if (targetUserId === document.ownerId) {
    throw new AppError(
      "The owner's access cannot be changed.",
      400,
      "invalid_permission",
    );
  }

  const database = await getDatabase();
  const result = await database.query<PersonRow>(
    `UPDATE document_permissions
     SET role = $1
     WHERE document_id = $2 AND user_id = $3
     RETURNING user_id AS id,
               (SELECT email FROM profiles WHERE id = user_id) AS email,
               (SELECT display_name FROM profiles WHERE id = user_id) AS display_name,
               role`,
    [role, documentId, targetUserId],
  );
  const row = result.rows[0];

  if (!row) {
    throw new AppError(
      "That account does not have access to this document.",
      404,
      "not_shared",
    );
  }

  return mapPerson(row);
}

export async function revokeDocumentAccess(
  userId: string,
  documentId: string,
  targetUserId: string,
): Promise<void> {
  const document = await requireOwner(userId, documentId);

  if (targetUserId === document.ownerId) {
    throw new AppError(
      "The owner cannot be removed from this document.",
      400,
      "invalid_permission",
    );
  }

  const database = await getDatabase();
  const result = await database.query(
    `DELETE FROM document_permissions
     WHERE document_id = $1 AND user_id = $2`,
    [documentId, targetUserId],
  );

  if (!result.affectedRows) {
    throw new AppError(
      "That account does not have access to this document.",
      404,
      "not_shared",
    );
  }
}

async function requireOwner(
  userId: string,
  documentId: string,
): Promise<StoredDocument> {
  const existing = await findDocument(documentId);
  const role = existing ? await roleFor(userId, existing) : null;

  if (!existing || !canViewDocument(role)) {
    throw notFound();
  }

  if (!canManageSharing(role)) {
    throw new AppError("Only the owner can change sharing.", 403, "forbidden");
  }

  return existing;
}

async function roleFor(
  userId: string,
  document: StoredDocument,
): Promise<DocumentAccess | null> {
  if (userId === document.ownerId) {
    return resolveDocumentRole(userId, document, null);
  }

  const database = await getDatabase();
  const result = await database.query<{ role: string }>(
    `SELECT role
     FROM document_permissions
     WHERE document_id = $1 AND user_id = $2`,
    [document.id, userId],
  );
  const granted = result.rows[0]?.role ?? null;
  const assignable =
    granted === "editor" || granted === "viewer" ? granted : null;

  return resolveDocumentRole(userId, document, assignable);
}

function accessFromColumn(value: string | undefined): DocumentAccess {
  if (value === "owner" || value === "editor" || value === "viewer") {
    return value;
  }

  throw new Error("Stored document access is invalid.");
}

function toSummary(row: DocumentRow, access: DocumentAccess): DocumentSummary {
  return {
    id: row.id,
    title: row.title,
    revision: Number(row.revision),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    access,
  };
}

function toDetails(
  document: StoredDocument,
  access: DocumentAccess,
): DocumentDetails {
  return {
    id: document.id,
    title: document.title,
    revision: document.revision,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    access,
    content: document.content,
  };
}

type PersonRow = {
  id: string;
  email: string;
  display_name: string;
  role: string;
};

function mapPerson(row: PersonRow): DocumentPerson {
  return {
    userId: row.id,
    email: row.email,
    displayName: row.display_name,
    role: accessFromColumn(row.role),
  };
}

function roleOrder(role: DocumentAccess): number {
  if (role === "owner") return 0;
  if (role === "editor") return 1;
  return 2;
}

function readContent(value: unknown): RichTextDocument {
  const content = typeof value === "string" ? JSON.parse(value) : value;

  if (!content || typeof content !== "object" || Array.isArray(content)) {
    throw new Error("Stored document content is invalid.");
  }

  return assertRichText(content);
}

function toIso(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Stored document timestamp is invalid.");
  }

  return date.toISOString();
}
