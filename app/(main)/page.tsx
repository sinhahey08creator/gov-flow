"use client";

<<<<<<< HEAD
import { useState, useEffect } from "react";
import { DEMO_CASE, SEED_OFFICERS, DEMO_FINANCE_QUEUE_LENGTH, DEMO_ASSIGNED_OFFICER_ID } from "@/lib/demo/seedData";
import { WORKFLOW_TEMPLATES, validateDocuments, DEMO_CASES } from "@/lib/workflow/templates";
=======
import { useState } from "react";
import {
  DEMO_CASE,
  SEED_OFFICERS,
  DEMO_FINANCE_QUEUE_LENGTH,
  DEMO_ASSIGNED_OFFICER_ID,
} from "@/lib/demo/seedData";
import {
  WORKFLOW_TEMPLATES,
  validateDocuments,
} from "@/lib/workflow/templates";
>>>>>>> 19f4eb9b45e6b4dd2d9bb439d57c304810f6978b
import { recommendOfficer } from "@/lib/calculations/officerScore";
import { calculateSLARisk } from "@/lib/calculations/slaRisk";
import { simulateOfficerUnavailable } from "@/lib/calculations/whatIf";
import { WorkflowStep, CaseType } from "@/types";
import DocumentUpload from "@/components/DocumentUpload";
import { logAction } from "@/lib/audit/data";

const steps = WORKFLOW_TEMPLATES.land_compensation;
const financeStepDef = steps[3];

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

<<<<<<< HEAD
const documentsDetected = (DEMO_CASE.extracted_data as { documents_detected?: string[] })?.documents_detected || [];
const validation = validateDocuments(DEMO_CASE.case_type as CaseType, documentsDetected);
const defaultRecommendation = recommendOfficer(SEED_OFFICERS, financeStep);
=======
const documentsDetected = (
  DEMO_CASE.extracted_data as { documents_detected: string[] }
).documents_detected;

const validation = validateDocuments(
  DEMO_CASE.case_type,
  documentsDetected
);

const recommendation = recommendOfficer(SEED_OFFICERS, financeStep);
>>>>>>> 19f4eb9b45e6b4dd2d9bb439d57c304810f6978b

const slaRisk = calculateSLARisk({
  createdAt: DEMO_CASE.created_at,
  slaHours: DEMO_CASE.sla_hours,
  queueLength: financeStep.queue_length ?? 0,
  priority: DEMO_CASE.priority,
});

function riskColor(level: string) {
  if (level === "high") return "var(--critical, #EF4444)";
  if (level === "medium") return "var(--warning, #F59E0B)";
  return "var(--success, #10B981)";
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

  const [simResult, setSimResult] = useState<
    ReturnType<typeof simulateOfficerUnavailable> | null
  >(null);

  // Reassignment tracking state
  const [reassignedOfficerName, setReassignedOfficerName] = useState<string | null>(null);

  // Sync reassigned state continuously from DEMO_CASES
  useEffect(() => {
    const checkReassignment = () => {
      const activeCase = DEMO_CASES.find(
        (c) => c.case_number === "GF-1024" || c.case_number === "GF-1025"
      );
      if (activeCase && activeCase.assigned_officer !== "Officer B (Finance Verification)") {
        setReassignedOfficerName(activeCase.assigned_officer);
      }
    };

    checkReassignment();
    const interval = setInterval(checkReassignment, 800);
    return () => clearInterval(interval);
  }, []);

  // Compute breakdown metrics for newly assigned officer
  const reassignedOfficerObj = SEED_OFFICERS.find((o) =>
    reassignedOfficerName?.includes(o.name)
  );
  const reassignedRecommendation = reassignedOfficerObj
    ? recommendOfficer(
        SEED_OFFICERS.map((o) =>
          o.id === reassignedOfficerObj.id ? { ...o, current_load: Math.max(1, o.current_load - 2) } : o
        ),
        financeStep
      )
    : null;

  async function handleWhy() {
    setWhyOpen(true);
    setExplLoading(true);

    logAction("why generated", "AI generated causal explanation for SLA risk bottleneck");

    try {
      const res = await fetch("/api/explain-bottleneck", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          case_id: DEMO_CASE.case_number,
          department: financeStep.department,
          officer: defaultRecommendation?.officer.name ?? "Unknown",
          current_load: defaultRecommendation?.officer.current_load ?? 0,
          queue_length: financeStep.queue_length,
<<<<<<< HEAD
          avg_processing_days: defaultRecommendation?.officer.avg_processing_days ?? 0,
=======
          avg_processing_days:
            recommendation?.officer.avg_processing_days ?? 0,
>>>>>>> 19f4eb9b45e6b4dd2d9bb439d57c304810f6978b
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
    logAction("simulation run", "Simulated Officer A unavailable");
  }

  return (
<<<<<<< HEAD
    <main className="min-h-screen px-8 py-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--navy, #0F172A)" }}>GovFlow AI</h1>
          <p className="text-sm" style={{ color: "var(--muted, #64748B)" }}>Intelligent Government Workflow Operations</p>
=======
    <main className="min-h-screen px-8 py-8 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--navy)" }}
          >
            GovFlow AI
          </h1>

          <p
            className="text-sm"
            style={{ color: "var(--muted)" }}
          >
            Intelligent Government Workflow Operations
          </p>
