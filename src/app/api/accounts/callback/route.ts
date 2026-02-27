import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { gmailProvider } from "@/lib/providers/email";
import { ensureUserExists, getEffectivePlan, getLimitsForPlan } from "@/lib/plan";

const CONNECT_REDIRECT_URI =
  process.env.GOOGLE_CONNECT_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/accounts/callback`;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/app/signin?error=unauthorized", request.url));
    }

    ensureUserExists(session);
    const userId = session.user.id;

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/app/settings?gmail=error&message=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/app/settings?gmail=error&message=No+authorization+code", request.url)
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
      return NextResponse.redirect(
        new URL("/app/settings?gmail=upgrade_required&message=Free+plan+allows+1+connected+account", request.url)
      );
    }

    const tokens = await gmailProvider.getTokenFromCodeWithRedirectUri(code, CONNECT_REDIRECT_URI);

    if (!tokens || !tokens.access_token) {
      return NextResponse.redirect(
        new URL("/app/settings?gmail=error&message=Failed+to+get+access+token", request.url)
      );
    }

    const gmailAddress = await gmailProvider.getGmailAddress(tokens.access_token);

    if (!gmailAddress) {
      return NextResponse.redirect(
        new URL("/app/settings?gmail=error&message=Failed+to+get+email+address", request.url)
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

    return NextResponse.redirect(new URL("/app/settings?gmail=connected", request.url));
  } catch (err) {
    console.error("Gmail callback error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      new URL(`/app/settings?gmail=error&message=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
