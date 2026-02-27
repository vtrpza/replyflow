export type ContactPlan = "free" | "pro";
export type ContactVisibility = "full" | "masked";

interface ContactCustomFields {
  jobSyncUnlockedAt?: string | null;
  jobSyncUnlockSource?: string | null;
}

function parseCustomFields(customFields: string | null | undefined): ContactCustomFields {
  if (!customFields) {
    return {};
  }

  try {
    const parsed = JSON.parse(customFields) as Record<string, unknown>;
    return {
      jobSyncUnlockedAt:
        typeof parsed.jobSyncUnlockedAt === "string" ? parsed.jobSyncUnlockedAt : null,
      jobSyncUnlockSource:
        typeof parsed.jobSyncUnlockSource === "string" ? parsed.jobSyncUnlockSource : null,
    };
  } catch {
    return {};
  }
}

export function isJobSyncContact(source: string | null | undefined): boolean {
  return source === "job_sync";
}

export function isJobSyncUnlocked(customFields: string | null | undefined): boolean {
  const parsed = parseCustomFields(customFields);
  return !!parsed.jobSyncUnlockedAt;
}

export function getContactVisibility(input: {
  plan: ContactPlan;
  source: string | null | undefined;
  customFields: string | null | undefined;
}): ContactVisibility {
  if (input.plan === "pro") {
    return "full";
  }

  if (!isJobSyncContact(input.source)) {
    return "full";
  }

  return isJobSyncUnlocked(input.customFields) ? "full" : "masked";
}

export function maskContactEmail(email: string | null | undefined): string | null {
  if (!email) {
    return null;
  }

  const at = email.indexOf("@");
  if (at <= 0) {
    return "***";
  }

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const domainDot = domain.indexOf(".");

  const maskedLocal = local.length <= 1 ? `${local[0] || "*"}***` : `${local[0]}***`;
  if (domainDot <= 0) {
    return `${maskedLocal}@***`;
  }

  const domainName = domain.slice(0, domainDot);
  const domainTld = domain.slice(domainDot);
  const maskedDomain = domainName.length <= 1 ? `${domainName[0] || "*"}***` : `${domainName[0]}***`;

  return `${maskedLocal}@${maskedDomain}${domainTld}`;
}

export function withJobSyncUnlock(
  customFields: string | null | undefined,
  unlockSource: string
): string {
  const parsed = parseCustomFields(customFields);
  const next: ContactCustomFields = {
    ...parsed,
    jobSyncUnlockedAt: new Date().toISOString(),
    jobSyncUnlockSource: unlockSource,
  };
  return JSON.stringify(next);
}
