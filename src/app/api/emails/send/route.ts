import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { getEmailProvider } from "@/lib/providers/email";
import { assertWithinPlan, ensureUserExists, upgradeRequiredResponse } from "@/lib/plan";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    ensureUserExists(session);

    const body = await request.json();
    const { to, subject, bodyHtml, bodyText, accountId, replyTo } = body;

    if (!to || !subject) {
      return NextResponse.json(
        { error: "Recipient and subject are required" },
        { status: 400 }
      );
    }

    let account;

    if (accountId) {
      account = db
        .select()
        .from(schema.connectedEmailAccounts)
        .where(
          and(
            eq(schema.connectedEmailAccounts.id, accountId),
            eq(schema.connectedEmailAccounts.userId, session.user.id)
          )
        )
        .get();
    } else {
      const accounts = db
        .select()
        .from(schema.connectedEmailAccounts)
        .where(eq(schema.connectedEmailAccounts.userId, session.user.id))
        .all();

      account = accounts.find((a) => a.isDefault) || accounts[0];
    }

    if (!account) {
      return NextResponse.json(
        { error: "No connected email account found" },
        { status: 400 }
      );
    }

    const sendCheck = assertWithinPlan(session.user.id, "sends");
    if (!sendCheck.ok) {
      return NextResponse.json(
        upgradeRequiredResponse(sendCheck.feature, sendCheck.limit),
        { status: 402 }
      );
    }

    let accessToken = account.accessToken;

    if (account.expiresAt && account.expiresAt < Date.now()) {
      if (!account.refreshToken) {
        return NextResponse.json(
          { error: "Token expired and no refresh token available" },
          { status: 401 }
        );
      }

      const provider = getEmailProvider(account.provider as "gmail");
      const refreshResult = await provider.refreshToken(account.refreshToken);

      if (!refreshResult.success || !refreshResult.accessToken) {
        return NextResponse.json(
          { error: "Failed to refresh token" },
          { status: 401 }
        );
      }

      accessToken = refreshResult.accessToken;

      db.update(schema.connectedEmailAccounts)
        .set({
          accessToken: refreshResult.accessToken,
          refreshToken: refreshResult.refreshToken || account.refreshToken,
          expiresAt: refreshResult.expiresAt || null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.connectedEmailAccounts.id, account.id))
        .run();
    }

    const provider = getEmailProvider(account.provider as "gmail");

    const sendResult = await provider.send(
      {
        to,
        from: account.emailAddress,
        replyTo: replyTo || account.emailAddress,
        subject,
        bodyHtml,
        bodyText,
      },
      accessToken
    );

    const now = new Date().toISOString();
    const emailId = `email-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    if (sendResult.success) {
      db.insert(schema.outboundEmails)
        .values({
          id: emailId,
          userId: session.user.id,
          accountId: account.id,
          recipientEmail: to,
          senderEmail: account.emailAddress,
          replyTo: replyTo || null,
          subject,
          bodyHtml: bodyHtml || null,
          bodyText: bodyText || null,
          status: "sent",
          provider: account.provider,
          providerMessageId: sendResult.messageId || null,
          providerThreadId: sendResult.threadId || null,
          sentAt: now,
          createdAt: now,
        })
        .run();
    } else {
      db.insert(schema.outboundEmails)
        .values({
          id: emailId,
          userId: session.user.id,
          accountId: account.id,
          recipientEmail: to,
          senderEmail: account.emailAddress,
          replyTo: replyTo || null,
          subject,
          bodyHtml: bodyHtml || null,
          bodyText: bodyText || null,
          status: "failed",
          provider: account.provider,
          failedAt: now,
          createdAt: now,
          errorCode: sendResult.error?.code || "UNKNOWN",
          errorMessage: sendResult.error?.message || "Unknown error",
        })
        .run();
    }

    if (sendResult.success) {
      return NextResponse.json({
        success: true,
        messageId: sendResult.messageId,
        threadId: sendResult.threadId,
        emailId,
      });
    }

    return NextResponse.json(
      {
        error: sendResult.error?.message || "Failed to send email",
        code: sendResult.error?.code,
        emailId,
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("Send email error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
