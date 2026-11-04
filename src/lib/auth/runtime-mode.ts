import { AppError } from "@/lib/documents/errors";

export type RuntimeMode = "local" | "hosted" | "misconfigured";

const PUBLISHABLE_KEY = /^sb_publishable_[A-Za-z0-9_-]+$/;

export function readRuntimeMode(
  env: Record<string, string | undefined>,
): RuntimeMode {
  const hosted = isHostedConfiguration(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  if (env.NODE_ENV === "production") {
    return hosted ? "hosted" : "misconfigured";
  }

  return hosted ? "hosted" : "local";
}

export function getRuntimeMode(): RuntimeMode {
  return readRuntimeMode(process.env);
}

export function selectUserId(input: {
  mode: RuntimeMode;
  demoUserId: string | null;
  verifiedUserId: string | null;
  localFallbackId: string;
}): string {
  if (input.mode === "misconfigured") {
    throw new AppError(
      "Boogle Dox is not configured for production. Add the Supabase URL and publishable key on the server.",
      503,
      "misconfigured",
    );
  }

  if (input.mode === "hosted") {
    if (!input.verifiedUserId) {
      throw new AppError("Sign in to open documents.", 401, "unauthenticated");
    }

    return input.verifiedUserId;
  }

  return input.demoUserId || input.localFallbackId;
}

function isHostedConfiguration(url: string | undefined, key: string | undefined): boolean {
  const projectUrl = url?.trim() ?? "";
  const publishableKey = key?.trim() ?? "";

  if (!PUBLISHABLE_KEY.test(publishableKey)) {
    return false;
  }

  try {
    const parsed = new URL(projectUrl);
    return parsed.protocol === "https:" && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}
