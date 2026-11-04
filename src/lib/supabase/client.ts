import { createBrowserClient } from "@supabase/ssr";
import { readRuntimeMode } from "@/lib/auth/runtime-mode";

export function createClient() {
  if (readRuntimeMode(process.env) !== "hosted") {
    throw new Error("Supabase is not configured.");
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
