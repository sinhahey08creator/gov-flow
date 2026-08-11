import { Officer, WorkflowStep, EligibilityResult } from "@/types";

export function isOfficerEligible(
  officer: Officer,
  step: WorkflowStep
): EligibilityResult {
  const reasons: string[] = [];
  let eligible = true;

  if (officer.department !== step.department) {
    eligible = false;
    reasons.push(`Wrong department (${officer.department} ≠ ${step.department})`);
    return { eligible, reasons };
  }
  reasons.push("Correct department");

  const hasSkill = step.required_skill
    ? officer.skills.includes(step.required_skill)
    : true;
  const hasAuthority = step.required_authority
    ? officer.authority.includes(step.required_authority)
    : true;

  if (!hasSkill && !hasAuthority) {
    eligible = false;
    reasons.push("Missing required skill or authority");
    return { eligible, reasons };
  }
  if (hasSkill) reasons.push("Has required skill");
  if (hasAuthority) reasons.push("Has required authority");

  if (!officer.available) {
    eligible = false;
    reasons.push("Currently unavailable");
    return { eligible, reasons };
  }
  reasons.push("Currently available");

  if (officer.current_load >= officer.max_load) {
    eligible = false;
    reasons.push("At maximum capacity");
    return { eligible, reasons };
  }

  return { eligible, reasons };
}
