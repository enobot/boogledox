import { describe, expect, it } from "vitest";
import { LOCAL_DEV_USER_ID } from "@/lib/auth/local-user";
import { readRuntimeMode, selectUserId } from "@/lib/auth/runtime-mode";

const hostedEnv = {
  NODE_ENV: "production",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
};

describe("runtime mode", () => {
  it("keeps local development on the demo accounts when Supabase is not configured", () => {
    expect(readRuntimeMode({ NODE_ENV: "development" })).toBe("local");
    expect(readRuntimeMode({ NODE_ENV: "test" })).toBe("local");
    expect(
      selectUserId({
        mode: "local",
        demoUserId: null,
        verifiedUserId: null,
        localFallbackId: LOCAL_DEV_USER_ID,
      }),
    ).toBe(LOCAL_DEV_USER_ID);
  });

  it("does not let the demo cookie choose the user when hosted auth is on", () => {
    expect(readRuntimeMode(hostedEnv)).toBe("hosted");
    expect(
      selectUserId({
        mode: "hosted",
        demoUserId: LOCAL_DEV_USER_ID,
        verifiedUserId: "00000000-0000-4000-8000-000000000099",
        localFallbackId: LOCAL_DEV_USER_ID,
      }),
    ).toBe("00000000-0000-4000-8000-000000000099");
    expect(() =>
      selectUserId({
        mode: "hosted",
        demoUserId: LOCAL_DEV_USER_ID,
        verifiedUserId: null,
        localFallbackId: LOCAL_DEV_USER_ID,
      }),
    ).toThrow(expect.objectContaining({ status: 401, code: "unauthenticated" }));
  });

  it("fails closed in production when Supabase configuration is missing or invalid", () => {
    expect(readRuntimeMode({ NODE_ENV: "production" })).toBe("misconfigured");
    expect(
      readRuntimeMode({
        NODE_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      }),
    ).toBe("misconfigured");
    expect(
      readRuntimeMode({
        NODE_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "eyJhbGciOiJIUzI1NiJ9.legacy",
      }),
    ).toBe("misconfigured");
    expect(() =>
      selectUserId({
        mode: "misconfigured",
        demoUserId: LOCAL_DEV_USER_ID,
        verifiedUserId: null,
        localFallbackId: LOCAL_DEV_USER_ID,
      }),
    ).toThrow(expect.objectContaining({ status: 503, code: "misconfigured" }));
  });
});
