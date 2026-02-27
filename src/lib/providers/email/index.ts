import type { EmailProvider, EmailProviderName } from "./types";
import { gmailProvider } from "./gmail/provider";

const providers: Partial<Record<EmailProviderName, EmailProvider>> = {
  gmail: gmailProvider,
};

export function getEmailProvider(name: EmailProviderName): EmailProvider {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Email provider "${name}" is not supported`);
  }
  return provider;
}

export function getSupportedProviders(): EmailProviderName[] {
  return Object.keys(providers) as EmailProviderName[];
}

export { gmailProvider };
export type { EmailProvider, SendEmailInput, SendEmailResult, RefreshTokenResult } from "./types";
