import { Officer, Priority } from "@/types";
import { WORKFLOW_TEMPLATES } from "@/lib/workflow/templates";
import { distributeIncoming, officersForDepartment, stageCapacityPerDay } from "./workload";
import { tickQueue } from "./queue";
import { detectBottlenecks } from "./bottleneck";
import {
  BottleneckResult,
  DaySnapshot,
  RecommendationResult,
  SimulationConfig,
  SimulationMetrics,
  SimulationResult,
  StageDayState,
  WhatIfComparison,
} from "./types";

const PRIORITY_TIME_FACTOR: Record<Priority, number> = {
  high: 0.7,
  medium: 1.0,
  low: 1.3,
};

export function defaultConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    office: "land_compensation",
    incomingCases: 20,
    existingPendingCases: 0,
    priorityDistribution: { high: 0.2, medium: 0.5, low: 0.3 },
    unavailableOfficerIds: [],
    slaHours: 72,
    workingHoursPerDay: 8,
    simulationDurationDays: 10,
    ...overrides,
  };
}

export function validateConfig(config: SimulationConfig): string[] {
  const errors: string[] = [];
  if (config.incomingCases < 0) errors.push("Incoming cases cannot be negative.");
  if (config.existingPendingCases < 0) errors.push("Existing pending cases cannot be negative.");
  if (config.slaHours <= 0) errors.push("SLA hours must be greater than zero.");
  if (config.workingHoursPerDay <= 0 || config.workingHoursPerDay > 24) {
    errors.push("Working hours per day must be between 1 and 24.");
  }
  if (config.simulationDurationDays <= 0) errors.push("Simulation duration must be at least 1 day.");
  const distSum = Object.values(config.priorityDistribution).reduce((a, b) => a + b, 0);
  if (Math.abs(distSum - 1) > 0.05) errors.push("Priority distribution must sum to 1.");
  return errors;
}

/**
 * Runs the full deterministic simulation and returns both the full
 * day-by-day timeline (for playback) and the aggregated final metrics
 * (for the summary/comparison views). No randomness anywhere — same
 * config always produces the exact same result, which is what makes
 * this testable and what-if comparisons meaningful.
 */
export function runSimulation(config: SimulationConfig, officers: Officer[]): SimulationResult {
  const template = WORKFLOW_TEMPLATES[config.office] ?? [];
  const dailyIncoming = distributeIncoming(config.incomingCases, config.simulationDurationDays);

  // One queue per stage, carried across days. Stage 0 starts with any
  // pre-existing pending cases; downstream stages start empty.
  const queues = template.map((_, i) => (i === 0 ? config.existingPendingCases : 0));

  const timeline: DaySnapshot[] = [];
  let cumulativeCompleted = 0;
  let cumulativeIncoming = 0;
  let cumulativePendingSum = 0; // for Little's Law: W = L / throughput

  for (let day = 1; day <= config.simulationDurationDays; day++) {
    const incomingToday = dailyIncoming[day - 1] ?? 0;
    cumulativeIncoming += incomingToday;

    const stageStates: StageDayState[] = [];
    let flowIntoStage = incomingToday;

    template.forEach((stageDef, i) => {
      const eligibleOfficers = officersForDepartment(
        officers,
        stageDef.department,
        config.unavailableOfficerIds
      );
      const capacity = stageCapacityPerDay(
        eligibleOfficers.length,
        stageDef.estimated_processing_days,
        config.workingHoursPerDay
      );

      const { processed, newQueue, utilization } = tickQueue(queues[i], flowIntoStage, capacity);

      queues[i] = newQueue;
      stageStates.push({
        stage: stageDef.name,
        department: stageDef.department,
        incoming: flowIntoStage,
        processed,
        queue: newQueue,
        capacity,
        utilization: Number.isFinite(utilization) ? utilization : 999,
      });

      // What this stage finished today becomes tomorrow's-same-day
      // input to the next stage — models a same-day pipeline handoff.
      flowIntoStage = processed;
    });

    const casesCompleted = template.length > 0 ? stageStates[stageStates.length - 1].processed : 0;
    cumulativeCompleted += casesCompleted;

    const casesPending = queues.reduce((sum, q) => sum + q, 0);
    cumulativePendingSum += casesPending;

    timeline.push({
      day,
      stages: stageStates,
      casesCompleted,
      casesPending,
      cumulativeCompleted,
      cumulativeIncoming,
    });
  }

  const metrics = computeMetrics(config, officers, template, timeline, cumulativePendingSum);
  const finalDayStages = timeline[timeline.length - 1]?.stages ?? [];
  const bottlenecks = detectBottlenecks(finalDayStages);
  const recommendations = generateRecommendations(bottlenecks, metrics, config);

  return { config, timeline, metrics, bottlenecks, recommendations };
}

