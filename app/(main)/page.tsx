"use client";

import { useState } from "react";
import { DEMO_CASE, SEED_OFFICERS, DEMO_FINANCE_QUEUE_LENGTH, DEMO_ASSIGNED_OFFICER_ID } from "@/lib/demo/seedData";
import { WORKFLOW_TEMPLATES, validateDocuments } from "@/lib/workflow/templates";
import { recommendOfficer } from "@/lib/calculations/officerScore";
import { calculateSLARisk } from "@/lib/calculations/slaRisk";
import { simulateOfficerUnavailable } from "@/lib/calculations/whatIf";
import { WorkflowStep } from "@/types";
import DocumentUpload from "@/components/DocumentUpload";
import { logAction } from "@/lib/audit/data";

const steps = WORKFLOW_TEMPLATES.land_compensation;
const financeStepDef = steps[3]; // Finance Verification
const financeStep: WorkflowStep = {
  id: "step-finance",
  case_id: DEMO_CASE.id,
  step_name: financeStepDef.name,
  department: financeStepDef.department,
  step_order: 4,
  status: "pending",
  assigned_officer_id: DEMO_ASSIGNED_OFFICER_ID,
  estimated_processing_days: financeStepDef.estimated_processing_days,
  required_skill: financeStepDef.required_skill,
  required_authority: financeStepDef.required_authority,
  queue_length: DEMO_FINANCE_QUEUE_LENGTH,
};

const documentsDetected = (DEMO_CASE.extracted_data as { documents_detected: string[] }).documents_detected;
const validation = validateDocuments(DEMO_CASE.case_type, documentsDetected);
const recommendation = recommendOfficer(SEED_OFFICERS, financeStep);
const slaRisk = calculateSLARisk({
  createdAt: DEMO_CASE.created_at,
  slaHours: DEMO_CASE.sla_hours,
  queueLength: financeStep.queue_length ?? 0,
  priority: DEMO_CASE.priority,
});

function riskColor(level: string) {
  if (level === "high") return "var(--critical)";
  if (level === "medium") return "var(--warning)";
  return "var(--success)";
}

