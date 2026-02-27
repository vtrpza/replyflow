import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getEmailProvider } from "@/lib/providers/email";

interface SendEmailParams {
  userId: string;
  to: string;
  subject: string;
  body: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string;
  }>;
}

interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail({
  userId,
  to,
  subject,
  body,
  from,
  replyTo,
  attachments,
}: SendEmailParams): Promise<SendEmailResponse> {
  try {
    const accounts = db
      .select()
      .from(schema.connectedEmailAccounts)
      .where(eq(schema.connectedEmailAccounts.userId, userId))
      .all();
    const account = accounts.find((item) => item.isDefault) || accounts[0];

    if (!account) {
      return {
        success: false,
        error: "No connected email account found",
      };
    }

    let accessToken = account.accessToken;
    const provider = getEmailProvider(account.provider as "gmail");

    if (account.expiresAt && account.expiresAt < Date.now()) {
      if (!account.refreshToken) {
        return {
          success: false,
          error: "Token expired and no refresh token available",
        };
      }

      const refreshResult = await provider.refreshToken(account.refreshToken);

      if (!refreshResult.success || !refreshResult.accessToken) {
        return {
          success: false,
          error: refreshResult.error || "Failed to refresh token",
        };
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

    const sendResult = await provider.send(
      {
        to,
        from: from || account.emailAddress,
        replyTo: replyTo || account.emailAddress,
        subject,
        bodyHtml: body.replace(/\n/g, "<br>"),
        bodyText: body,
        attachments,
      },
      accessToken
    );

    if (!sendResult.success) {
      return {
        success: false,
        error: sendResult.error?.message || "Failed to send email",
      };
    }

    return {
      success: true,
      messageId: sendResult.messageId,
    };
  } catch (error) {
    console.error("Email sender error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}
