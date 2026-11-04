import { cookies } from "next/headers";
import { findDemoAccount } from "@/lib/auth/demo-accounts";
import { LOCAL_DEV_USER_ID } from "@/lib/auth/local-user";

const COOKIE_NAME = "boogledox_user";

export async function getCurrentUserId(): Promise<string> {
  const jar = await cookies();
  const selected = jar.get(COOKIE_NAME)?.value;

  if (selected && findDemoAccount(selected)) {
    return selected;
  }

  return LOCAL_DEV_USER_ID;
}

export async function setCurrentUserId(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}
