import { CaseType, Officer, Priority } from "@/types";

// There is no standalone "office" entity in the existing data model —
// an office IS the sequence of departments a given case type flows
// through (see lib/workflow/templates.ts WORKFLOW_TEMPLATES). So the
// simulator's "office" selector is the case type: choosing
// "land_compensation" simulates the Revenue → Land Records → Finance
// pipeline, exactly the offices real cases of that type actually pass
// through. This avoids inventing a fake office entity not backed by
// real data.
export type OfficeId = CaseType;

export interface ScenarioPreset {
  id: string;
  label: string;
  description: string;
  overrides: Partial<SimulationConfig>;
}

export interface SimulationConfig {
  office: OfficeId;
  /** Total incoming cases distributed evenly across the simulation duration. */
  incomingCases: number;
  /** Cases already queued at stage 0 before the simulation starts. */
  existingPendingCases: number;
  priorityDistribution: Record<Priority, number>; // proportions, should sum to ~1
  /** Officers unavailable for the whole run, by id. */
  unavailableOfficerIds: string[];
  slaHours: number;
  workingHoursPerDay: number;
  simulationDurationDays: number;
}

export interface StageDayState {
  stage: string;
  department: string;
  incoming: number;
  processed: number;
  queue: number;
  capacity: number;
  utilization: number; // processed-demand / capacity, capped display at callers' discretion
}

export interface DaySnapshot {
  day: number;
  stages: StageDayState[];
  casesCompleted: number;
  casesPending: number;
  cumulativeCompleted: number;
  cumulativeIncoming: number;
}

export type BottleneckSeverity = "low" | "medium" | "high";

export interface BottleneckResult {
  stage: string;
  department: string;
  severity: BottleneckSeverity;
  queueSize: number;
  utilization: number;
  reason: string;
}

export interface RecommendationResult {
  message: string;
  action: string;
  severity: BottleneckSeverity;
}

export interface SimulationMetrics {
  totalCases: number;
  casesProcessed: number;
  casesPending: number;
  casesCompleted: number;
  slaAtRisk: number;
  slaBreached: number;
  avgProcessingDays: number;
  avgWaitingDays: number;
  officerUtilization: number; // 0..1 across all involved officers
  availableOfficers: number;
  unavailableOfficers: number;
  overloadedOfficers: number;
  primaryBottleneck: BottleneckResult | null;
}

export interface SimulationResult {
  config: SimulationConfig;
  timeline: DaySnapshot[];
  metrics: SimulationMetrics;
  bottlenecks: BottleneckResult[];
  recommendations: RecommendationResult[];
}

export interface WhatIfComparison {
  baseline: SimulationResult;
  modified: SimulationResult;
  deltas: {
    casesPending: number;
    slaBreached: number;
    avgProcessingDays: number;
    officerUtilization: number;
  };
}

export interface OfficePool {
  officers: Officer[];
}
