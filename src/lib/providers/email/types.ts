export type EmailProviderName = "gmail" | "postmark" | "smtp" | "ses" | "outlook";

export interface SendEmailInput {
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    mimeType?: string;
  }>;
  threadId?: string;
  metadata?: Record<string, unknown>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  threadId?: string;
  provider: string;
  timestamp?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface RefreshTokenResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  error?: string;
}

export interface ListMessagesOptions {
  maxResults?: number;
  pageToken?: string;
  q?: string;
}

export interface ListMessagesResult {
  messages: Array<{ id: string; threadId?: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export interface MessageResult {
  id: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  raw?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{
      partId?: string;
      mimeType?: string;
      filename?: string;
      body?: { data?: string; size?: number };
    }>;
  };
}

export interface EmailProvider {
  readonly name: EmailProviderName;

  refreshToken(refreshToken: string): Promise<RefreshTokenResult>;

  send(input: SendEmailInput, accessToken: string): Promise<SendEmailResult>;

  listMessages?(accessToken: string, options?: ListMessagesOptions): Promise<ListMessagesResult>;

  getMessage?(accessToken: string, messageId: string): Promise<MessageResult>;
}

export interface ConnectedAccount {
  id: string;
  userId: string;
  provider: EmailProviderName;
  providerAccountId: string;
  emailAddress: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
  isDefault: boolean;
}
