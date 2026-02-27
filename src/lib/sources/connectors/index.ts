import { githubIssuesConnector } from "@/lib/sources/connectors/github-issues";
import { greenhouseBoardConnector } from "@/lib/sources/connectors/greenhouse-board";
import { leverPostingsConnector } from "@/lib/sources/connectors/lever-postings";
import type { SourceType } from "@/lib/types";
import type { SourceConnector } from "@/lib/sources/types";

const CONNECTORS: Record<SourceType, SourceConnector> = {
  github_repo: githubIssuesConnector,
  greenhouse_board: greenhouseBoardConnector,
  lever_postings: leverPostingsConnector,
};

export function getSourceConnector(type: SourceType): SourceConnector {
  return CONNECTORS[type];
}
