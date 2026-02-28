import type { SourceType } from "@/lib/types";

export interface SourcePolicy {
  attributionLabel: string;
  attributionUrl: string;
  termsUrl: string;
}

export const SOURCE_POLICY: Record<SourceType, SourcePolicy> = {
  github_repo: {
    attributionLabel: "GitHub Issues",
    attributionUrl: "https://docs.github.com/en/rest/issues/issues#list-repository-issues",
    termsUrl: "https://docs.github.com/en/site-policy/github-terms/github-terms-of-service",
  },
  greenhouse_board: {
    attributionLabel: "Greenhouse Job Board API",
    attributionUrl: "https://developers.greenhouse.io/job-board.html",
    termsUrl: "https://www.greenhouse.com/uk/legal/master-subscription-agreement",
  },
  lever_postings: {
    attributionLabel: "Lever Postings API",
    attributionUrl: "https://github.com/lever/postings-api",
    termsUrl: "https://www.lever.co/terms",
  },
  ashby_board: {
    attributionLabel: "Ashby Job Board API",
    attributionUrl: "https://developers.ashbyhq.com/docs/public-job-posting-api",
    termsUrl: "https://www.ashbyhq.com/terms-of-service",
  },
  workable_widget: {
    attributionLabel: "Workable Widget API",
    attributionUrl: "https://developers.workable.com/",
    termsUrl: "https://www.workable.com/terms",
  },
  recruitee_careers: {
    attributionLabel: "Recruitee Careers Site API",
    attributionUrl: "https://docs.recruitee.com/reference/offers",
    termsUrl: "https://recruitee.com/en/terms",
  },
};
