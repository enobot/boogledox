import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/documents/errors";
import {
  emptyDocument,
  type DocumentAccess,
  type DocumentDetails,
  type DocumentPerson,
  type DocumentSummary,
  type RichTextDocument,
} from "@/lib/documents/types";
import { assertRichText } from "@/lib/documents/validation";

type DocumentRow = {
  id: string;
  owner_id: string;
  title: string;
  content: RichTextDocument;
  revision: number;
  created_at: string;
  updated_at: string;
};

export async function listDocumentsHosted(): Promise<DocumentSummary[]> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const documents = await selectDocuments(supabase);
  const permissions = await selectOwnPermissions(supabase, userId);

  return documents
    .map((row) => {
      const access = accessFor(userId, row.owner_id, permissions.get(row.id));
      if (!access) {
        return null;
      }

      return {
        id: row.id,
        title: row.title,
        revision: row.revision,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        access,
      };
    })
    .filter((row): row is DocumentSummary => row !== null)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function createDocumentHosted(
  title: string,
  content: RichTextDocument = emptyDocument(),
): Promise<DocumentDetails> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const id = crypto.randomUUID();
  const { data, error } = await supabase
    .from("documents")
    .insert({
      id,
      owner_id: userId,
      title,
      content,
    })
    .select("id, owner_id, title, content, revision, created_at, updated_at")
    .single();

  if (error || !data) {
    throw mapHostedError(error);
  }

  return toDetails(data as DocumentRow, "owner");
}

export async function getDocumentHosted(
  documentId: string,
): Promise<DocumentDetails | null> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const { data, error } = await supabase
    .from("documents")
    .select("id, owner_id, title, content, revision, created_at, updated_at")
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    throw mapHostedError(error);
  }

  if (!data) {
    return null;
  }

  const permissions = await selectOwnPermissions(supabase, userId);
  const access = accessFor(userId, data.owner_id, permissions.get(data.id));
  if (!access) {
    return null;
  }

  return toDetails(data as DocumentRow, access);
}

export async function updateDocumentHosted(
  documentId: string,
  input: { title: string; content: RichTextDocument; revision: number },
): Promise<DocumentDetails> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const { data, error } = await supabase.rpc("save_document", {
    target_id: documentId,
    next_title: input.title,
    next_content: input.content,
    expected_revision: input.revision,
  });

  if (error || !data) {
    throw mapHostedError(error);
  }

  const saved = data as {
    id: string;
    ownerId: string;
    title: string;
    content: unknown;
    revision: number;
    createdAt: string;
    updatedAt: string;
  };

  return {
    id: saved.id,
    title: saved.title,
    content: assertRichText(saved.content),
    revision: saved.revision,
    createdAt: saved.createdAt,
    updatedAt: saved.updatedAt,
    access: userId === saved.ownerId ? "owner" : "editor",
  };
}

export async function listPeopleHosted(documentId: string): Promise<DocumentPerson[]> {
  const supabase = await createClient();
  await requireUserId(supabase);
  const document = await getDocumentHosted(documentId);

  if (!document) {
    throw new AppError(
      "This document does not exist or you do not have access.",
      404,
      "not_found",
    );
  }

  const { data: permissions, error } = await supabase
    .from("document_permissions")
    .select("user_id, role")
    .eq("document_id", documentId);

  if (error) {
    throw mapHostedError(error);
  }

  const ids = [
    ...new Set([
      ...(permissions ?? []).map((row) => row.user_id as string),
    ]),
  ];
  const { data: ownerRow } = await supabase
    .from("documents")
    .select("owner_id")
    .eq("id", documentId)
    .maybeSingle();
  if (ownerRow?.owner_id) {
    ids.push(ownerRow.owner_id);
  }

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .in("id", ids);

  if (profileError) {
    throw mapHostedError(profileError);
  }

  const byId = new Map(
    (profiles ?? []).map((profile) => [profile.id as string, profile]),
  );
  const people: DocumentPerson[] = [];
  const owner = ownerRow?.owner_id ? byId.get(ownerRow.owner_id) : undefined;

  if (owner) {
    people.push({
      userId: owner.id,
      email: owner.email,
      displayName: owner.display_name,
      role: "owner",
    });
  }

  for (const permission of permissions ?? []) {
    const profile = byId.get(permission.user_id as string);
    if (!profile) {
      continue;
    }

    people.push({
      userId: profile.id,
      email: profile.email,
      displayName: profile.display_name,
      role: permission.role === "editor" ? "editor" : "viewer",
    });
  }

  return people;
}