export default function DashboardPage() {
  const [whyOpen, setWhyOpen] = useState(false);
  const [newCaseOpen, setNewCaseOpen] = useState(false);
  const [caseType, setCaseType] = useState("Land Compensation");
  const [applicantName, setApplicantName] = useState("");
  const [district, setDistrict] = useState("");
  const [caseFile, setCaseFile] = useState<File | null>(null);
  const [caseCreated, setCaseCreated] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explLoading, setExplLoading] = useState(false);
  const [simResult, setSimResult] = useState<ReturnType<typeof simulateOfficerUnavailable> | null>(null);

  async function handleWhy() {
    setWhyOpen(true);
    setExplLoading(true);

    // Auto-log the action
    logAction("why generated", "AI generated causal explanation for SLA risk bottleneck");

    try {
      const res = await fetch("/api/explain-bottleneck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: DEMO_CASE.case_number,
          department: financeStep.department,
          officer: recommendation?.officer.name ?? "Unknown",
          current_load: recommendation?.officer.current_load ?? 0,
          queue_length: financeStep.queue_length,
          avg_processing_days: recommendation?.officer.avg_processing_days ?? 0,
          sla_risk: slaRisk.percentage,
          priority: DEMO_CASE.priority,
        }),
      });
      const data = await res.json();
      setExplanation(data.explanation);
    } catch {
      setExplanation("Could not generate explanation right now.");
    } finally {
      setExplLoading(false);
    }
  }

  function handleSimulate() {
    const result = simulateOfficerUnavailable({
      currentOfficerId: DEMO_ASSIGNED_OFFICER_ID,
      officers: SEED_OFFICERS,
      step: financeStep,
      caseData: DEMO_CASE,
    });
    setSimResult(result);

    // Auto-log the action
    logAction("simulation run", "Simulated Officer A unavailable");
  }

  return (
    <main className="min-h-screen px-8 py-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--navy)" }}>GovFlow AI</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>Intelligent Government Workflow Operations</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-xs font-medium px-3 py-1 rounded-full border"
            style={{ borderColor: "var(--border)", color: "var(--muted)" }}
          >
            DEMO MODE · Synthetic Data
          </span>

          <button
            onClick={() => setNewCaseOpen(true)}
            className="px-4 py-2 rounded-md text-sm font-medium text-white"
            style={{ background: "#2563EB" }}
          >
            + New Case
          </button>
        </div>
      </div>

      {newCaseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: "var(--navy)" }}>
                New Case
              </h2>

              <button
                onClick={() => setNewCaseOpen(false)}
                className="text-xl"
                style={{ color: "var(--muted)" }}
              >
                ×
              </button>
            </div>

            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              Upload a government case document to begin processing.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Case Type
                </label>
                <select
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border)" }}
                >
                  <option>Land Compensation</option>
                  <option>Birth Certificate Correction</option>
                  <option>Citizen Grievance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Applicant Name
                </label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="Enter applicant name"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border)" }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  District
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Enter district"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border)" }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Case Document
                </label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setCaseFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border)" }}
                />

                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--muted)" }}
                >
                  PDF, PNG or JPG · up to 10MB
                </p>

                {caseCreated && (
                  <div
                    className="mt-2 rounded-md border px-4 py-3 text-sm"
                    style={{
                      borderColor: "var(--success)",
                      background: "#F0FDF4",
                      color: "var(--success)",
                    }}
                  >
                    ✓ Case created successfully.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setNewCaseOpen(false)}
                className="px-4 py-2 rounded-md border text-sm"
                style={{ borderColor: "var(--border)" }}
              >
                Cancel
              </button>

              <button
                disabled={caseCreated}
                onClick={() => {
                  if (!applicantName.trim() || !district.trim() || !caseFile) {
                    alert(
                      "Please enter the applicant name, district, and upload a case document."
                    );
                    return;
                  }

                  const caseNumber = `GF-${Date.now().toString().slice(-4)}`;

                  const newCase = {
                    id: `case-${Date.now()}`,
                    case_number: caseNumber,
                    case_type: caseType.toLowerCase().replace(/ /g, "_"),
                    applicant_name: applicantName,
                    priority: "medium",
                    status: "pending",
                    created_at: new Date().toISOString(),
                    sla_hours: 72,
                  };

                  const existingCases = JSON.parse(
                    localStorage.getItem("govflow-cases") || "[]"
                  );

                  localStorage.setItem(
                    "govflow-cases",
                    JSON.stringify([...existingCases, newCase])
                  );

                  // Auto-log the action
                  logAction(
                    "case created",
                    `Created new case ${caseNumber} for applicant ${applicantName}`
                  );

                  setCaseCreated(true);
                }}
                className="px-4 py-2 rounded-md text-sm font-medium text-white disabled:cursor-not-allowed"
                style={{
                  background: caseCreated ? "#94A3B8" : "#2563EB",
                }}
              >
                {caseCreated ? "✓ Case Created" : "Create Case"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <DocumentUpload />
      </div>

      <div className="rounded-lg border bg-white p-6 mb-6" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">{DEMO_CASE.case_number} — Land Compensation</h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>{DEMO_CASE.summary}</p>
          </div>
          <span
            className="text-sm font-semibold px-3 py-1 rounded"
            style={{ background: `${riskColor(slaRisk.level)}1A`, color: riskColor(slaRisk.level) }}
          >
            {slaRisk.level === "high" ? "🔴 AT RISK" : slaRisk.level === "medium" ? "🟠 WATCH" : "🟢 ON TRACK"}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div><span style={{ color: "var(--muted)" }}>Applicant</span><p className="font-medium">{DEMO_CASE.applicant_name}</p></div>
          <div><span style={{ color: "var(--muted)" }}>District</span><p className="font-medium">{DEMO_CASE.district}</p></div>
          <div><span style={{ color: "var(--muted)" }}>Priority</span><p className="font-medium capitalize">{DEMO_CASE.priority}</p></div>
          <div><span style={{ color: "var(--muted)" }}>SLA</span><p className="font-medium">{DEMO_CASE.sla_hours}h</p></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="rounded-lg border bg-white p-6" style={{ borderColor: "var(--border)" }}>
          <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide" style={{ color: "var(--muted)" }}>Document Check</h3>
          <ul className="space-y-2 text-sm">
            {validation.required.map((doc) => {
              const present = validation.present.includes(doc);
              return (
                <li key={doc} className="flex justify-between">
                  <span className="capitalize">{doc.replace(/_/g, " ")}</span>
                  <span style={{ color: present ? "var(--success)" : "var(--critical)" }}>{present ? "✓" : "✗ Missing"}</span>
                </li>
              );
            })}
          </ul>
          {!validation.complete && (
            <button className="mt-4 text-sm px-3 py-1.5 rounded border" style={{ borderColor: "var(--border)", color: "var(--navy)" }}>
              Request Missing Document
            </button>
          )}
        </div>

        <div className="rounded-lg border bg-white p-6" style={{ borderColor: "var(--border)" }}>
          <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide" style={{ color: "var(--muted)" }}>Workflow</h3>
          <ol className="space-y-2 text-sm">
            {steps.map((s, i) => {
              const stepNum = i + 1;
              const isBlocked = stepNum === 4;
              const isDone = stepNum < 4;
              return (
                <li key={s.name} className="flex items-center gap-2">
                  <span>{isDone ? "✓" : isBlocked ? "🔴" : "○"}</span>
                  <span className={isBlocked ? "font-medium" : ""}>{s.name}</span>
                  <span className="ml-auto text-xs" style={{ color: "var(--muted)" }}>{s.department}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 mb-6" style={{ borderColor: "var(--border)" }}>
        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide" style={{ color: "var(--muted)" }}>Recommended Officer</h3>
        {recommendation && (
          <>
            <p className="text-lg font-semibold">{recommendation.officer.name} — Score {recommendation.score}</p>
            <div className="grid grid-cols-5 gap-3 mt-3 text-sm">
              <div>Authority Match<p className="font-medium">+{recommendation.breakdown.authority}</p></div>
              <div>Skill Match<p className="font-medium">+{recommendation.breakdown.skill}</p></div>
              <div>Availability<p className="font-medium">+{recommendation.breakdown.availability}</p></div>
              <div>Workload Penalty<p className="font-medium">-{recommendation.breakdown.workloadPenalty}</p></div>
              <div>Processing Penalty<p className="font-medium">-{recommendation.breakdown.processingPenalty}</p></div>
            </div>
          </>
        )}
      </div>

      <div className="rounded-lg border bg-white p-6 mb-6" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide" style={{ color: "var(--muted)" }}>SLA Breach Risk</h3>
          <span className="text-2xl font-bold" style={{ color: riskColor(slaRisk.level) }}>{slaRisk.percentage}%</span>
        </div>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
          Finance queue: {financeStep.queue_length} files · Assigned: Officer A (42/50 load)
        </p>
        <div className="flex gap-3">
          <button onClick={handleWhy} className="px-4 py-2 rounded text-sm font-medium text-white" style={{ background: "var(--navy)" }}>
            WHY?
          </button>
          <button onClick={handleSimulate} className="px-4 py-2 rounded text-sm font-medium border" style={{ borderColor: "var(--border)" }}>
            Simulate Officer Unavailable
          </button>
        </div>

        {whyOpen && (
          <div className="mt-4 p-4 rounded border text-sm" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
            {explLoading ? "Generating explanation..." : explanation}
          </div>
        )}

        {simResult && (
          <div className="mt-4 p-4 rounded border text-sm grid grid-cols-2 gap-6" style={{ borderColor: "var(--border)" }}>
            <div>
              <p className="font-semibold mb-1">Current</p>
              <p>Officer: {simResult.before?.officer.name}</p>
              <p>Score: {simResult.before?.score}</p>
              <p>SLA Risk: {simResult.slaRiskBefore.percentage}%</p>
            </div>
            <div>
              <p className="font-semibold mb-1">If Officer A Unavailable</p>
              <p>Officer: {simResult.after?.officer.name}</p>
              <p>Score: {simResult.after?.score}</p>
              <p>SLA Risk: {simResult.slaRiskAfter.percentage}%</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}