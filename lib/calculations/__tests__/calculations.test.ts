import { describe, it, expect } from "vitest";
import { isOfficerEligible } from "../eligibility";
import { scoreOfficer, recommendOfficer } from "../officerScore";
import { calculateSLARisk } from "../slaRisk";
import { simulateOfficerUnavailable } from "../whatIf";
import { validateDocuments } from "@/lib/workflow/templates";
import { Officer, WorkflowStep, CaseRecord } from "@/types";

const baseStep: WorkflowStep = {
  id: "s1",
  case_id: "c1",
  step_name: "Finance Verification",
  department: "Finance",
  step_order: 4,
  status: "pending",
  assigned_officer_id: null,
  estimated_processing_days: 2,
  required_skill: "finance_verification",
  required_authority: "finance_verification",
};

function makeOfficer(overrides: Partial<Officer> = {}): Officer {
  return {
    id: "o1",
    name: "Test Officer",
    department: "Finance",
    skills: ["finance_verification"],
    authority: ["finance_verification"],
    current_load: 10,
    max_load: 50,
    avg_processing_days: 2,
    available: true,
    ...overrides,
  };
}

describe("isOfficerEligible", () => {
  it("rejects wrong department", () => {
    const result = isOfficerEligible(makeOfficer({ department: "Revenue" }), baseStep);
    expect(result.eligible).toBe(false);
  });

  it("rejects missing skill and authority", () => {
    const result = isOfficerEligible(makeOfficer({ skills: [], authority: [] }), baseStep);
    expect(result.eligible).toBe(false);
  });

  it("rejects unavailable officer", () => {
    const result = isOfficerEligible(makeOfficer({ available: false }), baseStep);
    expect(result.eligible).toBe(false);
  });

  it("accepts a valid officer", () => {
    const result = isOfficerEligible(makeOfficer(), baseStep);
    expect(result.eligible).toBe(true);
  });

  it("rejects an officer at max capacity", () => {
    const result = isOfficerEligible(makeOfficer({ current_load: 50, max_load: 50 }), baseStep);
    expect(result.eligible).toBe(false);
  });
});

describe("scoreOfficer", () => {
  it("scores lower workload higher, all else equal", () => {
    const light = scoreOfficer(makeOfficer({ current_load: 5 }), baseStep);
    const heavy = scoreOfficer(makeOfficer({ current_load: 45 }), baseStep);
    expect(light.score).toBeGreaterThan(heavy.score);
  });

  it("scores faster processing higher, all else equal", () => {
    const fast = scoreOfficer(makeOfficer({ avg_processing_days: 0.5 }), baseStep);
    const slow = scoreOfficer(makeOfficer({ avg_processing_days: 4 }), baseStep);
    expect(fast.score).toBeGreaterThan(slow.score);
  });
});

describe("recommendOfficer", () => {
  it("never selects an unavailable officer", () => {
    const officers = [
      makeOfficer({ id: "unavailable", available: false, current_load: 1, avg_processing_days: 0.1 }),
      makeOfficer({ id: "available", current_load: 40, avg_processing_days: 3 }),
    ];
    const rec = recommendOfficer(officers, baseStep);
    expect(rec?.officer.id).toBe("available");
  });

  it("returns null when no officer is eligible", () => {
    const officers = [makeOfficer({ department: "Revenue" })];
    const rec = recommendOfficer(officers, baseStep);
    expect(rec).toBeNull();
  });

  it("can exclude a specific officer id (used by simulation)", () => {
    const officers = [
      makeOfficer({ id: "best", current_load: 1 }),
      makeOfficer({ id: "second", current_load: 20 }),
    ];
    const rec = recommendOfficer(officers, baseStep, "best");
    expect(rec?.officer.id).toBe("second");
  });
});

describe("calculateSLARisk", () => {
  const base = { slaHours: 72, queueLength: 0, priority: "low" as const };

  it("increases risk as elapsed time increases", () => {
    const early = calculateSLARisk({ ...base, createdAt: new Date(), now: new Date() });
    const later = calculateSLARisk({
      ...base,
      createdAt: new Date(Date.now() - 60 * 60 * 60 * 1000),
      now: new Date(),
    });
    expect(later.percentage).toBeGreaterThan(early.percentage);
  });

  it("increases risk with queue length", () => {
    const now = new Date();
    const shortQueue = calculateSLARisk({ ...base, createdAt: now, now, queueLength: 2 });
    const longQueue = calculateSLARisk({ ...base, createdAt: now, now, queueLength: 20 });
    expect(longQueue.percentage).toBeGreaterThan(shortQueue.percentage);
  });

  it("high priority increases risk over low priority, all else equal", () => {
    const now = new Date();
    const low = calculateSLARisk({ ...base, createdAt: now, now, priority: "low" });
    const high = calculateSLARisk({ ...base, createdAt: now, now, priority: "high" });
    expect(high.percentage).toBeGreaterThan(low.percentage);
  });

  it("never exceeds 100", () => {
    const risk = calculateSLARisk({
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1000),
      slaHours: 1,
      queueLength: 999,
      priority: "high",
    });
    expect(risk.percentage).toBeLessThanOrEqual(100);
  });
});

describe("simulateOfficerUnavailable", () => {
  const caseData: CaseRecord = {
    id: "c1",
    case_number: "GF-TEST",
    case_type: "land_compensation",
    applicant_name: "Test Applicant",
    district: "Test District",
    priority: "high",
    sla_hours: 72,
    status: "pending",
    current_step: 4,
    summary: "test",
    extracted_data: {},
    created_at: new Date().toISOString(),
  };

  it("excludes the unavailable officer from the after-recommendation", () => {
    const officers = [
      makeOfficer({ id: "current", current_load: 5 }),
      makeOfficer({ id: "backup", current_load: 20 }),
    ];
    const result = simulateOfficerUnavailable({
      currentOfficerId: "current",
      officers,
      step: baseStep,
      caseData,
    });
    expect(result.before?.officer.id).toBe("current");
    expect(result.after?.officer.id).toBe("backup");
  });

  it("does not mutate the original officers array", () => {
    const officers = [makeOfficer({ id: "current" }), makeOfficer({ id: "backup" })];
    const snapshot = JSON.stringify(officers);
    simulateOfficerUnavailable({ currentOfficerId: "current", officers, step: baseStep, caseData });
    expect(JSON.stringify(officers)).toBe(snapshot);
  });
});

describe("validateDocuments", () => {
  it("detects missing documents", () => {
    const result = validateDocuments("land_compensation", [
      "application_form",
      "id_proof",
      "land_record",
      "bank_details",
    ]);
    expect(result.complete).toBe(false);
    expect(result.missing).toEqual(["acquisition_order"]);
  });

  it("passes when all required documents are present", () => {
    const result = validateDocuments("land_compensation", [
      "application_form",
      "id_proof",
      "land_record",
      "bank_details",
      "acquisition_order",
    ]);
    expect(result.complete).toBe(true);
    expect(result.missing).toEqual([]);
  });
});
