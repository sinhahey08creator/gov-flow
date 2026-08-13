"use client";

import { useState, useEffect } from "react";
import { logAction } from "@/lib/audit/data";
import { updateCaseOfficer, DEMO_CASES } from "@/lib/workflow/templates";

interface Officer {
  id: string;
  name: string;
  role: string;
  queue: number;
}

const OFFICERS_LIST: Officer[] = [
  { id: "off-a", name: "Officer A", role: "Revenue Verification", queue: 4 },
  { id: "off-b", name: "Officer B", role: "Finance Verification", queue: 8 },
  { id: "off-c", name: "Officer C", role: "Legal Compliance", queue: 2 },
  { id: "off-d", name: "Officer D", role: "Final Approval", queue: 3 },
];

interface CaseOption {
  id: string;
  case_number: string;
  title: string;
}

interface SimulationResult {
  targetOfficerName: string;
  originalSlaDays: number;
  simulatedSlaDays: number;
  delayImpactDays: number;
  suggestedOfficer: Officer;
}

export default function SimulatorPage() {
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [selectedOfficerId, setSelectedOfficerId] = useState("off-b");
  const [simulationResult, setSimulationResult] =
    useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [reassigned, setReassigned] = useState(false);

  useEffect(() => {
    const localCasesRaw = localStorage.getItem("govflow-cases");
    const localCases = localCasesRaw ? JSON.parse(localCasesRaw) : [];

    const formattedLocalCases: CaseOption[] = localCases.map((c: any) => ({
      id: c.id,
      case_number: c.case_number,
      title: c.applicant_name
        ? `${c.applicant_name}'s Claim`
        : "Government Case",
    }));

    const combinedCases = [
      ...DEMO_CASES.map((c) => ({
        id: c.id,
        case_number: c.case_number,
        title: c.title,
      })),
      ...formattedLocalCases,
    ];

    setCases(combinedCases);

    if (combinedCases.length > 0) {
      setSelectedCaseId(combinedCases[0].id);
    }
  }, []);

  const activeCase = cases.find((c) => c.id === selectedCaseId);

  const handleRunSimulation = () => {
    if (!activeCase) return;

    setIsSimulating(true);
    setReassigned(false);

    setTimeout(() => {
      const selectedObj = OFFICERS_LIST.find(
        (o) => o.id === selectedOfficerId
      );

      const targetOfficerName = selectedObj
        ? `${selectedObj.name} (${selectedObj.role})`
        : "Selected Officer";

      const sortedOfficers = [...OFFICERS_LIST].sort(
        (a, b) => a.queue - b.queue
      );

      const bestOfficer =
        sortedOfficers.find((o) => o.id !== selectedOfficerId) ||
        sortedOfficers[0];

      setSimulationResult({
        targetOfficerName,
        originalSlaDays: 5,
        simulatedSlaDays: 12,
        delayImpactDays: 7,
        suggestedOfficer: bestOfficer,
      });

      setIsSimulating(false);

      logAction(
        "simulation run",
        `Simulated unavailability for ${targetOfficerName} on Case #${activeCase.case_number}`
      );
    }, 400);
  };

  const handleApplyReassignment = () => {
    if (!simulationResult || !activeCase) return;

    const { suggestedOfficer } = simulationResult;

    const officerDisplayName = `${suggestedOfficer.name} (${suggestedOfficer.role})`;

    updateCaseOfficer(
      activeCase.case_number,
      officerDisplayName,
      suggestedOfficer.id
    );

    setReassigned(true);

    logAction(
      "officer reassigned",
      `Reassigned workflow step for ${activeCase.case_number} from ${simulationResult.targetOfficerName} to ${officerDisplayName}`
    );
  };

  return (
    <main className="px-8 py-8 max-w-6xl mx-auto">
      {/* PAGE HEADER */}
      <div className="mb-6">
        <h1
          className="text-2xl font-semibold"
          style={{ color: "var(--navy)" }}
        >
          What-If Simulator
        </h1>

        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Test resource availability scenarios and simulate workflow delays
          before they happen.
        </p>
      </div>

      {/* CONFIGURATION */}
      <div className="gf-card p-6 space-y-5">
        <div>
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--navy)" }}
          >
            Configure Simulation
          </h2>

          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Select a case and simulate the unavailability of an assigned
            officer.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* CASE */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: "var(--text)" }}
            >
              Select Active Case
            </label>

            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="w-full text-sm px-3 py-2.5 bg-white border rounded-md focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.case_number} - {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* OFFICER */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: "var(--text)" }}
            >
              Simulate Officer Unavailability
            </label>

            <select
              value={selectedOfficerId}
              onChange={(e) => setSelectedOfficerId(e.target.value)}
              className="w-full text-sm px-3 py-2.5 bg-white border rounded-md focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            >
              {OFFICERS_LIST.map((off) => (
                <option key={off.id} value={off.id}>
                  {off.name} ({off.role}) - {off.queue} active cases
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleRunSimulation}
          disabled={isSimulating || !selectedCaseId}
          className="gf-button"
          style={{
            color: "white",
            background: "var(--navy)",
            borderColor: "var(--navy)",
          }}
        >
          {isSimulating
            ? "Running Simulation..."
            : "Run Scenario Simulation"}
        </button>
      </div>

      {/* RESULTS */}
      {simulationResult ? (
        <div className="gf-card mt-6 overflow-hidden">
          {/* RESULT HEADER */}
          <div
            className="px-6 py-5 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            style={{ borderColor: "var(--border)" }}
          >
            <div>
              <h3
                className="text-sm font-semibold"
                style={{ color: "var(--navy)" }}
              >
                Simulation Results & Impact Analysis
              </h3>

              <p
                className="text-xs mt-1"
                style={{ color: "var(--muted)" }}
              >
                Scenario: {simulationResult.targetOfficerName} is unavailable
                on {activeCase?.case_number}
              </p>
            </div>

            <span className="gf-status gf-status-critical">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--critical)" }}
              />
              High Risk Bottleneck Detected
            </span>
          </div>

          <div className="p-6 space-y-6">
            {/* METRICS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="gf-card p-4">
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--muted)" }}
                >
                  Original SLA
                </span>

                <p
                  className="text-2xl font-semibold mt-2"
                  style={{ color: "var(--navy)" }}
                >
                  {simulationResult.originalSlaDays}
                  <span className="text-sm font-normal ml-1">
                    Days
                  </span>
                </p>
              </div>

              <div
                className="rounded-lg border p-4"
                style={{
                  borderColor: "#fecaca",
                  background: "#fef2f2",
                }}
              >
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--critical)" }}
                >
                  Simulated SLA
                </span>

                <p
                  className="text-2xl font-semibold mt-2"
                  style={{ color: "var(--critical)" }}
                >
                  {simulationResult.simulatedSlaDays}
                  <span className="text-sm font-normal ml-1">
                    Days
                  </span>
                </p>
              </div>

              <div
                className="rounded-lg border p-4"
                style={{
                  borderColor: "#fde68a",
                  background: "#fffbeb",
                }}
              >
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--warning)" }}
                >
                  Projected Delay
                </span>

                <p
                  className="text-2xl font-semibold mt-2"
                  style={{ color: "var(--warning)" }}
                >
                  +{simulationResult.delayImpactDays}
                  <span className="text-sm font-normal ml-1">
                    Days
                  </span>
                </p>
              </div>
            </div>

            {/* RECOMMENDED MITIGATION */}
            <div
              className="rounded-lg border p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg)",
              }}
            >
              <div>
                <div
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--accent)" }}
                >
                  Recommended Mitigation
                </div>

                <h4
                  className="text-sm font-semibold mt-1"
                  style={{ color: "var(--navy)" }}
                >
                  Reassign the affected workflow step
                </h4>

                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--muted)" }}
                >
                  Recommended officer:{" "}
                  <strong style={{ color: "var(--text)" }}>
                    {simulationResult.suggestedOfficer.name}
                  </strong>{" "}
                  ({simulationResult.suggestedOfficer.role})
                </p>
              </div>

              <button
                onClick={handleApplyReassignment}
                disabled={reassigned}
                className="gf-button shrink-0"
                style={{
                  color: "white",
                  background: reassigned
                    ? "var(--success)"
                    : "var(--navy)",
                  borderColor: reassigned
                    ? "var(--success)"
                    : "var(--navy)",
                  cursor: reassigned ? "default" : "pointer",
                }}
              >
                {reassigned
                  ? "✓ Officer Reassigned"
                  : "Apply Reassignment"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* EMPTY STATE */
        <div
          className="gf-card mt-6 p-12 text-center"
          style={{ color: "var(--muted)" }}
        >
          <div
            className="mx-auto mb-3 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "var(--bg)" }}
          >
            <span
              className="text-lg font-semibold"
              style={{ color: "var(--navy)" }}
            >
              ?
            </span>
          </div>

          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--navy)" }}
          >
            No simulation run yet
          </h3>

          <p className="text-xs mt-1 max-w-md mx-auto">
            Select a case and officer above, then run a scenario simulation
            to preview bottleneck impacts and suggested reassignments.
          </p>
        </div>
      )}
    </main>
  );
}