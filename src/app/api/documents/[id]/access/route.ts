import { connection } from "next/server";
import { getCurrentUserId } from "@/lib/auth/current-user";
import {
  changeDocumentAccess,
  grantDocumentAccess,
  listDocumentPeople,
  revokeDocumentAccess,
} from "@/lib/documents/repository";
import { AppError } from "@/lib/documents/errors";
import { assertDocumentId } from "@/lib/documents/validation";
import { assertSameOrigin } from "@/lib/http/same-origin";
import { jsonError, jsonOk, readJson } from "@/lib/http/responses";

type Context = {
  params: Promise<{ id: string }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(_request: Request, context: Context) {
  try {
    await connection();
    const { id } = await context.params;
    const documentId = assertDocumentId(id);
    const userId = await getCurrentUserId();
    const people = await listDocumentPeople(userId, documentId);
    return jsonOk({ people });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    await connection();
    assertSameOrigin(request);
    const { id } = await context.params;
    const documentId = assertDocumentId(id);
    const userId = await getCurrentUserId();
    const body = await readJson(request);

    if (!isRecord(body)) {
      throw new AppError("The request body must be a JSON object.", 400, "invalid_body");
    }

    const person = await grantDocumentAccess(
      userId,
      documentId,
      body.email,
      body.role,
    );
    return jsonOk({ person }, 201);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    await connection();
    assertSameOrigin(request);
    const { id } = await context.params;
    const documentId = assertDocumentId(id);
    const userId = await getCurrentUserId();
    const body = await readJson(request);

    if (!isRecord(body) || typeof body.userId !== "string") {
      throw new AppError("Choose a person to update.", 400, "invalid_body");
    }

    const person = await changeDocumentAccess(
      userId,
      documentId,
      body.userId,
      body.role,
    );
    return jsonOk({ person });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    await connection();
    assertSameOrigin(request);
    const { id } = await context.params;
    const documentId = assertDocumentId(id);
    const userId = await getCurrentUserId();
    const body = await readJson(request);

    if (!isRecord(body) || typeof body.userId !== "string") {
      throw new AppError("Choose a person to remove.", 400, "invalid_body");
    }

    await revokeDocumentAccess(userId, documentId, body.userId);
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
