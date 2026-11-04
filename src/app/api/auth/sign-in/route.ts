import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/documents/errors";
import { readRuntimeMode } from "@/lib/auth/runtime-mode";
import { assertSameOrigin } from "@/lib/http/same-origin";
import { jsonError, jsonOk, readJson } from "@/lib/http/responses";

export async function POST(request: Request) {
  try {
    await connection();
    assertSameOrigin(request);

    if (readRuntimeMode(process.env) !== "hosted") {
      throw new AppError(
        "Sign-in is available when Supabase Auth is configured.",
        503,
        "misconfigured",
      );
    }

    const body = await readJson(request);
    const email = typeof body === "object" && body !== null && "email" in body ? body.email : "";
    const password =
      typeof body === "object" && body !== null && "password" in body ? body.password : "";

    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      throw new AppError("Enter the email and password for a reviewer account.", 400, "invalid_credentials");
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      throw new AppError("Those credentials were not accepted.", 401, "invalid_credentials");
    }

    const { data } = await supabase.auth.getClaims();

    if (!data?.claims?.sub) {
      throw new AppError("Sign-in could not be verified.", 401, "unauthenticated");
    }

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