>>>>>>> 19f4eb9b45e6b4dd2d9bb439d57c304810f6978b
        </div>

        <div className="flex items-center gap-3">
          <span
            className="text-xs font-medium px-3 py-1 rounded-full border"
<<<<<<< HEAD
            style={{ borderColor: "var(--border, #E2E8F0)", color: "var(--muted, #64748B)" }}
=======
            style={{
              borderColor: "var(--border)",
              color: "var(--muted)",
            }}
>>>>>>> 19f4eb9b45e6b4dd2d9bb439d57c304810f6978b
          >
            DEMO MODE · Synthetic Data
          </span>

          <button
<<<<<<< HEAD
            onClick={() => setNewCaseOpen(true)}
            className="px-4 py-2 rounded-md text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
=======
            onClick={() => {
              setNewCaseOpen(true);
              setCaseCreated(false);
            }}
            className="px-4 py-2 rounded-md text-sm font-medium text-white"
>>>>>>> 19f4eb9b45e6b4dd2d9bb439d57c304810f6978b
            style={{ background: "#2563EB" }}
          >
            + New Case
          </button>
        </div>
      </div>

<<<<<<< HEAD
      {/* New Case Modal */}
=======
      {/* NEW CASE MODAL */}
>>>>>>> 19f4eb9b45e6b4dd2d9bb439d57c304810f6978b
      {newCaseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between mb-6">
<<<<<<< HEAD
              <h2 className="text-xl font-semibold" style={{ color: "var(--navy, #0F172A)" }}>
=======
              <h2
                className="text-xl font-semibold"
                style={{ color: "var(--navy)" }}
              >
>>>>>>> 19f4eb9b45e6b4dd2d9bb439d57c304810f6978b
                New Case
              </h2>
              <button
                onClick={() => setNewCaseOpen(false)}
                className="text-xl"
                style={{ color: "var(--muted, #64748B)" }}
              >
                ×
              </button>
            </div>

<<<<<<< HEAD
            <p className="text-sm mb-6" style={{ color: "var(--muted, #64748B)" }}>
=======
            <p
              className="text-sm mb-6"
              style={{ color: "var(--muted)" }}
            >
>>>>>>> 19f4eb9b45e6b4dd2d9bb439d57c304810f6978b
              Upload a government case document to begin processing.
            </p>

            <div className="space-y-4">
              {/* CASE TYPE */}
              <div>
                <label className="block text-sm font-medium mb-1">Case Type</label>
                <select
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border, #E2E8F0)" }}
                >
                  <option>Land Compensation</option>
                  <option>Birth Certificate Correction</option>
                  <option>Citizen Grievance</option>
                </select>
              </div>

              {/* APPLICANT NAME */}
              <div>
                <label className="block text-sm font-medium mb-1">Applicant Name</label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="Enter applicant name"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border, #E2E8F0)" }}
                />
              </div>

              {/* DISTRICT */}
              <div>
                <label className="block text-sm font-medium mb-1">District</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Enter district"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border, #E2E8F0)" }}
                />
              </div>

              {/* CASE DOCUMENT */}
              <div>
                <label className="block text-sm font-medium mb-1">Case Document</label>

                {!caseFile ? (
                  <label
                    className="flex items-center justify-center w-full rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
                    style={{ borderColor: "var(--border, #E2E8F0)" }}
                  >
                    Choose File

                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        setCaseFile(
                          e.target.files?.[0] ?? null
                        );
                        setCaseCreated(false);
                      }}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div
                    className="flex items-center justify-between w-full rounded-md border px-3 py-2 text-sm"
                    style={{ borderColor: "var(--border, #E2E8F0)" }}
                  >
                    <span className="truncate">{caseFile.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCaseFile(null);
                        setCaseCreated(false);
                      }}
                      className="ml-3 text-xs font-medium"
                      style={{ color: "var(--critical, #EF4444)" }}
                    >
                      Remove
                    </button>
                  </div>
                )}

                <p className="text-xs mt-1" style={{ color: "var(--muted, #64748B)" }}>
                  PDF, PNG or JPG · up to 10MB
                </p>

                {/* SUCCESS MESSAGE */}
                {caseCreated && (
                  <div
                    className="mt-2 rounded-md border px-4 py-3 text-sm"
                    style={{
                      borderColor: "var(--success, #10B981)",
                      background: "#F0FDF4",
                      color: "var(--success, #10B981)",
                    }}
                  >
                    ✓ Case created successfully.
                  </div>
                )}
              </div>
            </div>

            {/* MODAL BUTTONS */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setNewCaseOpen(false)}
                className="px-4 py-2 rounded-md border text-sm"
                style={{ borderColor: "var(--border, #E2E8F0)" }}
              >
                Cancel
              </button>

              {/* CREATE CASE — ALWAYS ENABLED */}
              <button
                onClick={() => {
<<<<<<< HEAD
                  if (!applicantName.trim() || !district.trim() || !caseFile) {
                    alert("Please enter the applicant name, district, and upload a case document.");
=======
                  if (
                    !applicantName.trim() ||
                    !district.trim() ||
                    !caseFile
                  ) {
                    alert(
                      "Please enter the applicant name, district, and upload a case document."
                    );
>>>>>>> 19f4eb9b45e6b4dd2d9bb439d57c304810f6978b
                    return;
                  }

                  const caseNumber = `GF-${Date.now().toString().slice(-4)}`;
                  const newCase = {
                    id: `case-${Date.now()}`,
                    case_number: caseNumber,
                    case_type: caseType.toLowerCase().replace(/ /g, "_"),
                    applicant_name: applicantName,

                    district,

                    priority: "medium",

                    status: "pending",

                    compensation_status: "not_started",

                    current_step: 1,

                    created_at: new Date().toISOString(),

                    sla_hours: 72,
                  };

<<<<<<< HEAD
                  const existingCases = JSON.parse(localStorage.getItem("govflow-cases") || "[]");
                  localStorage.setItem("govflow-cases", JSON.stringify([...existingCases, newCase]));
=======
                  const existingCases = JSON.parse(
                    localStorage.getItem("govflow-cases") || "[]"
                  );

                  localStorage.setItem(
                    "govflow-cases",
                    JSON.stringify([
                      ...existingCases,
                      newCase,
                    ])
                  );

                  // Auto-log the action
                  logAction(
                    "case created",
                    `Created new case ${caseNumber} for applicant ${applicantName}`
                  );
>>>>>>> 19f4eb9b45e6b4dd2d9bb439d57c304810f6978b

                  logAction("case created", `Created new case ${caseNumber} for applicant ${applicantName}`);
                  setCaseCreated(true);
                }}
                className="px-4 py-2 rounded-md text-sm font-medium text-white"
                style={{ background: "#2563EB" }}
              >
                Create Case
              </button>
            </div>
          </div>
        </div>
      )}

