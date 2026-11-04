import { connection } from "next/server";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { AppError } from "@/lib/documents/errors";
import {
  getDocumentForUser,
  updateDocumentForUser,
} from "@/lib/documents/repository";
import { assertDocumentId, parseDocumentUpdate } from "@/lib/documents/validation";
import { assertSameOrigin } from "@/lib/http/same-origin";
import { jsonError, jsonOk, readJson } from "@/lib/http/responses";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    await connection();
    const { id } = await context.params;
    const documentId = assertDocumentId(id);
    const userId = await getCurrentUserId();
    const document = await getDocumentForUser(userId, documentId);

    if (!document) {
      throw new AppError(
        "This document does not exist or you do not have access.",
        404,
        "not_found",
      );
    }

    return jsonOk({ document });
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
    const input = parseDocumentUpdate(await readJson(request));
    const document = await updateDocumentForUser(userId, documentId, input);
    return jsonOk({ document });
  } catch (error) {
    return jsonError(error);
  }
}
