import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";

function request(path: string, method = "GET") {
  return new NextRequest(new URL(path, "http://localhost:3000"), { method });
}

describe("proxy in hosted mode without a session", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_example");
    // No session cookie is sent, so nothing here should need the network.
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("Network is disabled in proxy tests."))),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("lets a signed-out reviewer reach the sign-in page and the sign-in and sign-out routes", async () => {
    for (const path of ["/api/auth/sign-in", "/api/auth/sign-out"]) {
      const response = await proxy(request(path, "POST"));
      expect(response.status, path).toBe(200);
      expect(response.headers.get("x-middleware-next"), path).toBe("1");
    }

    const page = await proxy(request("/auth/sign-in"));
    expect(page.status).toBe(200);
    expect(page.headers.get("x-middleware-next")).toBe("1");
  });

  it("returns 401 JSON for document APIs and sends other pages to sign-in", async () => {
    const api = await proxy(request("/api/documents"));
    expect(api.status).toBe(401);
    expect(api.headers.get("cache-control")).toBe("private, no-store");
    expect(await api.json()).toMatchObject({ code: "unauthenticated" });

    for (const path of ["/", "/documents/57b2b17b-4207-4049-a19b-2613414163fc", "/authors"]) {
      const page = await proxy(request(path));
      expect(page.status, path).toBe(307);
      expect(new URL(page.headers.get("location") ?? "").pathname, path).toBe("/auth/sign-in");
    }
  });
});

describe("proxy outside hosted mode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("passes local development requests through without Supabase", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    const response = await proxy(request("/api/documents"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("fails closed with 503 in production when Supabase is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    for (const path of ["/", "/auth/sign-in", "/api/documents", "/api/session"]) {
      const response = await proxy(request(path));
      expect(response.status, path).toBe(503);
      expect(response.headers.get("cache-control"), path).toBe("private, no-store");
    }
  });
});
