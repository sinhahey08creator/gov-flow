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
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [reassigned, setReassigned] = useState(false);

  useEffect(() => {
    const localCasesRaw = localStorage.getItem("govflow-cases");
    const localCases = localCasesRaw ? JSON.parse(localCasesRaw) : [];

    const formattedLocalCases: CaseOption[] = localCases.map((c: any) => ({
      id: c.id,
      case_number: c.case_number,
      title: c.applicant_name ? `${c.applicant_name}'s Claim` : "Government Case",
    }));

    const combinedCases = [
      ...DEMO_CASES.map((c) => ({ id: c.id, case_number: c.case_number, title: c.title })),
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
      const selectedObj = OFFICERS_LIST.find((o) => o.id === selectedOfficerId);
      const targetOfficerName = selectedObj
        ? `${selectedObj.name} (${selectedObj.role})`
        : "Selected Officer";

      const sortedOfficers = [...OFFICERS_LIST].sort((a, b) => a.queue - b.queue);
      const bestOfficer = sortedOfficers.find((o) => o.id !== selectedOfficerId) || sortedOfficers[0];

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

    updateCaseOfficer(activeCase.case_number, officerDisplayName, suggestedOfficer.id);
    setReassigned(true);

    logAction(
      "officer reassigned",
      `Reassigned workflow step for ${activeCase.case_number} from ${simulationResult.targetOfficerName} to${officerDisplayName}`
    );
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <main className="p-8 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">What-If Simulator</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Test resource availability scenarios and simulate workflow delays before they happen
          </p>
        </div>

        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">
            Configure Simulation Parameters
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Select Active Case
              </label>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.case_number} - {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Simulate Officer Unavailability
              </label>
              <select
                value={selectedOfficerId}
                onChange={(e) => setSelectedOfficerId(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {isSimulating ? "Running Simulation..." : "Run Scenario Simulation"}
          </button>
        </div>

        {simulationResult ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Simulation Results & Impact Analysis
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scenario: {simulationResult.targetOfficerName} is unavailable on {activeCase?.case_number}
                </p>
              </div>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                High Risk Bottleneck Detected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-xs font-medium text-slate-500">Original SLA</span>
                <p className="text-xl font-bold text-slate-800 mt-1">
                  {simulationResult.originalSlaDays} Days
                </p>
              </div>

              <div className="p-4 rounded-xl bg-red-50/50 border border-red-200/60">
                <span className="text-xs font-medium text-red-600">Simulated SLA</span>
                <p className="text-xl font-bold text-red-700 mt-1">
                  {simulationResult.simulatedSlaDays} Days
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/60">
                <span className="text-xs font-medium text-amber-700">Projected Delay</span>
                <p className="text-xl font-bold text-amber-800 mt-1">
                  +{simulationResult.delayImpactDays} Days
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-50/60 border border-blue-200/70 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-blue-900">Recommended Mitigation</h4>
                <p className="text-xs text-blue-700 mt-0.5">
                  Reassign pending steps to <strong>{simulationResult.suggestedOfficer.name} ({simulationResult.suggestedOfficer.role})</strong>
                </p>
              </div>

              <button
                onClick={handleApplyReassignment}
                disabled={reassigned}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                  reassigned
                    ? "bg-green-600 text-white cursor-default"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {reassigned ? "✓ Officer Reassigned" : "Apply Reassignment"}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-xl text-xs text-slate-500 shadow-sm">
            Select a case and officer above, then click <strong>Run Scenario Simulation</strong> to preview bottleneck impacts and suggested reassignments.
          </div>
        )}
      </main>
    </div>
  );
}