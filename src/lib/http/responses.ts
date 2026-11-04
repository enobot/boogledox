import { AppError } from "@/lib/documents/errors";

const NO_STORE = { "Cache-Control": "no-store" };

export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AppError(
      "The request could not be read. Send JSON and try again.",
      400,
      "invalid_json",
    );
  }
}

export function jsonOk(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export function jsonError(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(
      {
        error: error.message,
        code: error.code,
        ...(error.currentRevision !== undefined
          ? { currentRevision: error.currentRevision }
          : {}),
      },
      { status: error.status, headers: NO_STORE },
    );
  }

  console.error(error);

  return Response.json(
    {
      error: "Something went wrong. Please try again.",
      code: "internal_error",
    },
    { status: 500, headers: NO_STORE },
  );
}
