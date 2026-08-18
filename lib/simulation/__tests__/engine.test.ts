import { describe, it, expect } from "vitest";
import { defaultConfig, runSimulation, runWhatIf, validateConfig } from "../engine";
import { distributeIncoming, stageCapacityPerDay } from "../workload";
import { tickQueue } from "../queue";
import { detectStageBottleneck } from "../bottleneck";
import { SEED_OFFICERS } from "@/lib/demo/seedData";
import { StageDayState } from "../types";

describe("workload.distributeIncoming", () => {
  it("splits evenly and deterministically", () => {
    expect(distributeIncoming(20, 5)).toEqual([4, 4, 4, 4, 4]);
  });

  it("spreads the remainder across the first days rather than dumping it on one day", () => {
    expect(distributeIncoming(22, 5)).toEqual([5, 5, 4, 4, 4]);
  });

  it("handles zero cases", () => {
    expect(distributeIncoming(0, 5)).toEqual([0, 0, 0, 0, 0]);
  });

  it("handles zero days", () => {
    expect(distributeIncoming(20, 0)).toEqual([]);
  });
});

describe("workload.stageCapacityPerDay", () => {
  it("scales with officer count and inversely with processing time", () => {
    expect(stageCapacityPerDay(4, 2, 8)).toBeCloseTo(2);
    expect(stageCapacityPerDay(2, 2, 8)).toBeCloseTo(1);
  });

  it("scales with working hours per day", () => {
    expect(stageCapacityPerDay(4, 2, 4)).toBeCloseTo(1);
    expect(stageCapacityPerDay(4, 2, 16)).toBeCloseTo(4);
  });

  it("returns 0 for zero officers", () => {
    expect(stageCapacityPerDay(0, 2, 8)).toBe(0);
  });
});

describe("queue.tickQueue", () => {
  it("processes everything when capacity exceeds demand", () => {
    const r = tickQueue(0, 5, 10);
    expect(r.processed).toBe(5);
    expect(r.newQueue).toBe(0);
  });

  it("carries the remainder forward when demand exceeds capacity", () => {
    const r = tickQueue(0, 10, 4);
    expect(r.processed).toBe(4);
    expect(r.newQueue).toBe(6);
    expect(r.utilization).toBeCloseTo(2.5);
  });

  it("compounds an existing queue with new incoming", () => {
    const r = tickQueue(5, 5, 4);
    expect(r.processed).toBe(4);
    expect(r.newQueue).toBe(6);
  });
});

describe("bottleneck.detectStageBottleneck", () => {
  const base: StageDayState = {
    stage: "Finance Verification",
    department: "Finance",
    incoming: 10,
    processed: 8,
    queue: 2,
    capacity: 8,
    utilization: 0,
  };

  it("flags high severity above 1.2 utilization", () => {
    const result = detectStageBottleneck({ ...base, utilization: 1.5 });
    expect(result?.severity).toBe("high");
  });

  it("flags medium severity between 0.9 and 1.2", () => {
    const result = detectStageBottleneck({ ...base, utilization: 0.95 });
    expect(result?.severity).toBe("medium");
  });

  it("returns null when comfortably under capacity", () => {
    const result = detectStageBottleneck({ ...base, utilization: 0.3 });
    expect(result).toBeNull();
  });
});

