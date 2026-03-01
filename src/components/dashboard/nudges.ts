export interface Nudge {
  key: string;
  icon: "alert" | "info" | "success";
  textEn: string;
  textPt: string;
  href: string;
}

interface NudgeStats {
  totalReposMonitored: number;
  newJobsThisWeek: number;
  outreachDrafted: number;
  matchScoreLastCalculated: string | null;
  outreachSentOnly: number;
  outreachReplied: number;
  totalInterviews: number;
  outreachInterviewing: number;
  outreachAccepted: number;
}

export function computeNudges(stats: NudgeStats): Nudge[] {
  const nudges: Nudge[] = [];

  if (stats.totalReposMonitored === 0) {
    nudges.push({
      key: "no-sources",
      icon: "alert",
      textEn: "Connect your first source",
      textPt: "Conecte sua primeira fonte",
      href: "/app/sources",
    });
  }

  if (stats.newJobsThisWeek > 0) {
    nudges.push({
      key: "new-jobs",
      icon: "alert",
      textEn: `${stats.newJobsThisWeek} new jobs — Review matches`,
      textPt: `${stats.newJobsThisWeek} novas vagas — Revisar matches`,
      href: "/app/jobs",
    });
  }

  if (stats.outreachDrafted > 0) {
    nudges.push({
      key: "drafts-ready",
      icon: "alert",
      textEn: `${stats.outreachDrafted} drafts ready to send`,
      textPt: `${stats.outreachDrafted} rascunhos prontos para enviar`,
      href: "/app/compose",
    });
  }

  if (!stats.matchScoreLastCalculated) {
    nudges.push({
      key: "signals-stale",
      icon: "info",
      textEn: "Recalculate match signals",
      textPt: "Recalcular sinais de match",
      href: "#recalculate",
    });
  }

  if (stats.outreachSentOnly > 0) {
    nudges.push({
      key: "follow-up",
      icon: "info",
      textEn: `${stats.outreachSentOnly} sent — follow up`,
      textPt: `${stats.outreachSentOnly} enviados — fazer follow-up`,
      href: "/app/outreach",
    });
  }

  if (stats.outreachReplied > 0) {
    nudges.push({
      key: "replies",
      icon: "success",
      textEn: `${stats.outreachReplied} replies — check conversations`,
      textPt: `${stats.outreachReplied} respostas — ver conversas`,
      href: "/app/history",
    });
  }

  const interviews = stats.outreachInterviewing + stats.outreachAccepted;
  if (interviews > 0) {
    nudges.push({
      key: "interviews",
      icon: "success",
      textEn: `You have ${interviews} interview${interviews > 1 ? "s" : ""}!`,
      textPt: `Você tem ${interviews} entrevista${interviews > 1 ? "s" : ""}!`,
      href: "/app/history",
    });
  }

  return nudges.slice(0, 3);
}
