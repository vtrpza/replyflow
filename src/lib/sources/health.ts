import type { SourceHealthResult } from "@/lib/sources/types";

interface ComputeHealthInput {
  fetchSucceeded: boolean;
  hadComplianceIssue: boolean;
  parseSuccessRatio: number;
  contactYieldRatio: number;
  latencyMs: number;
  minutesSinceSuccess: number;
  consecutiveFailures: number;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function computeSourceHealth(input: ComputeHealthInput): SourceHealthResult {
  const fetchReliability = input.fetchSucceeded ? clamp(100 - input.consecutiveFailures * 8) : clamp(40 - input.consecutiveFailures * 8);
  const freshnessPenalty = Math.min(input.minutesSinceSuccess / 18, 100);
  const freshness = clamp(100 - freshnessPenalty);
  const parsingQuality = clamp((input.parseSuccessRatio * 80) + (input.contactYieldRatio * 20));
  const compliance = input.hadComplianceIssue ? 30 : 100;
  const stability = clamp(100 - (input.latencyMs / 200));

  const weighted = (
    (fetchReliability * 0.25) +
    (freshness * 0.20) +
    (parsingQuality * 0.25) +
    (compliance * 0.20) +
    (stability * 0.10)
  );

  const score = clamp(Math.round(weighted));
  const status = score >= 80 ? "healthy" : score >= 55 ? "warning" : "critical";
  const throttleMinutes = status === "critical" ? 180 : status === "warning" ? 60 : 0;

  return {
    score,
    status,
    breakdown: {
      fetchReliability,
      freshness,
      parsingQuality,
      compliance,
      stability,
    },
    throttleMinutes,
  };
}
