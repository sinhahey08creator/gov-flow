import { ScenarioPreset } from "./types";

// Each preset only overrides what it needs to; the rest of the config
// (office, SLA hours, etc.) stays whatever the user already picked.
export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "normal_day",
    label: "Normal Day",
    description: "Typical incoming volume with full staff availability.",
    overrides: {
      incomingCases: 20,
      existingPendingCases: 5,
      unavailableOfficerIds: [],
    },
  },
  {
    id: "high_workload",
    label: "High Workload",
    description: "Elevated case volume, staffing unchanged.",
    overrides: {
      incomingCases: 60,
      existingPendingCases: 10,
      unavailableOfficerIds: [],
    },
  },
  {
    id: "staff_shortage",
    label: "Staff Shortage",
    description: "Normal volume, but several officers are unavailable.",
    overrides: {
      incomingCases: 20,
      existingPendingCases: 5,
    },
  },
  {
    id: "sudden_surge",
    label: "Sudden Case Surge",
    description: "A large one-time spike in incoming cases.",
    overrides: {
      incomingCases: 120,
      existingPendingCases: 15,
    },
  },
  {
    id: "sla_crisis",
    label: "SLA Crisis",
    description: "Tight SLA window with high incoming volume.",
    overrides: {
      incomingCases: 50,
      slaHours: 24,
    },
  },
  {
    id: "custom",
    label: "Custom Scenario",
    description: "Configure every parameter manually.",
    overrides: {},
  },
];

export function getPreset(id: string): ScenarioPreset {
  return SCENARIO_PRESETS.find((p) => p.id === id) ?? SCENARIO_PRESETS[0];
}
