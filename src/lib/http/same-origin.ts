import { AppError } from "@/lib/documents/errors";

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");

  if (!origin) {
    return;
  }

  let originHost: string;

  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AppError("This request could not be verified.", 403, "forbidden");
  }

  const host = request.headers.get("host");

  if (!host || originHost !== host) {
    throw new AppError("This request could not be verified.", 403, "forbidden");
  }
}