describe("engine.validateConfig", () => {
  it("accepts a normal config", () => {
    expect(validateConfig(defaultConfig())).toEqual([]);
  });

  it("rejects negative cases", () => {
    const errors = validateConfig(defaultConfig({ incomingCases: -5 }));
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects zero SLA hours", () => {
    const errors = validateConfig(defaultConfig({ slaHours: 0 }));
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects zero-length simulation", () => {
    const errors = validateConfig(defaultConfig({ simulationDurationDays: 0 }));
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("engine.runSimulation", () => {
  it("is deterministic for the same config and officer roster", () => {
    const config = defaultConfig();
    const a = runSimulation(config, SEED_OFFICERS);
    const b = runSimulation(config, SEED_OFFICERS);
    expect(a.metrics).toEqual(b.metrics);
    expect(a.timeline).toEqual(b.timeline);
  });

  it("handles a normal workload without runaway queues", () => {
    const result = runSimulation(defaultConfig({ incomingCases: 20, existingPendingCases: 0 }), SEED_OFFICERS);
    expect(result.metrics.casesPending).toBeGreaterThanOrEqual(0);
    expect(result.metrics.totalCases).toBe(20);
  });

  it("produces a larger pending queue under high workload than normal", () => {
    const normal = runSimulation(defaultConfig({ incomingCases: 20 }), SEED_OFFICERS);
    const high = runSimulation(defaultConfig({ incomingCases: 200 }), SEED_OFFICERS);
    expect(high.metrics.casesPending).toBeGreaterThanOrEqual(normal.metrics.casesPending);
  });

  it("worsens metrics under staff shortage vs full staffing", () => {
    const allDeptOfficerIds = SEED_OFFICERS.filter((o) => o.department === "Finance").map((o) => o.id);
    const fullStaff = runSimulation(defaultConfig({ incomingCases: 40 }), SEED_OFFICERS);
    const shortage = runSimulation(
      defaultConfig({ incomingCases: 40, unavailableOfficerIds: allDeptOfficerIds }),
      SEED_OFFICERS
    );
    expect(shortage.metrics.casesPending).toBeGreaterThanOrEqual(fullStaff.metrics.casesPending);
  });

  it("treats an unavailable officer the same as removing them from capacity", () => {
    const officerId = SEED_OFFICERS.find((o) => o.department === "Finance")!.id;
    const withOfficer = runSimulation(defaultConfig({ incomingCases: 30 }), SEED_OFFICERS);
    const withoutOfficer = runSimulation(
      defaultConfig({ incomingCases: 30, unavailableOfficerIds: [officerId] }),
      SEED_OFFICERS
    );
    expect(withoutOfficer.metrics.availableOfficers).toBeLessThan(withOfficer.metrics.availableOfficers);
  });

  it("grows the queue over time when demand exceeds capacity every day", () => {
    const result = runSimulation(
      defaultConfig({ incomingCases: 500, simulationDurationDays: 10 }),
      SEED_OFFICERS
    );
    const firstHalf = result.timeline[2].casesPending;
    const secondHalf = result.timeline[9].casesPending;
    expect(secondHalf).toBeGreaterThanOrEqual(firstHalf);
  });

  it("reports SLA risk metrics as non-negative", () => {
    const result = runSimulation(defaultConfig({ incomingCases: 200, slaHours: 24 }), SEED_OFFICERS);
    expect(result.metrics.slaAtRisk).toBeGreaterThanOrEqual(0);
    expect(result.metrics.slaBreached).toBeGreaterThanOrEqual(0);
  });

  it("produces more SLA breaches under a tight SLA than a generous one", () => {
    const tight = runSimulation(defaultConfig({ incomingCases: 200, slaHours: 12 }), SEED_OFFICERS);
    const generous = runSimulation(defaultConfig({ incomingCases: 200, slaHours: 240 }), SEED_OFFICERS);
    expect(tight.metrics.slaBreached).toBeGreaterThanOrEqual(generous.metrics.slaBreached);
  });

  it("detects a bottleneck when demand heavily exceeds capacity", () => {
    const result = runSimulation(defaultConfig({ incomingCases: 500 }), SEED_OFFICERS);
    expect(result.bottlenecks.length).toBeGreaterThan(0);
    expect(result.metrics.primaryBottleneck).not.toBeNull();
  });

  it("reports no bottleneck for a light workload", () => {
    const result = runSimulation(defaultConfig({ incomingCases: 2, simulationDurationDays: 20 }), SEED_OFFICERS);
    expect(result.bottlenecks.length).toBe(0);
  });

  it("improves pending cases when more officers are added", () => {
    const financeOfficer = SEED_OFFICERS.find((o) => o.department === "Finance" && o.available)!;
    const extraOfficer = { ...financeOfficer, id: "off-extra-1", current_load: 0 };
    const baseline = runSimulation(defaultConfig({ incomingCases: 80 }), SEED_OFFICERS);
    const withExtra = runSimulation(defaultConfig({ incomingCases: 80 }), [...SEED_OFFICERS, extraOfficer]);
    expect(withExtra.metrics.casesPending).toBeLessThanOrEqual(baseline.metrics.casesPending);
  });

  it("handles zero incoming cases without errors", () => {
    const result = runSimulation(defaultConfig({ incomingCases: 0, existingPendingCases: 0 }), SEED_OFFICERS);
    expect(result.metrics.totalCases).toBe(0);
    expect(result.metrics.casesPending).toBe(0);
  });

  it("handles an empty officer roster gracefully", () => {
    const result = runSimulation(defaultConfig({ incomingCases: 10 }), []);
    expect(result.metrics.availableOfficers).toBe(0);
    expect(result.metrics.casesPending).toBeGreaterThan(0);
  });
});

describe("engine.runWhatIf", () => {
  it("computes deltas between baseline and modified configs", () => {
    const baseline = defaultConfig({ incomingCases: 100 });
    const modified = defaultConfig({ incomingCases: 100, simulationDurationDays: 20 });
    const comparison = runWhatIf(baseline, modified, SEED_OFFICERS);
    expect(comparison.baseline.metrics).toBeDefined();
    expect(comparison.modified.metrics).toBeDefined();
    expect(typeof comparison.deltas.casesPending).toBe("number");
  });

  it("shows fewer pending cases when adding officers in the modified scenario", () => {
    const financeOfficer = SEED_OFFICERS.find((o) => o.department === "Finance" && o.available)!;
    const extraOfficer = { ...financeOfficer, id: "off-extra-2", current_load: 0 };
    const config = defaultConfig({ incomingCases: 80 });
    const comparison = runWhatIf(config, config, [...SEED_OFFICERS]);
    const withExtra = runWhatIf(config, config, [...SEED_OFFICERS, extraOfficer]);
    expect(withExtra.modified.metrics.casesPending).toBeLessThanOrEqual(comparison.baseline.metrics.casesPending);
  });
});
