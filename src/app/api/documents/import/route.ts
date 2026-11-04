import { connection } from "next/server";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { AppError } from "@/lib/documents/errors";
import { createDocument } from "@/lib/documents/repository";
import { assertTitle } from "@/lib/documents/validation";
import { assertSameOrigin } from "@/lib/http/same-origin";
import { jsonError, jsonOk } from "@/lib/http/responses";
import { parseImportedFile } from "@/lib/import/import-file";

export async function POST(request: Request) {
  try {
    await connection();
    assertSameOrigin(request);
    const userId = await getCurrentUserId();
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      throw new AppError("Choose a .txt or .md file to import.", 400, "missing_file");
    }

    const imported = await parseImportedFile(file);
    const document = await createDocument(
      userId,
      assertTitle(imported.title),
      imported.content,
    );
    return jsonOk({ document }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
