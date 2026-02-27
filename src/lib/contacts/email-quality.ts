export type EmailQualityReason =
  | "empty"
  | "invalid_format"
  | "blocked_pattern"
  | "noreply"
  | "generic_local_part"
  | "generic_domain"
  | "accommodation";

const BLOCKED_LOCAL_PARTS = [
  "noreply",
  "no-reply",
  "do-not-reply",
  "donotreply",
  "support",
  "suporte",
  "help",
  "helpdesk",
  "admin",
  "info",
  "contact",
  "contato",
  "jobs",
  "careers",
  "career",
  "vagas",
  "talent",
  "talents",
  "recruiting",
  "recruitment",
  "rh",
  "atendimento",
  "faleconosco",
];

const BLOCKED_DOMAIN_PARTS = [
  "noreply",
  "no-reply",
  "notifications",
  "notification",
  "support",
  "help",
  "donotreply",
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function hasBlockedPart(value: string, blocked: string[]): boolean {
  return blocked.some((part) => value.includes(part));
}

export function getEmailQualityReason(email: string | null | undefined): EmailQualityReason | null {
  const normalized = normalize(email || "");
  if (!normalized) {
    return "empty";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return "invalid_format";
  }

  const [localPart, domain] = normalized.split("@");
  if (!localPart || !domain) {
    return "invalid_format";
  }

  if (localPart.includes("accommodation") || domain.includes("accommodation")) {
    return "accommodation";
  }

  if (localPart.includes("noreply") || localPart.includes("no-reply")) {
    return "noreply";
  }

  if (hasBlockedPart(localPart, BLOCKED_LOCAL_PARTS)) {
    return "generic_local_part";
  }

  if (hasBlockedPart(domain, BLOCKED_DOMAIN_PARTS)) {
    return "generic_domain";
  }

  if (/@github\.com$/i.test(normalized)) {
    return "blocked_pattern";
  }

  return null;
}

export function isDirectContactEmail(email: string | null | undefined): boolean {
  return getEmailQualityReason(email) === null;
}