export async function grantAccessHosted(
  documentId: string,
  email: string,
  role: "editor" | "viewer",
): Promise<DocumentPerson> {
  const supabase = await createClient();
  await requireUserId(supabase);
  const { data, error } = await supabase.rpc("grant_document_access", {
    target_document: documentId,
    target_email: email,
    target_role: role,
  });

  if (error || !data) {
    throw mapHostedError(error);
  }

  return data as DocumentPerson;
}

export async function changeAccessHosted(
  documentId: string,
  targetUserId: string,
  role: "editor" | "viewer",
): Promise<DocumentPerson> {
  const supabase = await createClient();
  await requireUserId(supabase);
  const { data, error } = await supabase.rpc("change_document_access", {
    target_document: documentId,
    target_user: targetUserId,
    target_role: role,
  });

  if (error || !data) {
    throw mapHostedError(error);
  }

  return data as DocumentPerson;
}

export async function revokeAccessHosted(
  documentId: string,
  targetUserId: string,
): Promise<void> {
  const supabase = await createClient();
  await requireUserId(supabase);
  const { error } = await supabase.rpc("revoke_document_access", {
    target_document: documentId,
    target_user: targetUserId,
  });

  if (error) {
    throw mapHostedError(error);
  }
}

async function requireUserId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;

  if (error || typeof subject !== "string" || !subject) {
    throw new AppError("Sign in to open documents.", 401, "unauthenticated");
  }

  return subject;
}

async function selectDocuments(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from("documents")
    .select("id, owner_id, title, content, revision, created_at, updated_at");

  if (error) {
    throw mapHostedError(error);
  }

  return (data ?? []) as DocumentRow[];
}

async function selectOwnPermissions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("document_permissions")
    .select("document_id, role")
    .eq("user_id", userId);

  if (error) {
    throw mapHostedError(error);
  }

  return new Map(
    (data ?? []).map((row) => [row.document_id as string, row.role as string]),
  );
}

function accessFor(
  userId: string,
  ownerId: string,
  granted: string | undefined,
): DocumentAccess | null {
  if (userId === ownerId) {
    return "owner";
  }

  if (granted === "editor" || granted === "viewer") {
    return granted;
  }

  return null;
}

function toDetails(row: DocumentRow, access: DocumentAccess): DocumentDetails {
  return {
    id: row.id,
    title: row.title,
    content: assertRichText(row.content),
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    access,
  };
}

function mapHostedError(error: { message?: string; code?: string } | null): AppError {
  const message = error?.message?.toLowerCase() ?? "";

  if (message.includes("stale revision")) {
    return new AppError(
      "This document was updated somewhere else. Your changes are still in this editor and were not saved.",
      409,
      "stale_revision",
    );
  }

  if (message.includes("read only")) {
    return new AppError(
      "You have view-only access and cannot edit this document.",
      403,
      "read_only",
    );
  }

  if (message.includes("only the owner")) {
    return new AppError("Only the owner can change sharing.", 403, "forbidden");
  }

  if (message.includes("duplicate share")) {
    return new AppError(
      "That account already has access. Change their permission instead.",
      409,
      "duplicate_share",
    );
  }

  if (message.includes("unknown account")) {
    return new AppError("No registered account uses that email.", 404, "unknown_account");
  }

  if (message.includes("not shared")) {
    return new AppError(
      "That account does not have access to this document.",
      404,
      "not_shared",
    );
  }

  if (message.includes("invalid permission") || message.includes("invalid title") || message.includes("invalid content")) {
    return new AppError("That change could not be saved.", 400, "invalid_permission");
  }

  if (message.includes("not found") || message.includes("not authenticated")) {
    return new AppError(
      "This document does not exist or you do not have access.",
      404,
      "not_found",
    );
  }

  return new AppError("Something went wrong. Please try again.", 500, "internal_error");
}
