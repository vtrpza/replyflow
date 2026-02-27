import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { gmailProvider } from "@/lib/providers/email";
import {
  ensureUserExists,
  getEffectivePlan,
  getLimitsForPlan,
  upgradeRequiredResponse,
} from "@/lib/plan";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = ensureUserExists(session);

    const accounts = db
      .select()
      .from(schema.connectedEmailAccounts)
      .where(eq(schema.connectedEmailAccounts.userId, userId))
      .all();

    const sanitized = accounts.map((account) => ({
      id: account.id,
      provider: account.provider,
      emailAddress: account.emailAddress,
      isDefault: account.isDefault,
      scope: account.scope,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    }));

    return NextResponse.json({ accounts: sanitized });
  } catch (error) {
    console.error("Accounts GET error:", error);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = ensureUserExists(session);

    const body = await request.json();
    const { action } = body;

    const existingAccounts = db
      .select()
      .from(schema.connectedEmailAccounts)
      .where(eq(schema.connectedEmailAccounts.userId, userId))
      .all();

    const plan = getEffectivePlan(userId);
    const limits = getLimitsForPlan(plan);

    if (action === "initiate") {
      if (plan === "free" && existingAccounts.length >= limits.accounts) {
        return NextResponse.json(upgradeRequiredResponse("accounts", limits.accounts), { status: 402 });
      }

      const authUrl = gmailProvider.getConnectAuthUrl();
      return NextResponse.json({ authUrl });
    }

    if (action === "callback") {
      const { code } = body;
      if (!code) {
        return NextResponse.json({ error: "Authorization code required" }, { status: 400 });
      }

      if (plan === "free" && existingAccounts.length >= limits.accounts) {
        return NextResponse.json(upgradeRequiredResponse("accounts", limits.accounts), { status: 402 });
      }

      const tokens = (await gmailProvider.getTokenFromCode(code)) as {
        access_token?: string;
        refresh_token?: string;
        expiry_date?: number;
        scope?: string;
        token_type?: string;
      };

      if (!tokens.access_token) {
        return NextResponse.json({ error: "Failed to get tokens" }, { status: 400 });
      }

      const isFirstAccount = existingAccounts.length === 0;
      const now = new Date().toISOString();
      const accountId = `gmail-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const userEmail = session.user.email || "unknown@unknown.local";

      db.insert(schema.connectedEmailAccounts)
        .values({
          id: accountId,
          userId,
          provider: "gmail",
          providerAccountId: tokens.token_type || "google",
          emailAddress: userEmail,
          accessToken: tokens.access_token || "",
          refreshToken: tokens.refresh_token || null,
          expiresAt: tokens.expiry_date || null,
          scope: tokens.scope || "",
          isDefault: isFirstAccount,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      return NextResponse.json({
        success: true,
        account: {
          id: accountId,
          provider: "gmail",
          emailAddress: userEmail,
          isDefault: isFirstAccount,
        },
      });
    }

    if (action === "disconnect") {
      const { accountId } = body;
      if (!accountId) {
        return NextResponse.json({ error: "Account ID required" }, { status: 400 });
      }

      const account = db
        .select()
        .from(schema.connectedEmailAccounts)
        .where(
          and(
            eq(schema.connectedEmailAccounts.id, accountId),
            eq(schema.connectedEmailAccounts.userId, userId)
          )
        )
        .get();

      if (!account) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      db.delete(schema.connectedEmailAccounts)
        .where(eq(schema.connectedEmailAccounts.id, accountId))
        .run();

      return NextResponse.json({ success: true });
    }

    if (action === "set-default") {
      const { accountId } = body;
      if (!accountId) {
        return NextResponse.json({ error: "Account ID required" }, { status: 400 });
      }

      const account = db
        .select()
        .from(schema.connectedEmailAccounts)
        .where(
          and(
            eq(schema.connectedEmailAccounts.id, accountId),
            eq(schema.connectedEmailAccounts.userId, userId)
          )
        )
        .get();

      if (!account) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      db.update(schema.connectedEmailAccounts)
        .set({ isDefault: false })
        .where(eq(schema.connectedEmailAccounts.userId, userId))
        .run();

      db.update(schema.connectedEmailAccounts)
        .set({ isDefault: true })
        .where(eq(schema.connectedEmailAccounts.id, accountId))
        .run();

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Accounts POST error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
