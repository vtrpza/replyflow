import { githubIssuesConnector } from "@/lib/sources/connectors/github-issues";
import { greenhouseBoardConnector } from "@/lib/sources/connectors/greenhouse-board";
import { leverPostingsConnector } from "@/lib/sources/connectors/lever-postings";
import { ashbyBoardConnector } from "@/lib/sources/connectors/ashby-board";
import { workableWidgetConnector } from "@/lib/sources/connectors/workable-widget";
import { recruiteeCareersConnector } from "@/lib/sources/connectors/recruitee-careers";
import type { SourceType } from "@/lib/types";
import type { SourceConnector } from "@/lib/sources/types";

const CONNECTORS: Record<SourceType, SourceConnector> = {
  github_repo: githubIssuesConnector,
  greenhouse_board: greenhouseBoardConnector,
  lever_postings: leverPostingsConnector,
  ashby_board: ashbyBoardConnector,
  workable_widget: workableWidgetConnector,
  recruitee_careers: recruiteeCareersConnector,
};

export function getSourceConnector(type: SourceType): SourceConnector {
  return CONNECTORS[type];
}
