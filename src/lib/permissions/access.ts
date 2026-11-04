import { AppError } from "@/lib/documents/errors";

export type DocumentRole = "owner" | "editor" | "viewer";
export type AssignableRole = "editor" | "viewer";

export function resolveDocumentRole(
  userId: string,
  document: { ownerId: string },
  grantedRole: AssignableRole | null = null,
): DocumentRole | null {
  if (userId === document.ownerId) {
    return "owner";
  }

  if (grantedRole === "editor" || grantedRole === "viewer") {
    return grantedRole;
  }

  return null;
}

export function canViewDocument(role: DocumentRole | null): boolean {
  return role === "owner" || role === "editor" || role === "viewer";
}

export function canEditDocument(role: DocumentRole | null): boolean {
  return role === "owner" || role === "editor";
}

export function canManageSharing(role: DocumentRole | null): boolean {
  return role === "owner";
}

export function assertAssignableRole(value: unknown): AssignableRole {
  if (value === "editor" || value === "viewer") {
    return value;
  }

  throw new AppError("Choose Editor or Viewer.", 400, "invalid_permission");
}

export function assertShareEmail(value: unknown): string {
  if (typeof value !== "string") {
    throw new AppError(
      "Enter the email address of a registered account.",
      400,
      "invalid_email",
    );
  }

  const email = value.trim().toLowerCase();

  if (
    email.length > 200 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new AppError(
      "Enter the email address of a registered account.",
      400,
      "invalid_email",
    );
  }

  return email;
}
