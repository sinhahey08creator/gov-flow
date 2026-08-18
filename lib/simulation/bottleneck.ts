import { BottleneckResult, BottleneckSeverity, StageDayState } from "./types";

function severityFor(utilization: number): BottleneckSeverity | null {
  if (utilization >= 1.2) return "high";
  if (utilization >= 0.9) return "medium";
  if (utilization >= 0.7) return "low";
  return null;
}

/**
 * Looks at a stage's final-day utilization/queue and decides whether it
 * qualifies as a bottleneck. Utilization here is demand ÷ capacity for
 * that day (see queue.ts) — >1 means the stage fell further behind
 * that day, not just that it was "full".
 */
export function detectStageBottleneck(stage: StageDayState): BottleneckResult | null {
  const severity = severityFor(stage.utilization);
  if (!severity) return null;

  const reason =
    stage.utilization >= 1.2
      ? "Incoming demand significantly exceeds available processing capacity"
      : stage.utilization >= 0.9
      ? "Demand exceeds available processing capacity"
      : "Approaching capacity limits";

  return {
    stage: stage.stage,
    department: stage.department,
    severity,
    queueSize: Math.round(stage.queue),
    utilization: Math.round(stage.utilization * 100) / 100,
    reason,
  };
}

/**
 * Runs bottleneck detection across every stage on the final simulated
 * day (the most representative steady-state snapshot), sorted worst
 * first so bottlenecks[0] is always the primary bottleneck.
 */
export function detectBottlenecks(finalDayStages: StageDayState[]): BottleneckResult[] {
  const severityRank: Record<BottleneckSeverity, number> = { high: 3, medium: 2, low: 1 };

  return finalDayStages
    .map(detectStageBottleneck)
    .filter((b): b is BottleneckResult => b !== null)
    .sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || b.utilization - a.utilization);
}
