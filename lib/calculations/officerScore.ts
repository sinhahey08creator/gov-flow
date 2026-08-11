import { Officer, WorkflowStep, OfficerRecommendation, ScoreBreakdown } from "@/types";
import { isOfficerEligible } from "./eligibility";

/**
 * Deterministic officer scoring. No LLM involved.
 * Note: availability is already a hard eligibility gate, so every officer
 * scored here is available — the availability term is kept as a constant
 * bonus (not a penalty branch) since an unavailable officer never reaches
 * this function.
 */
export function scoreOfficer(
  officer: Officer,
  step: WorkflowStep
): { score: number; breakdown: ScoreBreakdown } {
  const hasAuthority = step.required_authority
    ? officer.authority.includes(step.required_authority)
    : false;
  const hasSkill = step.required_skill
    ? officer.skills.includes(step.required_skill)
    : false;

  const authority = hasAuthority ? 3 : 0;
  const skill = hasSkill ? 2 : 0;
  const availability = 2; // officer already confirmed available by eligibility gate
  const workloadPenalty = (officer.current_load / officer.max_load) * 3;
  const processingPenalty = officer.avg_processing_days * 1.5;

  const score =
    authority + skill + availability - workloadPenalty - processingPenalty;

  return {
    score: Math.round(score * 100) / 100,
    breakdown: {
      authority,
      skill,
      availability,
      workloadPenalty: Math.round(workloadPenalty * 100) / 100,
      processingPenalty: Math.round(processingPenalty * 100) / 100,
    },
  };
}

export function recommendOfficer(
  officers: Officer[],
  step: WorkflowStep,
  excludeOfficerId?: string
): OfficerRecommendation | null {
  const candidates = officers
    .filter((o) => o.id !== excludeOfficerId)
    .map((o) => ({ officer: o, eligibility: isOfficerEligible(o, step) }))
    .filter((c) => c.eligibility.eligible);

  if (candidates.length === 0) return null;

  const scored = candidates.map(({ officer, eligibility }) => {
    const { score, breakdown } = scoreOfficer(officer, step);
    return { officer, score, breakdown, reasons: eligibility.reasons };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}
