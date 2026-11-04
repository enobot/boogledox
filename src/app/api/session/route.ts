import { connection } from "next/server";
import { getCurrentUserId, setCurrentUserId } from "@/lib/auth/current-user";
import { DEMO_ACCOUNTS, findDemoAccount } from "@/lib/auth/demo-accounts";
import { getRuntimeMode } from "@/lib/auth/runtime-mode";
import { AppError } from "@/lib/documents/errors";
import { assertSameOrigin } from "@/lib/http/same-origin";
import { jsonError, jsonOk, readJson } from "@/lib/http/responses";

export async function GET() {
  try {
    await connection();
    const mode = getRuntimeMode();

    if (mode === "hosted") {
      const userId = await getCurrentUserId();
      return jsonOk({
        mode,
        account: {
          id: userId,
          email: "",
          displayName: "Signed in",
        },
        accounts: [],
      });
    }

    const userId = await getCurrentUserId();
    const account = findDemoAccount(userId);

    return jsonOk({
      mode,
      account,
      accounts: DEMO_ACCOUNTS,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await connection();
    assertSameOrigin(request);
    const body = await readJson(request);
    const userId =
      typeof body === "object" &&
      body !== null &&
      "userId" in body &&
      typeof body.userId === "string"
        ? body.userId
        : "";
    const account = findDemoAccount(userId);

    if (!account) {
      throw new AppError("Choose one of the local demo accounts.", 400, "invalid_account");
    }

    await setCurrentUserId(account.id);
    return jsonOk({ account });
  } catch (error) {
    return jsonError(error);
  }
}
