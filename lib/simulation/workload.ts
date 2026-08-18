import { Officer } from "@/types";

/**
 * Splits `totalCases` evenly across `days`, deterministically. Any
 * remainder (totalCases not evenly divisible by days) is spread one
 * case per day across the first `remainder` days rather than dumped
 * onto a single day — dumping it all on the last day would create an
 * artificial single-day intake spike, which is especially distorting
 * for light workloads (e.g. 2 cases over 20 days would otherwise
 * arrive as "0 cases for 19 days, then 2 at once").
 */
export function distributeIncoming(totalCases: number, days: number): number[] {
  if (days <= 0) return [];
  if (totalCases <= 0) return new Array(days).fill(0);

  const base = Math.floor(totalCases / days);
  const remainder = totalCases - base * days;

  return Array.from({ length: days }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * Officers available for a given department, excluding anyone marked
 * unavailable for this simulation run (in addition to their normal
 * `available` flag from the officer roster).
 */
export function officersForDepartment(
  officers: Officer[],
  department: string,
  unavailableOfficerIds: string[]
): Officer[] {
  return officers.filter(
    (o) =>
      o.department === department &&
      o.available &&
      !unavailableOfficerIds.includes(o.id)
  );
}

/**
 * Deterministic daily throughput capacity for a stage: each available
 * officer can clear (1 / estimatedProcessingDays) cases per working
 * day at nominal working hours. Scaling by workingHoursPerDay/8 lets
 * "working hours per day" configuration actually move capacity, since
 * estimatedProcessingDays in WORKFLOW_TEMPLATES assumes an 8h day.
 */
export function stageCapacityPerDay(
  officerCount: number,
  estimatedProcessingDays: number,
  workingHoursPerDay: number
): number {
  if (estimatedProcessingDays <= 0) return 0;
  const hoursScale = workingHoursPerDay / 8;
  return officerCount * (1 / estimatedProcessingDays) * hoursScale;
}