function computeMetrics(
  config: SimulationConfig,
  officers: Officer[],
  template: { department: string; estimated_processing_days: number }[],
  timeline: DaySnapshot[],
  cumulativePendingSum: number
): SimulationMetrics {
  const totalCases = config.existingPendingCases + config.incomingCases;
  const last = timeline[timeline.length - 1];
  const casesPending = last?.casesPending ?? 0;
  const casesCompleted = last?.cumulativeCompleted ?? 0;
  const casesProcessed = casesCompleted; // cases fully through the pipeline

  const throughputPerDay = casesCompleted / config.simulationDurationDays;
  // Little's Law: average time in system = average queue length / throughput.
  const avgPendingAcrossDays = cumulativePendingSum / config.simulationDurationDays;
  const baseNominalPipelineDays = template.reduce((s, t) => s + t.estimated_processing_days, 0);

  const avgProcessingDays =
    throughputPerDay > 0
      ? Math.round((avgPendingAcrossDays / throughputPerDay) * 100) / 100
      : baseNominalPipelineDays;
  const avgWaitingDays = Math.max(0, Math.round((avgProcessingDays - baseNominalPipelineDays) * 100) / 100);

  const thresholdDays = config.slaHours / 24;
  let slaBreached = 0;
  let slaAtRisk = 0;
  (Object.keys(config.priorityDistribution) as Priority[]).forEach((priority) => {
    const share = config.priorityDistribution[priority] ?? 0;
    const adjustedTime = avgProcessingDays * PRIORITY_TIME_FACTOR[priority];
    const affected = casesPending * share;
    if (adjustedTime > thresholdDays) {
      slaBreached += affected;
    } else if (adjustedTime > thresholdDays * 0.7) {
      slaAtRisk += affected;
    }
  });

  const involvedDepartments = new Set(template.map((t) => t.department));
  const involvedOfficers = officers.filter((o) => involvedDepartments.has(o.department));
  const unavailableOfficers = involvedOfficers.filter(
    (o) => !o.available || config.unavailableOfficerIds.includes(o.id)
  ).length;
  const availableOfficers = involvedOfficers.length - unavailableOfficers;

  const finalStages = last?.stages ?? [];
  const overloadedOfficers = finalStages.reduce((sum, s) => {
    if (s.utilization <= 1) return sum;
    const deptOfficers = officersForDepartment(officers, s.department, config.unavailableOfficerIds);
    return sum + deptOfficers.length;
  }, 0);

  const utilizationSamples = finalStages.filter((s) => s.capacity > 0).map((s) => Math.min(s.utilization, 1));
  const officerUtilization =
    utilizationSamples.length > 0
      ? Math.round((utilizationSamples.reduce((a, b) => a + b, 0) / utilizationSamples.length) * 100) / 100
      : 0;

  const bottlenecks = detectBottlenecks(finalStages);

  return {
    totalCases,
    casesProcessed,
    casesPending: Math.round(casesPending),
    casesCompleted: Math.round(casesCompleted),
    slaAtRisk: Math.round(slaAtRisk),
    slaBreached: Math.round(slaBreached),
    avgProcessingDays,
    avgWaitingDays,
    officerUtilization,
    availableOfficers,
    unavailableOfficers,
    overloadedOfficers,
    primaryBottleneck: bottlenecks[0] ?? null,
  };
}

export function generateRecommendations(
  bottlenecks: BottleneckResult[],
  metrics: SimulationMetrics,
  config: SimulationConfig
): RecommendationResult[] {
  const recommendations: RecommendationResult[] = [];

  bottlenecks.forEach((b) => {
    if (b.severity === "high") {
      recommendations.push({
        severity: "high",
        message: `${b.stage} is operating at ${Math.round(b.utilization * 100)}% of capacity with a queue of ${b.queueSize}.`,
        action: `Reassign or add officers to ${b.department} to relieve ${b.stage}.`,
      });
    } else if (b.severity === "medium") {
      recommendations.push({
        severity: "medium",
        message: `${b.stage} is approaching capacity (${Math.round(b.utilization * 100)}%).`,
        action: `Monitor ${b.department} closely; consider redistributing workload if volume grows.`,
      });
    }
  });

  if (metrics.availableOfficers === 0 && metrics.totalCases > 0) {
    recommendations.push({
      severity: "high",
      message: "No available officers remain for this pipeline.",
      action: "Restore at least one officer's availability before cases can be processed.",
    });
  }

  if (metrics.slaBreached > 0) {
    recommendations.push({
      severity: "high",
      message: `${metrics.slaBreached} case(s) are projected to breach the ${config.slaHours}h SLA.`,
      action: "Increase capacity at the primary bottleneck or reduce incoming case volume.",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      severity: "low",
      message: "The office is operating within capacity for this configuration.",
      action: "No immediate action needed.",
    });
  }

  return recommendations;
}

export function runWhatIf(
  baselineConfig: SimulationConfig,
  modifiedConfig: SimulationConfig,
  officers: Officer[]
): WhatIfComparison {
  const baseline = runSimulation(baselineConfig, officers);
  const modified = runSimulation(modifiedConfig, officers);

  return {
    baseline,
    modified,
    deltas: {
      casesPending: modified.metrics.casesPending - baseline.metrics.casesPending,
      slaBreached: modified.metrics.slaBreached - baseline.metrics.slaBreached,
      avgProcessingDays:
        Math.round((modified.metrics.avgProcessingDays - baseline.metrics.avgProcessingDays) * 100) / 100,
      officerUtilization:
        Math.round((modified.metrics.officerUtilization - baseline.metrics.officerUtilization) * 100) / 100,
    },
  };
}
