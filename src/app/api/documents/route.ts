import { connection } from "next/server";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { createDocument, listDocumentsForUser } from "@/lib/documents/repository";
import { titleForCreate } from "@/lib/documents/validation";
import { assertSameOrigin } from "@/lib/http/same-origin";
import { jsonError, jsonOk, readJson } from "@/lib/http/responses";

export async function GET() {
  try {
    await connection();
    const userId = await getCurrentUserId();
    const documents = await listDocumentsForUser(userId);
    return jsonOk({ documents });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await connection();
    assertSameOrigin(request);
    const userId = await getCurrentUserId();
    const body = await readJson(request);
    const title = titleForCreate(body);
    const document = await createDocument(userId, title);
    return jsonOk({ document }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
