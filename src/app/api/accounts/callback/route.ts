import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { gmailProvider } from "@/lib/providers/email";
import { ensureUserExists, getEffectivePlan, getLimitsForPlan } from "@/lib/plan";
import { recordUpgradeBlockedIntent } from "@/lib/plan/intent-events";

const BASE_URL = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "https://replyflow.fly.dev";
const CONNECT_REDIRECT_URI =
  process.env.GOOGLE_CONNECT_REDIRECT_URI || `${BASE_URL}/api/accounts/callback`;

function buildUrl(path: string, params?: Record<string, string>): string {
  const url = new URL(path, BASE_URL);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return url.toString();
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(buildUrl("/app/signin", { error: "unauthorized" }));
    }

    const { userId } = ensureUserExists(session);

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        buildUrl("/app/settings", { gmail: "error", message: error })
      );
    }

    if (!code) {
      return NextResponse.redirect(
        buildUrl("/app/settings", { gmail: "error", message: "No authorization code" })
      );
    }

    const existingAccounts = db
      .select()
      .from(schema.connectedEmailAccounts)
      .where(eq(schema.connectedEmailAccounts.userId, userId))
      .all();

    const plan = getEffectivePlan(userId);
    const limits = getLimitsForPlan(plan);

    if (plan === "free" && existingAccounts.length >= limits.accounts) {
      recordUpgradeBlockedIntent({
        userId,
        plan,
        feature: "accounts",
        route: "/api/accounts/callback",
        limit: limits.accounts,
        period: "month",
      });
      return NextResponse.redirect(
        buildUrl("/app/settings", { gmail: "upgrade_required", message: "Free plan allows 1 connected account" })
      );
    }

    const tokens = await gmailProvider.getTokenFromCodeWithRedirectUri(code, CONNECT_REDIRECT_URI);

    if (!tokens || !tokens.access_token) {
      return NextResponse.redirect(
        buildUrl("/app/settings", { gmail: "error", message: "Failed to get access token" })
      );
    }

    const gmailAddress = await gmailProvider.getGmailAddress(tokens.access_token);

    if (!gmailAddress) {
      return NextResponse.redirect(
        buildUrl("/app/settings", { gmail: "error", message: "Failed to get email address" })
      );
    }

    const isFirstAccount = existingAccounts.length === 0;
    const now = new Date().toISOString();
    const accountId = `gmail-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    db.insert(schema.connectedEmailAccounts)
      .values({
        id: accountId,
        userId,
        provider: "gmail",
        providerAccountId: tokens.token_type || "google",
        emailAddress: gmailAddress,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: tokens.expiry_date || null,
        scope: tokens.scope || "",
        isDefault: isFirstAccount,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return NextResponse.redirect(buildUrl("/app/settings", { gmail: "connected" }));
  } catch (err) {
    console.error("Gmail callback error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      buildUrl("/app/settings", { gmail: "error", message: errorMessage })
    );
  }
}
