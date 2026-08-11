import { Officer, WorkflowStep, CaseRecord, WhatIfResult } from "@/types";
import { recommendOfficer } from "./officerScore";
import { calculateSLARisk } from "./slaRisk";

/**
 * "What happens if the assigned officer becomes unavailable?"
 * Pure function — does not mutate the database. Caller decides whether
 * to persist the result (only on explicit "Apply Recommendation").
 */
export function simulateOfficerUnavailable(params: {
  currentOfficerId: string | null;
  officers: Officer[];
  step: WorkflowStep;
  caseData: CaseRecord;
}): WhatIfResult {
  const { currentOfficerId, officers, step, caseData } = params;

  const before = recommendOfficer(officers, step);

  const officersWithSimulatedUnavailability = officers.map((o) =>
    o.id === currentOfficerId ? { ...o, available: false } : o
  );

  const after = recommendOfficer(
    officersWithSimulatedUnavailability,
    step,
    undefined
  );

  const slaRiskBefore = calculateSLARisk({
    createdAt: caseData.created_at,
    slaHours: caseData.sla_hours,
    queueLength: step.queue_length ?? 0,
    priority: caseData.priority,
  });

  // If the after-officer has higher load/slower processing, queue pressure
  // rises proportionally — reflected via a slightly inflated queue length.
  const queuePressureBump = after && before ? 2 : 0;
  const slaRiskAfter = calculateSLARisk({
    createdAt: caseData.created_at,
    slaHours: caseData.sla_hours,
    queueLength: (step.queue_length ?? 0) + queuePressureBump,
    priority: caseData.priority,
  });

  return { before, after, slaRiskBefore, slaRiskAfter };
}