<<<<<<< HEAD
      {/* Document Upload Widget */}
      <DocumentUpload />

      {/* Case Details Header Card */}
      <div className="rounded-lg border bg-white p-6" style={{ borderColor: "var(--border, #E2E8F0)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">GF-1024 — Land Compensation</h2>
            <p className="text-sm" style={{ color: "var(--muted, #64748B)" }}>{DEMO_CASE.summary}</p>
=======
      {/* DOCUMENT UPLOAD */}
      <div className="mb-6">
        <DocumentUpload />
      </div>

      {/* CASE SUMMARY */}
      <div
        className="rounded-lg border bg-white p-6 mb-6"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">
              {DEMO_CASE.case_number} — Land Compensation
            </h2>

            <p
              className="text-sm"
              style={{ color: "var(--muted)" }}
            >
              {DEMO_CASE.summary}
            </p>
>>>>>>> 19f4eb9b45e6b4dd2d9bb439d57c304810f6978b
          </div>

          <span
            className="text-sm font-semibold px-3 py-1 rounded"
            style={{
              background: `${riskColor(slaRisk.level)}1A`,
              color: riskColor(slaRisk.level),
            }}
          >
            {slaRisk.level === "high"
              ? "🔴 AT RISK"
              : slaRisk.level === "medium"
                ? "🟠 WATCH"
                : "🟢 ON TRACK"}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-4 text-sm">
<<<<<<< HEAD
          <div><span style={{ color: "var(--muted, #64748B)" }}>Applicant</span><p className="font-medium">{DEMO_CASE.applicant_name}</p></div>
          <div><span style={{ color: "var(--muted, #64748B)" }}>District</span><p className="font-medium">{DEMO_CASE.district}</p></div>
          <div><span style={{ color: "var(--muted, #64748B)" }}>Priority</span><p className="font-medium capitalize">{DEMO_CASE.priority}</p></div>
          <div><span style={{ color: "var(--muted, #64748B)" }}>SLA</span><p className="font-medium">{DEMO_CASE.sla_hours}h</p></div>
        </div>
      </div>

      {/* Document Check & Workflow Step Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-white p-6" style={{ borderColor: "var(--border, #E2E8F0)" }}>
          <h3 className="font-semibold mb-3 text-xs uppercase tracking-wide" style={{ color: "var(--muted, #64748B)" }}>Document Check</h3>
=======
          <div>
            <span style={{ color: "var(--muted)" }}>
              Applicant
            </span>

            <p className="font-medium">
              {DEMO_CASE.applicant_name}
            </p>
          </div>

          <div>
            <span style={{ color: "var(--muted)" }}>
              District
            </span>

            <p className="font-medium">
              {DEMO_CASE.district}
            </p>
          </div>

          <div>
            <span style={{ color: "var(--muted)" }}>
              Priority
            </span>

            <p className="font-medium capitalize">
              {DEMO_CASE.priority}
            </p>
          </div>

          <div>
            <span style={{ color: "var(--muted)" }}>
              SLA
            </span>

            <p className="font-medium">
              {DEMO_CASE.sla_hours}h
            </p>
          </div>
        </div>
      </div>

      {/* DOCUMENT CHECK + WORKFLOW */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* DOCUMENT CHECK */}
        <div
          className="rounded-lg border bg-white p-6"
          style={{ borderColor: "var(--border)" }}
        >
          <h3
            className="font-semibold mb-3 text-sm uppercase tracking-wide"
            style={{ color: "var(--muted)" }}
          >
            Document Check
          </h3>

>>>>>>> 19f4eb9b45e6b4dd2d9bb439d57c304810f6978b
          <ul className="space-y-2 text-sm">
            {validation.required.map((doc) => {
              const present =
                validation.present.includes(doc);

              return (
<<<<<<< HEAD
                <li key={doc} className="flex justify-between">
                  <span className="capitalize">{doc.replace(/_/g, " ")}</span>
                  <span style={{ color: present ? "var(--success, #10B981)" : "var(--critical, #EF4444)" }}>{present ? "✓" : "✗ Missing"}</span>
=======
                <li
                  key={doc}
                  className="flex justify-between"
                >
                  <span className="capitalize">
                    {doc.replace(/_/g, " ")}
                  </span>

                  <span
                    style={{
                      color: present
                        ? "var(--success)"
                        : "var(--critical)",
                    }}
                  >
                    {present ? "✓" : "✗ Missing"}
                  </span>
>>>>>>> 19f4eb9b45e6b4dd2d9bb439d57c304810f6978b
                </li>
              );
            })}
          </ul>

          {!validation.complete && (
<<<<<<< HEAD
            <button className="mt-4 text-xs font-medium px-3 py-1.5 rounded border" style={{ borderColor: "var(--border, #E2E8F0)", color: "var(--navy, #0F172A)" }}>
=======
            <button
              className="mt-4 text-sm px-3 py-1.5 rounded border"
              style={{
                borderColor: "var(--border)",
                color: "var(--navy)",
              }}
            >
>>>>>>> 19f4eb9b45e6b4dd2d9bb439d57c304810f6978b
              Request Missing Document
            </button>
          )}
        </div>

<<<<<<< HEAD
        <div className="rounded-lg border bg-white p-6" style={{ borderColor: "var(--border, #E2E8F0)" }}>
          <h3 className="font-semibold mb-3 text-xs uppercase tracking-wide" style={{ color: "var(--muted, #64748B)" }}>Workflow</h3>
=======
        {/* WORKFLOW */}
        <div
          className="rounded-lg border bg-white p-6"
          style={{ borderColor: "var(--border)" }}
        >
          <h3
            className="font-semibold mb-3 text-sm uppercase tracking-wide"
            style={{ color: "var(--muted)" }}
          >
            Workflow
          </h3>

>>>>>>> 19f4eb9b45e6b4dd2d9bb439d57c304810f6978b
          <ol className="space-y-2 text-sm">
            {steps.map((s, i) => {
              const stepNum = i + 1;

              const isBlocked = stepNum === 4;
              const isDone = stepNum < 4;

              return (
<<<<<<< HEAD
                <li key={s.name} className="flex items-center gap-2">
                  <span>{isDone ? "✓" : isBlocked ? "🔴" : "○"}</span>
                  <span className={isBlocked ? "font-medium" : ""}>{s.name}</span>
                  <span className="ml-auto text-xs" style={{ color: "var(--muted, #64748B)" }}>{s.department}</span>
=======
                <li
                  key={s.name}
                  className="flex items-center gap-2"
                >
                  <span>
                    {isDone
                      ? "✓"
                      : isBlocked
                        ? "🔴"
                        : "○"}
                  </span>

                  <span
                    className={
                      isBlocked ? "font-medium" : ""
                    }
                  >
                    {s.name}
                  </span>

                  <span
                    className="ml-auto text-xs"
                    style={{ color: "var(--muted)" }}
                  >
                    {s.department}
                  </span>
>>>>>>> 19f4eb9b45e6b4dd2d9bb439d57c304810f6978b
                </li>
              );
            })}
          </ol>
        </div>
      </div>

<<<<<<< HEAD
      {/* DYNAMIC RECOMMENDED OFFICER CARD (SHOWS ORIGINAL VS REASSIGNED) */}
      <div className="rounded-lg border bg-white p-6 shadow-sm" style={{ borderColor: "var(--border, #E2E8F0)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-xs uppercase tracking-wide" style={{ color: "var(--muted, #64748B)" }}>
            Recommended Officer Allocation
          </h3>
          {reassignedOfficerName && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
              ⚡ What-If Reassignment Active
            </span>
          )}
        </div>

        {!reassignedOfficerName ? (
          /* STANDARD SINGLE OFFICER VIEW */
          defaultRecommendation && (
            <>
              <p className="text-lg font-bold text-slate-900">
                {defaultRecommendation.officer.name} — Score {defaultRecommendation.score}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 text-xs">
                <div className="p-2.5 rounded bg-slate-50 border border-slate-100"><span style={{ color: "var(--muted, #64748B)" }}>Authority Match</span><p className="font-bold text-slate-800 text-sm mt-0.5">+{defaultRecommendation.breakdown.authority}</p></div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-100"><span style={{ color: "var(--muted, #64748B)" }}>Skill Match</span><p className="font-bold text-slate-800 text-sm mt-0.5">+{defaultRecommendation.breakdown.skill}</p></div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-100"><span style={{ color: "var(--muted, #64748B)" }}>Availability</span><p className="font-bold text-slate-800 text-sm mt-0.5">+{defaultRecommendation.breakdown.availability}</p></div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-100"><span style={{ color: "var(--muted, #64748B)" }}>Workload Penalty</span><p className="font-bold text-slate-800 text-sm mt-0.5">-{defaultRecommendation.breakdown.workloadPenalty}</p></div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-100"><span style={{ color: "var(--muted, #64748B)" }}>Processing Penalty</span><p className="font-bold text-slate-800 text-sm mt-0.5">-{defaultRecommendation.breakdown.processingPenalty}</p></div>
              </div>
            </>
          )
        ) : (
          /* SIDE-BY-SIDE DUAL OFFICER COMPARISON VIEW */
          <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 items-center">
            {/* ORIGINAL RECOMMENDED OFFICER */}
            <div className="lg:col-span-5 p-4 rounded-xl border border-slate-200 bg-slate-50/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Initial AI Recommendation</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-600">Replaced</span>
              </div>
              <p className="text-base font-bold text-slate-800">
                {defaultRecommendation?.officer.name} — Score {defaultRecommendation?.score}
              </p>
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                <div><span className="text-slate-500">Authority</span><p className="font-semibold">+{defaultRecommendation?.breakdown.authority}</p></div>
                <div><span className="text-slate-500">Skill</span><p className="font-semibold">+{defaultRecommendation?.breakdown.skill}</p></div>
                <div><span className="text-slate-500">Workload</span><p className="font-semibold">-{defaultRecommendation?.breakdown.workloadPenalty}</p></div>
=======
      {/* RECOMMENDED OFFICER */}
      <div
        className="rounded-lg border bg-white p-6 mb-6"
        style={{ borderColor: "var(--border)" }}
      >
        <h3
          className="font-semibold mb-3 text-sm uppercase tracking-wide"
          style={{ color: "var(--muted)" }}
        >
          Recommended Officer
        </h3>

        {recommendation && (
          <>
            <p className="text-lg font-semibold">
              {recommendation.officer.name} — Score{" "}
              {recommendation.score}
            </p>

            <div className="grid grid-cols-5 gap-3 mt-3 text-sm">
              <div>
                Authority Match
                <p className="font-medium">
                  +{recommendation.breakdown.authority}
                </p>
              </div>

              <div>
                Skill Match
                <p className="font-medium">
                  +{recommendation.breakdown.skill}
                </p>
              </div>

              <div>
                Availability
                <p className="font-medium">
                  +{recommendation.breakdown.availability}
                </p>
              </div>

              <div>
                Workload Penalty
                <p className="font-medium">
                  -{recommendation.breakdown.workloadPenalty}
                </p>
              </div>

              <div>
                Processing Penalty
                <p className="font-medium">
                  -{recommendation.breakdown.processingPenalty}
                </p>
>>>>>>> 19f4eb9b45e6b4dd2d9bb439d57c304810f6978b
              </div>
            </div>

            {/* TRANSFER INDICATOR ARROW */}
            <div className="lg:col-span-1 flex justify-center items-center">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-sm shadow-sm">
                →
              </span>
            </div>

            {/* NEWLY REASSIGNED OFFICER */}
            <div className="lg:col-span-5 p-4 rounded-xl border-2 border-blue-500 bg-blue-50/50 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">Reassigned Active Officer</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-600 text-white">Active</span>
              </div>
              <p className="text-base font-bold text-blue-950">
                {reassignedOfficerName}
              </p>
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                <div><span className="text-blue-700">Authority</span><p className="font-semibold text-blue-900">+{reassignedRecommendation?.breakdown.authority ?? 3}</p></div>
                <div><span className="text-blue-700">Skill</span><p className="font-semibold text-blue-900">+{reassignedRecommendation?.breakdown.skill ?? 2}</p></div>
                <div><span className="text-blue-700">Availability</span><p className="font-semibold text-blue-900">+{reassignedRecommendation?.breakdown.availability ?? 2}</p></div>
              </div>
            </div>
          </div>
        )}
      </div>

<<<<<<< HEAD
      {/* SLA Breach Risk & Simulation Trigger Card */}
      <div className="rounded-lg border bg-white p-6" style={{ borderColor: "var(--border, #E2E8F0)" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-xs uppercase tracking-wide" style={{ color: "var(--muted, #64748B)" }}>SLA Breach Risk</h3>
          <span className="text-2xl font-bold" style={{ color: riskColor(slaRisk.level) }}>{slaRisk.percentage}%</span>
        </div>
        <p className="text-sm mb-4" style={{ color: "var(--muted, #64748B)" }}>
          Finance queue: {financeStep.queue_length} files · Assigned: {reassignedOfficerName || "Officer A (42/50 load)"}
=======
      {/* SLA BREACH RISK */}
      <div
        className="rounded-lg border bg-white p-6 mb-6"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3
            className="font-semibold text-sm uppercase tracking-wide"
            style={{ color: "var(--muted)" }}
          >
            SLA Breach Risk
          </h3>

          <span
            className="text-2xl font-bold"
            style={{
              color: riskColor(slaRisk.level),
            }}
          >
            {slaRisk.percentage}%
          </span>
        </div>

        <p
          className="text-sm mb-4"
          style={{ color: "var(--muted)" }}
        >
          Finance queue: {financeStep.queue_length} files ·
          Assigned: Officer A (42/50 load)
>>>>>>> 19f4eb9b45e6b4dd2d9bb439d57c304810f6978b
        </p>

        <div className="flex gap-3">
<<<<<<< HEAD
          <button onClick={handleWhy} className="px-4 py-2 rounded text-sm font-medium text-white shadow-sm hover:opacity-90 transition-opacity" style={{ background: "var(--navy, #0F172A)" }}>
            WHY?
          </button>
          <button onClick={handleSimulate} className="px-4 py-2 rounded text-sm font-medium border hover:bg-slate-50 transition-colors" style={{ borderColor: "var(--border, #E2E8F0)" }}>
=======
          <button
            onClick={handleWhy}
            className="px-4 py-2 rounded text-sm font-medium text-white"
            style={{ background: "var(--navy)" }}
          >
            WHY?
          </button>

          <button
            onClick={handleSimulate}
            className="px-4 py-2 rounded text-sm font-medium border"
            style={{ borderColor: "var(--border)" }}
          >
>>>>>>> 19f4eb9b45e6b4dd2d9bb439d57c304810f6978b
            Simulate Officer Unavailable
          </button>
        </div>

        {/* WHY RESULT */}
        {whyOpen && (
<<<<<<< HEAD
          <div className="mt-4 p-4 rounded border text-sm" style={{ borderColor: "var(--border, #E2E8F0)", background: "var(--bg, #F8FAFC)" }}>
            {explLoading ? "Generating explanation..." : explanation}
=======
          <div
            className="mt-4 p-4 rounded border text-sm"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg)",
            }}
          >
            {explLoading
              ? "Generating explanation..."
              : explanation}
>>>>>>> 19f4eb9b45e6b4dd2d9bb439d57c304810f6978b
          </div>
        )}

        {/* SIMULATION RESULT */}
        {simResult && (
<<<<<<< HEAD
          <div className="mt-4 p-4 rounded border text-sm grid grid-cols-2 gap-6" style={{ borderColor: "var(--border, #E2E8F0)" }}>
=======
          <div
            className="mt-4 p-4 rounded border text-sm grid grid-cols-2 gap-6"
            style={{ borderColor: "var(--border)" }}
          >
>>>>>>> 19f4eb9b45e6b4dd2d9bb439d57c304810f6978b
            <div>
              <p className="font-semibold mb-1">
                Current
              </p>

              <p>
                Officer:{" "}
                {simResult.before?.officer.name}
              </p>

              <p>
                Score: {simResult.before?.score}
              </p>

              <p>
                SLA Risk:{" "}
                {simResult.slaRiskBefore.percentage}%
              </p>
            </div>

            <div>
              <p className="font-semibold mb-1">
                If Officer A Unavailable
              </p>

              <p>
                Officer:{" "}
                {simResult.after?.officer.name}
              </p>

              <p>
                Score: {simResult.after?.score}
              </p>

              <p>
                SLA Risk:{" "}
                {simResult.slaRiskAfter.percentage}%
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}