import type { SourceConnector, SourceRecord, SourceFetchResult } from "@/lib/sources/types";
import { SOURCE_POLICY } from "@/lib/sources/policy";

interface RecruiteeOffer {
  id: number;
  title: string;
  slug?: string;
  department?: string;
  location?: string;
  city?: string;
  country?: string;
  country_code?: string;
  remote?: boolean;
  hybrid?: boolean;
  on_site?: boolean;
  employment_type_code?: string;
  experience_code?: string;
  education_code?: string;
  min_hours?: number;
  max_hours?: number;
  salary?: string | null;
  status?: string;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
  description?: string;
  requirements?: string;
  tags?: string[];
  careers_url?: string;
  careers_apply_url?: string;
  company_name?: string;
}

interface RecruiteeResponse {
  offers?: RecruiteeOffer[];
}

function normalizeCompanySlug(source: SourceRecord): string {
  if (source.externalKey && source.externalKey.trim().length > 0) {
    return source.externalKey.trim();
  }
  if (source.repo && source.repo.trim().length > 0) {
    return source.repo.trim();
  }
  return source.fullName.replace(/^recruitee\//, "");
}

function isoOrNow(value: string | undefined): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export const recruiteeCareersConnector: SourceConnector = {
  type: "recruitee_careers",
  ...SOURCE_POLICY.recruitee_careers,
  async fetchJobs(source: SourceRecord, since?: string): Promise<SourceFetchResult> {
    const companySlug = normalizeCompanySlug(source);
    const started = Date.now();
    const url = `https://${encodeURIComponent(companySlug)}.recruitee.com/api/offers/`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ReplyFlow-SourceConnector/1.0",
      },
    });

    if (!res.ok) {
      throw new Error(`Recruitee API error (${res.status}) for ${companySlug}`);
    }

    const payload = (await res.json()) as RecruiteeResponse;
    const offers = (payload.offers || []).filter((o) => o.status === "published" || !o.status);
    const sinceTs = since ? Date.parse(since) : null;

    return {
      jobs: offers
        .filter((offer) => {
          if (!sinceTs) return true;
          const updatedTs = Date.parse(isoOrNow(offer.updated_at || offer.published_at));
          return !Number.isNaN(updatedTs) && updatedTs >= sinceTs;
        })
        .map((offer) => {
          const createdAt = isoOrNow(offer.published_at || offer.created_at);
          const updatedAt = isoOrNow(offer.updated_at || offer.published_at);

          const locationParts: string[] = [];
          if (offer.city) locationParts.push(offer.city);
          if (offer.country) locationParts.push(offer.country);
          if (offer.remote) locationParts.push("Remote");
          else if (offer.hybrid) locationParts.push("Hybrid");

          const labels: string[] = [];
          if (offer.department) labels.push(offer.department);
          if (offer.tags) labels.push(...offer.tags);
          if (offer.employment_type_code) labels.push(offer.employment_type_code);
          if (offer.experience_code) labels.push(offer.experience_code);

          const bodyParts: string[] = [];
          if (locationParts.length > 0) bodyParts.push(`Location: ${locationParts.join(", ")}`);
          if (offer.company_name) bodyParts.push(`Company: ${offer.company_name}`);
          if (offer.salary) bodyParts.push(`Salary: ${offer.salary}`);
          if (offer.description) bodyParts.push(offer.description);
          if (offer.requirements) bodyParts.push(offer.requirements);

          const careersUrl = offer.careers_url || `https://${companySlug}.recruitee.com/o/${offer.slug || offer.id}`;

          return {
            externalJobId: String(offer.id),
            issueUrl: careersUrl,
            issueNumber: offer.id,
            title: offer.title,
            body: bodyParts.filter(Boolean).join("\n\n"),
            labels,
            createdAt,
            updatedAt,
            posterUsername: "recruitee",
            posterAvatarUrl: null,
            commentsCount: 0,
            applyUrl: offer.careers_apply_url || careersUrl,
          };
        }),
      httpStatus: res.status,
      latencyMs: Date.now() - started,
    };
  },
};
