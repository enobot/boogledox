import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/documents/errors";
import { readRuntimeMode } from "@/lib/auth/runtime-mode";
import { assertSameOrigin } from "@/lib/http/same-origin";
import { jsonError, jsonOk } from "@/lib/http/responses";

export async function POST(request: Request) {
  try {
    await connection();
    assertSameOrigin(request);

    if (readRuntimeMode(process.env) !== "hosted") {
      throw new AppError(
        "Sign-out is available when Supabase Auth is configured.",
        503,
        "misconfigured",
      );
    }

    const supabase = await createClient();
    await supabase.auth.signOut();
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
