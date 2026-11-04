import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readRuntimeMode } from "@/lib/auth/runtime-mode";

export async function proxy(request: NextRequest) {
  const mode = readRuntimeMode(process.env);

  if (mode === "misconfigured") {
    return new NextResponse(
      "Boogle Dox is not configured for production. Add the Supabase URL and publishable key.",
      {
        status: 503,
        headers: { "cache-control": "private, no-store" },
      },
    );
  }

  if (mode === "local") {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;
  const isAuthPage = path.startsWith("/auth/");
  // Sign-in and sign-out must be reachable before a session exists.
  const isAuthApi = path.startsWith("/api/auth/");

  if (!signedIn && path.startsWith("/api/") && !isAuthApi) {
    const denied = NextResponse.json(
      { error: "Sign in to open documents.", code: "unauthenticated" },
      { status: 401, headers: { "cache-control": "private, no-store" } },
    );
    copySession(supabaseResponse, denied);
    return denied;
  }

  if (!signedIn && !isAuthPage && !isAuthApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/sign-in";
    const redirect = NextResponse.redirect(url);
    copySession(supabaseResponse, redirect);
    return redirect;
  }

  return supabaseResponse;
}

function copySession(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(header);
    if (value) {
      target.headers.set(header, value);
    }
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
