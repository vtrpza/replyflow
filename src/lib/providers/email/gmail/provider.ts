import { google } from "googleapis";
import type {
  EmailProvider,
  SendEmailInput,
  SendEmailResult,
  RefreshTokenResult,
  ListMessagesOptions,
  ListMessagesResult,
  MessageResult,
} from "../types";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
];

export class GmailProvider implements EmailProvider {
  readonly name = "gmail" as const;

  private oauth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    );
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResult> {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      return {
        success: true,
        accessToken: credentials.access_token || undefined,
        refreshToken: credentials.refresh_token || refreshToken,
        expiresAt: credentials.expiry_date || undefined,
      };
    } catch (error) {
      console.error("Gmail refresh token error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to refresh token",
      };
    }
  }

  async send(input: SendEmailInput, accessToken: string): Promise<SendEmailResult> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: "v1", auth: this.oauth2Client });

      const rawMessage = this.buildRawMessage(input);

      const response = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: rawMessage,
          threadId: input.threadId,
        },
      });

      const messageId = response.data.id;
      const threadId = response.data.threadId;

      return {
        success: true,
        messageId: messageId || undefined,
        threadId: threadId || undefined,
        provider: "gmail",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Gmail send error:", error);
      
      const errorObj = error as { response?: { data?: { error?: string } } };
      const errorMessage = errorObj.response?.data?.error || (error instanceof Error ? error.message : "Failed to send email");

      return {
        success: false,
        provider: "gmail",
        error: {
          code: "GMAIL_SEND_ERROR",
          message: errorMessage,
          details: errorObj.response?.data,
        },
      };
    }
  }

  async listMessages(accessToken: string, options?: ListMessagesOptions): Promise<ListMessagesResult> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: "v1", auth: this.oauth2Client });

      const response = await gmail.users.messages.list({
        userId: "me",
        maxResults: options?.maxResults || 10,
        pageToken: options?.pageToken,
        q: options?.q,
      });

      return {
        messages: (response.data.messages || []).map((m) => ({
          id: m.id || "",
          threadId: m.threadId || undefined,
        })),
        nextPageToken: response.data.nextPageToken || undefined,
        resultSizeEstimate: response.data.resultSizeEstimate || 0,
      };
    } catch (error) {
      console.error("Gmail list messages error:", error);
      return { messages: [] };
    }
  }

  async getMessage(accessToken: string, messageId: string): Promise<MessageResult> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: "v1", auth: this.oauth2Client });

      const response = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });

      return {
        id: response.data.id || "",
        threadId: response.data.threadId || undefined,
        labelIds: response.data.labelIds || undefined,
        snippet: response.data.snippet || undefined,
        raw: response.data.raw || undefined,
        payload: response.data.payload as MessageResult["payload"],
      };
    } catch (error) {
      console.error("Gmail get message error:", error);
      throw error;
    }
  }

  private buildRawMessage(input: SendEmailInput): string {
    const lines: string[] = [];

    lines.push(`To: ${input.to}`);
    lines.push(`From: ${input.from}`);
    if (input.replyTo) {
      lines.push(`Reply-To: ${input.replyTo}`);
    }
    lines.push(`Subject: ${input.subject}`);
    lines.push("MIME-Version: 1.0");
    
    const hasHtml = !!input.bodyHtml;
    const hasText = !!input.bodyText;
    
    if (hasHtml && hasText) {
      lines.push('Content-Type: multipart/alternative; boundary="boundary"');
      lines.push("");
      lines.push("--boundary");
      lines.push("Content-Type: text/plain; charset=UTF-8");
      lines.push("");
      lines.push(input.bodyText || "");
      lines.push("");
      lines.push("--boundary");
      lines.push("Content-Type: text/html; charset=UTF-8");
      lines.push("");
      lines.push(input.bodyHtml || "");
      lines.push("");
      lines.push("--boundary--");
    } else if (hasHtml) {
      lines.push('Content-Type: text/html; charset=UTF-8');
      lines.push("");
      lines.push(input.bodyHtml || "");
    } else {
      lines.push("Content-Type: text/plain; charset=UTF-8");
      lines.push("");
      lines.push(input.bodyText || "");
    }

    if (input.attachments && input.attachments.length > 0) {
      const boundary = "boundary_attachment";
      lines[lines.indexOf("MIME-Version: 1.0")] = 'MIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="' + boundary + '"';
      
      const attachmentPart = [
        "",
        `--${boundary}`,
        `Content-Type: ${hasHtml ? "text/html" : "text/plain"}; charset=UTF-8`,
        "",
        hasHtml ? (input.bodyHtml || "") : (input.bodyText || ""),
      ];

      for (const attachment of input.attachments) {
        attachmentPart.push(`--${boundary}`);
        attachmentPart.push(`Content-Type: application/octet-stream; name="${attachment.filename}"`);
        attachmentPart.push("Content-Transfer-Encoding: base64");
        attachmentPart.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
        attachmentPart.push("");
        attachmentPart.push(attachment.content);
      }

      attachmentPart.push(`--${boundary}--`);
      lines.push(...attachmentPart);
    }

    const message = lines.join("\r\n");
    return Buffer.from(message).toString("base64url");
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
    });
  }

  getConnectAuthUrl(): string {
    const connectRedirectUri = process.env.GOOGLE_CONNECT_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/accounts/callback`;
    const connectClient = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      connectRedirectUri
    );
    return connectClient.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
    });
  }

  async getTokenFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  async getTokenFromCodeWithRedirectUri(code: string, redirectUri: string): Promise<{
    access_token?: string;
    refresh_token?: string;
    expiry_date?: number;
    scope?: string;
    token_type?: string;
  } | null> {
    const tempClient = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
    const { tokens } = await tempClient.getToken(code);
    if (!tokens.access_token) return null;
    return {
      access_token: tokens.access_token ?? undefined,
      refresh_token: tokens.refresh_token ?? undefined,
      expiry_date: tokens.expiry_date ?? undefined,
      scope: tokens.scope ?? undefined,
      token_type: tokens.token_type ?? undefined,
    };
  }

  async getGmailAddress(accessToken: string): Promise<string | null> {
    try {
      const tempAuth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );
      tempAuth.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: "v1", auth: tempAuth });
      const profile = await gmail.users.getProfile({ userId: "me" });
      return profile.data.emailAddress || null;
    } catch (error) {
      console.error("Failed to get Gmail address:", error);
      return null;
    }
  }
}

export const gmailProvider = new GmailProvider();
