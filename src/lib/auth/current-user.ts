import { AppError } from "@/lib/documents/errors";
import { LOCAL_DEV_USER_ID } from "@/lib/auth/local-user";
import { readRuntimeMode, selectUserId } from "@/lib/auth/runtime-mode";
import { findDemoAccount } from "@/lib/auth/demo-accounts";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const COOKIE_NAME = "boogledox_user";

export async function getCurrentUserId(): Promise<string> {
  const mode = readRuntimeMode(process.env);

  if (mode === "misconfigured") {
    return selectUserId({
      mode,
      demoUserId: null,
      verifiedUserId: null,
      localFallbackId: LOCAL_DEV_USER_ID,
    });
  }

  if (mode === "hosted") {
    const verifiedUserId = await readVerifiedUserId();
    return selectUserId({
      mode,
      demoUserId: null,
      verifiedUserId,
      localFallbackId: LOCAL_DEV_USER_ID,
    });
  }

  const jar = await cookies();
  const selected = jar.get(COOKIE_NAME)?.value ?? null;
  return selectUserId({
    mode,
    demoUserId: selected && findDemoAccount(selected) ? selected : null,
    verifiedUserId: null,
    localFallbackId: LOCAL_DEV_USER_ID,
  });
}

export async function setCurrentUserId(userId: string): Promise<void> {
  if (readRuntimeMode(process.env) !== "local") {
    throw new AppError(
      "Demo account switching is only available in local development.",
      403,
      "forbidden",
    );
  }

  const jar = await cookies();
  jar.set(COOKIE_NAME, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

async function readVerifiedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error) {
    return null;
  }

  const subject = data?.claims?.sub;
  return typeof subject === "string" && subject.length > 0 ? subject : null;
}
