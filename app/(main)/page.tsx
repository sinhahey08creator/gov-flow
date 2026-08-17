"use client";

import { useEffect, useState } from "react";

import {
  DEMO_CASE,
  SEED_OFFICERS,
  DEMO_FINANCE_QUEUE_LENGTH,
  DEMO_ASSIGNED_OFFICER_ID,
} from "@/lib/demo/seedData";

import {
  WORKFLOW_TEMPLATES,
  validateDocuments,
  DEMO_CASES,
} from "@/lib/workflow/templates";

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

const documentsDetected =
  (DEMO_CASE.extracted_data as {
    documents_detected?: string[];
  })?.documents_detected ?? [];

const validation = validateDocuments(
  DEMO_CASE.case_type as CaseType,
  documentsDetected
);

const recommendation = recommendOfficer(
  SEED_OFFICERS,
  financeStep
);

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
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationMethod, setNotificationMethod] = useState<"email" | "sms">("email");
  const [notificationSent, setNotificationSent] = useState(false);
  const [notificationSending, setNotificationSending] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);

  const [caseType, setCaseType] =
    useState("Land Compensation");

  const [applicantName, setApplicantName] = useState("");
  const [district, setDistrict] = useState("");
  const [caseFile, setCaseFile] = useState<File | null>(null);

  const [caseCreated, setCaseCreated] = useState(false);

  const [explanation, setExplanation] =
    useState<string | null>(null);

  const [explLoading, setExplLoading] = useState(false);

  const [simResult, setSimResult] = useState<
    ReturnType<typeof simulateOfficerUnavailable> | null
  >(null);

  const [reassignedOfficerName, setReassignedOfficerName] =
    useState<string | null>(null);

  /*
   * Watch for reassignment changes made by the What-If workflow.
   */
  useEffect(() => {
    const checkReassignment = () => {
      const activeCase = DEMO_CASES.find(
        (c) =>
          c.case_number === "GF-1024" ||
          c.case_number === "GF-1025"
      );

      if (
        activeCase &&
        activeCase.assigned_officer &&
        activeCase.assigned_officer !==
        "Officer B (Finance Verification)"
      ) {
        setReassignedOfficerName(
          activeCase.assigned_officer
        );
      }
    };

    checkReassignment();

    const interval = setInterval(
      checkReassignment,
      800
    );

    return () => clearInterval(interval);
  }, []);

  /*
   * Reassigned officer information.
   */
  const reassignedOfficerObj = SEED_OFFICERS.find(
    (officer) =>
      reassignedOfficerName?.includes(officer.name)
  );

  const reassignedRecommendation =
    reassignedOfficerObj
      ? recommendOfficer(
        SEED_OFFICERS.map((officer) =>
          officer.id === reassignedOfficerObj.id
            ? {
              ...officer,
              current_load: Math.max(
                1,
                officer.current_load - 2
              ),
            }
            : officer
        ),
        financeStep
      )
      : null;

  /*
   * Generate AI explanation for SLA risk.
   */
  async function handleWhy() {
    setWhyOpen(true);
    setExplLoading(true);

    logAction(
      "why generated",
      "AI generated causal explanation for SLA risk bottleneck"
    );

    try {
      const res = await fetch(
        "/api/explain-bottleneck",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            case_id: DEMO_CASE.case_number,
            department: financeStep.department,
            officer:
              recommendation?.officer.name ??
              "Unknown",
            current_load:
              recommendation?.officer.current_load ??
              0,
            queue_length:
              financeStep.queue_length ?? 0,
            avg_processing_days:
              recommendation?.officer
                .avg_processing_days ?? 0,
            sla_risk: slaRisk.percentage,
            priority: DEMO_CASE.priority,
          }),
        }
      );

      const data = await res.json();

      setExplanation(
        data.explanation ??
        "No explanation was returned."
      );
    } catch {
      setExplanation(
        "Could not generate explanation right now."
      );
    } finally {
      setExplLoading(false);
    }
  }

  /*
   * Simulate the currently assigned officer becoming unavailable.
   */
  function handleSimulate() {
    const result =
      simulateOfficerUnavailable({
        currentOfficerId:
          DEMO_ASSIGNED_OFFICER_ID,
        officers: SEED_OFFICERS,
        step: financeStep,
        caseData: DEMO_CASE,
      });

    setSimResult(result);

    logAction(
      "simulation run",
      "Simulated Officer A unavailable"
    );
  }

  /*
   * Create a new case.
   */
  function handleCreateCase() {
    if (
      !applicantName.trim() ||
      !district.trim() ||
      !caseFile
    ) {
      alert(
        "Please enter the applicant name, district, and upload a case document."
      );
      return;
    }

    const caseNumber = `GF-${Date.now()
      .toString()
      .slice(-4)}`;

    const newCase = {
      id: `case-${Date.now()}`,
      case_number: caseNumber,
      case_type: caseType
        .toLowerCase()
        .replace(/ /g, "_"),
      applicant_name: applicantName,
      district,
      priority: "medium",
      status: "pending",
      compensation_status: "not_started",
      current_step: 1,
      created_at: new Date().toISOString(),
      sla_hours: 72,
    };

    try {
      const existingCases = JSON.parse(
        localStorage.getItem(
          "govflow-cases"
        ) || "[]"
      );

      localStorage.setItem(
        "govflow-cases",
        JSON.stringify([
          ...existingCases,
          newCase,
        ])
      );
    } catch (error) {
      console.error(
        "Could not save case:",
        error
      );
    }

    logAction(
      "case created",
      `Created new case ${caseNumber} for applicant ${applicantName}`
    );

    setCaseCreated(true);
  }

  return (
    <main className="min-h-screen px-8 py-8 max-w-6xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{
              color: "var(--navy, #0F172A)",
            }}
          >
            GovFlow AI
          </h1>

          <p
            className="text-sm"
            style={{
              color: "var(--muted, #64748B)",
            }}
          >
            Intelligent Government Workflow
            Operations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="text-xs font-medium px-3 py-1 rounded-full border"
            style={{
              borderColor:
                "var(--border, #E2E8F0)",
              color:
                "var(--muted, #64748B)",
            }}
          >
            SYSTEM ACTIVE · Live Workflow Engine
          </span>

          <button
            onClick={() => {
              setNewCaseOpen(true);
              setCaseCreated(false);
            }}
            className="gf-button"
            style={{
              color: "white",
              background: "var(--navy)",
              borderColor: "var(--navy)",
            }}
          >
            + New Case
          </button>
        </div>
      </div>

      {/* NEW CASE MODAL */}
      {newCaseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-xl font-semibold"
                style={{
                  color:
                    "var(--navy, #0F172A)",
                }}
              >
                New Case
              </h2>

              <button
                onClick={() =>
                  setNewCaseOpen(false)
                }
                className="text-xl"
                style={{
                  color:
                    "var(--muted, #64748B)",
                }}
              >
                ×
              </button>
            </div>

            <p
              className="text-sm mb-6"
              style={{
                color:
                  "var(--muted, #64748B)",
              }}
            >
              Upload a government case document
              to begin processing.
            </p>

            <div className="space-y-4">
              {/* CASE TYPE */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Case Type
                </label>

                <select
                  value={caseType}
                  onChange={(e) =>
                    setCaseType(e.target.value)
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{
                    borderColor:
                      "var(--border, #E2E8F0)",
                  }}
                >
                  <option>
                    Land Compensation
                  </option>

                  <option>
                    Birth Certificate Correction
                  </option>

                  <option>
                    Citizen Grievance
                  </option>
                </select>
              </div>

              {/* APPLICANT NAME */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Applicant Name
                </label>

                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) =>
                    setApplicantName(
                      e.target.value
                    )
                  }
                  placeholder="Enter applicant name"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{
                    borderColor:
                      "var(--border, #E2E8F0)",
                  }}
                />
              </div>

              {/* DISTRICT */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  District
                </label>

                <input
                  type="text"
                  value={district}
                  onChange={(e) =>
                    setDistrict(e.target.value)
                  }
                  placeholder="Enter district"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{
                    borderColor:
                      "var(--border, #E2E8F0)",
                  }}
                />
              </div>

              {/* CASE DOCUMENT */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Case Document
                </label>

                {!caseFile ? (
                  <label
                    className="flex items-center justify-center w-full rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
                    style={{
                      borderColor:
                        "var(--border, #E2E8F0)",
                    }}
                  >
                    Choose File

                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        setCaseFile(
                          e.target.files?.[0] ??
                          null
                        );
                        setCaseCreated(false);
                      }}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div
                    className="flex items-center justify-between w-full rounded-md border px-3 py-2 text-sm"
                    style={{
                      borderColor:
                        "var(--border, #E2E8F0)",
                    }}
                  >
                    <span className="truncate">
                      {caseFile.name}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setCaseFile(null);
                        setCaseCreated(false);
                      }}
                      className="ml-3 text-xs font-medium"
                      style={{
                        color:
                          "var(--critical, #EF4444)",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}

                <p
                  className="text-xs mt-1"
                  style={{
                    color:
                      "var(--muted, #64748B)",
                  }}
                >
                  PDF, PNG or JPG · up to 10MB
                </p>

                {/* SUCCESS MESSAGE */}
                {caseCreated && (
                  <div
                    className="mt-2 rounded-md border px-4 py-3 text-sm"
                    style={{
                      borderColor:
                        "var(--success, #10B981)",
                      background: "#F0FDF4",
                      color:
                        "var(--success, #10B981)",
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
                onClick={() =>
                  setNewCaseOpen(false)
                }
                className="px-4 py-2 rounded-md border text-sm"
                style={{
                  borderColor:
                    "var(--border, #E2E8F0)",
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleCreateCase}
                className="px-4 py-2 rounded-md text-sm font-medium text-white"
                style={{
                  background: "#2563EB",
                }}
              >
                Create Case
              </button>
            </div>
          </div>
        </div>
      )}

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* DOCUMENT CHECK */}
        <div className="gf-card overflow-hidden">
          <div
            className="px-6 py-4 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className="text-sm font-semibold"
                  style={{ color: "var(--navy)" }}
                >
                  Document Check
                </h3>

                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--muted)" }}
                >
                  Required documents detected for this case.
                </p>
              </div>

              <span
                className={
                  validation.complete
                    ? "gf-status gf-status-success"
                    : "gf-status gf-status-critical"
                }
              >
                {validation.complete ? "Complete" : "Action Required"}
              </span>
            </div>
          </div>

          <div className="p-6">
            <ul className="space-y-3">
              {validation.required.map((doc) => {
                const present = validation.present.includes(doc);

                return (
                  <li
                    key={doc}
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                        style={{
                          color: present
                            ? "var(--success)"
                            : "var(--critical)",
                          background: present
                            ? "color-mix(in srgb, var(--success) 10%, white)"
                            : "color-mix(in srgb, var(--critical) 10%, white)",
                        }}
                      >
                        {present ? "✓" : "!"}
                      </span>

                      <span
                        className="text-sm capitalize"
                        style={{ color: "var(--text)" }}
                      >
                        {doc.replace(/_/g, " ")}
                      </span>
                    </div>

                    <span
                      className="text-xs font-medium shrink-0"
                      style={{
                        color: present
                          ? "var(--success)"
                          : "var(--critical)",
                      }}
                    >
                      {present ? "Present" : "Missing"}
                    </span>
                  </li>
                );
              })}
            </ul>

            {!validation.complete && (
              <div
                className="mt-5 p-4 rounded-lg border"
                style={{
                  borderColor: "color-mix(in srgb, var(--critical) 25%, var(--border))",
                  background:
                    "color-mix(in srgb, var(--critical) 5%, white)",
                }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "var(--critical)" }}
                  >
                    !
                  </span>

                  <div className="flex-1">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--navy)" }}
                    >
                      Missing document detected
                    </p>

                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--muted)" }}
                    >
                      One or more required documents must be provided before
                      the case can continue.
                    </p>

                    <button
                      className="gf-button mt-3"
                      style={{
                        color: "var(--navy)",
                        background: "white",
                        borderColor: "var(--border)",
                      }}
                    >
                      Request Missing Document
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* WORKFLOW */}
        <div className="gf-card overflow-hidden">
          <div
            className="px-6 py-4 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div>
              <h3
                className="text-sm font-semibold"
                style={{ color: "var(--navy)" }}
              >
                Workflow
              </h3>

              <p
                className="text-xs mt-1"
                style={{ color: "var(--muted)" }}
              >
                Current progress and workflow bottleneck.
              </p>
            </div>
          </div>

          <div className="p-6">
            <ol className="relative space-y-0">
              {steps.map((s, i) => {
                const stepNum = i + 1;

                const isBlocked = stepNum === 4;
                const isDone = stepNum < 4;
                const isLast = i === steps.length - 1;

                return (
                  <li
                    key={s.name}
                    className="relative flex gap-4 min-h-[58px]"
                  >
                    {/* CONNECTOR */}
                    {!isLast && (
                      <span
                        className="absolute left-[11px] top-6 w-px h-[58px]"
                        style={{ background: "var(--border)" }}
                      />
                    )}

                    {/* STEP INDICATOR */}
                    <span
                      className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                      style={{
                        background: isBlocked
                          ? "color-mix(in srgb, var(--critical) 12%, white)"
                          : isDone
                            ? "color-mix(in srgb, var(--success) 12%, white)"
                            : "var(--bg)",
                        color: isBlocked
                          ? "var(--critical)"
                          : isDone
                            ? "var(--success)"
                            : "var(--muted)",
                        border: `1px solid ${isBlocked
                          ? "color-mix(in srgb, var(--critical) 35%, var(--border))"
                          : isDone
                            ? "color-mix(in srgb, var(--success) 35%, var(--border))"
                            : "var(--border)"
                          }`,
                      }}
                    >
                      {isDone ? "✓" : isBlocked ? "!" : stepNum}
                    </span>

                    {/* STEP DETAILS */}
                    <div className="flex-1 pb-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p
                            className={`text-sm ${isBlocked ? "font-semibold" : "font-medium"
                              }`}
                            style={{
                              color: isBlocked
                                ? "var(--critical)"
                                : "var(--text)",
                            }}
                          >
                            {s.name}
                          </p>

                          <p
                            className="text-xs mt-0.5"
                            style={{ color: "var(--muted)" }}
                          >
                            {s.department}
                          </p>
                        </div>

                        {isBlocked && (
                          <span className="gf-status gf-status-critical">
                            Bottleneck
                          </span>
                        )}

                        {isDone && (
                          <span
                            className="text-xs font-medium"
                            style={{ color: "var(--success)" }}
                          >
                            Complete
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>

      {/* RECOMMENDED OFFICER */}
      <div className="gf-card overflow-hidden mb-6">
        <div
          className="px-6 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3
                className="text-sm font-semibold"
                style={{ color: "var(--navy)" }}
              >
                AI Officer Recommendation
              </h3>

              <p
                className="text-xs mt-1"
                style={{ color: "var(--muted)" }}
              >
                Recommended resource based on authority, skills, availability,
                and workload.
              </p>
            </div>

            {reassignedOfficerName && (
              <span className="gf-status gf-status-success">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--success)" }}
                />
                What-If Reassignment Active
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          {!reassignedOfficerName ? (
            recommendation && (
              <div>
                {/* MAIN RECOMMENDATION */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p
                      className="text-xl font-semibold"
                      style={{ color: "var(--navy)" }}
                    >
                      {recommendation.officer.name}
                    </p>

                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--muted)" }}
                    >
                      Best match for the current workflow requirement
                    </p>
                  </div>

                  <div
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--bg)",
                    }}
                  >
                    <span
                      className="text-xs"
                      style={{ color: "var(--muted)" }}
                    >
                      Match Score
                    </span>

                    <span
                      className="text-xl font-bold"
                      style={{ color: "var(--navy)" }}
                    >
                      {recommendation.score}
                    </span>
                  </div>
                </div>

                {/* SCORE BREAKDOWN */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
                  <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      Authority Match
                    </span>

                    <p
                      className="text-sm font-semibold mt-1"
                      style={{ color: "var(--success)" }}
                    >
                      +{recommendation.breakdown.authority}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      Skill Match
                    </span>

                    <p
                      className="text-sm font-semibold mt-1"
                      style={{ color: "var(--success)" }}
                    >
                      +{recommendation.breakdown.skill}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      Availability
                    </span>

                    <p
                      className="text-sm font-semibold mt-1"
                      style={{ color: "var(--success)" }}
                    >
                      +{recommendation.breakdown.availability}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      Workload Penalty
                    </span>

                    <p
                      className="text-sm font-semibold mt-1"
                      style={{ color: "var(--warning)" }}
                    >
                      -{recommendation.breakdown.workloadPenalty}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      Processing Penalty
                    </span>

                    <p
                      className="text-sm font-semibold mt-1"
                      style={{ color: "var(--warning)" }}
                    >
                      -{recommendation.breakdown.processingPenalty}
                    </p>
                  </div>
                </div>
              </div>
            )
          ) : (
            /* WHAT-IF REASSIGNMENT */
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-center">
                {/* ORIGINAL */}
                <div
                  className="rounded-lg border p-4"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--bg)",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "var(--muted)" }}
                    >
                      Initial Recommendation
                    </span>

                    <span className="gf-status">
                      Replaced
                    </span>
                  </div>

                  {recommendation && (
                    <>
                      <p
                        className="text-lg font-semibold"
                        style={{ color: "var(--navy)" }}
                      >
                        {recommendation.officer.name}
                      </p>

                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--muted)" }}
                      >
                        Match Score: {recommendation.score}
                      </p>

                      <div className="grid grid-cols-3 gap-3 mt-4">
                        <div>
                          <span
                            className="text-xs"
                            style={{ color: "var(--muted)" }}
                          >
                            Authority
                          </span>

                          <p className="text-sm font-semibold">
                            +{recommendation.breakdown.authority}
                          </p>
                        </div>

                        <div>
                          <span
                            className="text-xs"
                            style={{ color: "var(--muted)" }}
                          >
                            Skill
                          </span>

                          <p className="text-sm font-semibold">
                            +{recommendation.breakdown.skill}
                          </p>
                        </div>

                        <div>
                          <span
                            className="text-xs"
                            style={{ color: "var(--muted)" }}
                          >
                            Workload
                          </span>

                          <p className="text-sm font-semibold">
                            -{recommendation.breakdown.workloadPenalty}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* ARROW */}
                <div className="flex justify-center">
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
                    style={{
                      background: "var(--navy)",
                      color: "white",
                    }}
                  >
                    →
                  </span>
                </div>

                {/* REASSIGNED */}
                <div
                  className="rounded-lg border-2 p-4"
                  style={{
                    borderColor: "var(--success)",
                    background:
                      "color-mix(in srgb, var(--success) 5%, white)",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "var(--success)" }}
                    >
                      Active Officer
                    </span>

                    <span className="gf-status gf-status-success">
                      Active
                    </span>
                  </div>

                  <p
                    className="text-lg font-semibold"
                    style={{ color: "var(--navy)" }}
                  >
                    {reassignedOfficerName}
                  </p>

                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--muted)" }}
                  >
                    Selected through What-If simulation
                  </p>

                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div>
                      <span
                        className="text-xs"
                        style={{ color: "var(--muted)" }}
                      >
                        Authority
                      </span>

                      <p
                        className="text-sm font-semibold"
                        style={{ color: "var(--success)" }}
                      >
                        +{reassignedRecommendation?.breakdown.authority ?? 3}
                      </p>
                    </div>

                    <div>
                      <span
                        className="text-xs"
                        style={{ color: "var(--muted)" }}
                      >
                        Skill
                      </span>

                      <p
                        className="text-sm font-semibold"
                        style={{ color: "var(--success)" }}
                      >
                        +{reassignedRecommendation?.breakdown.skill ?? 2}
                      </p>
                    </div>

                    <div>
                      <span
                        className="text-xs"
                        style={{ color: "var(--muted)" }}
                      >
                        Availability
                      </span>

                      <p
                        className="text-sm font-semibold"
                        style={{ color: "var(--success)" }}
                      >
                        +{reassignedRecommendation?.breakdown.availability ?? 2}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SLA BREACH RISK */}
      <div className="gf-card overflow-hidden mb-6">
        <div
          className="px-6 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3
                className="text-sm font-semibold"
                style={{ color: "var(--navy)" }}
              >
                SLA Breach Risk
              </h3>

              <p
                className="text-xs mt-1"
                style={{ color: "var(--muted)" }}
              >
                Predicted risk based on queue pressure, workload, priority,
                and remaining SLA time.
              </p>
            </div>

            <span
              className={
                slaRisk.level === "high"
                  ? "gf-status gf-status-critical"
                  : slaRisk.level === "medium"
                    ? "gf-status gf-status-warning"
                    : "gf-status gf-status-success"
              }
            >
              {slaRisk.level.toUpperCase()} RISK
            </span>
          </div>
        </div>

        <div className="p-6">
          {/* RISK SUMMARY */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted)" }}
              >
                Current breach probability
              </p>

              <div className="flex items-baseline gap-2 mt-1">
                <span
                  className="text-4xl font-bold"
                  style={{
                    color: riskColor(slaRisk.level),
                  }}
                >
                  {slaRisk.percentage}%
                </span>

                <span
                  className="text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  predicted risk
                </span>
              </div>
            </div>

            <div
              className="text-sm"
              style={{ color: "var(--muted)" }}
            >
              Finance queue:{" "}
              <span
                className="font-semibold"
                style={{ color: "var(--navy)" }}
              >
                {financeStep.queue_length ?? 0}
              </span>{" "}
              files
            </div>
          </div>

          {/* RISK BAR */}
          <div className="mt-5">
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: "var(--border)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(slaRisk.percentage, 100)}%`,
                  background: riskColor(slaRisk.level),
                }}
              />
            </div>

            <div className="flex justify-between mt-2 text-[11px]">
              <span style={{ color: "var(--success)" }}>
                Low
              </span>

              <span style={{ color: "var(--warning)" }}>
                Medium
              </span>

              <span style={{ color: "var(--critical)" }}>
                High
              </span>
            </div>
          </div>

          {/* ASSIGNMENT INFO */}
          <div
            className="mt-5 p-4 rounded-lg border"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg)",
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p
                  className="text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  Assigned Officer
                </p>

                <p
                  className="text-sm font-semibold mt-1"
                  style={{ color: "var(--navy)" }}
                >
                  {reassignedOfficerName ||
                    "Officer A (42/50 load)"}
                </p>
              </div>

              <div>
                <p
                  className="text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  Queue Pressure
                </p>

                <p
                  className="text-sm font-semibold mt-1"
                  style={{ color: "var(--navy)" }}
                >
                  {financeStep.queue_length ?? 0} active files
                </p>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <button
              onClick={handleWhy}
              className="gf-button"
              style={{
                background: "var(--navy)",
                color: "white",
                borderColor: "var(--navy)",
              }}
            >
              WHY?
            </button>

            <button
              onClick={handleSimulate}
              className="gf-button"
              style={{
                background: "white",
                color: "var(--navy)",
                borderColor: "var(--border)",
              }}
            >
              Simulate Officer Unavailable
            </button>
          </div>

          {/* WHY RESULT */}
          {whyOpen && (
            <div
              className="mt-5 p-4 rounded-lg border"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-2"
                style={{ color: "var(--muted)" }}
              >
                AI Explanation
              </p>

              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text)" }}
              >
                {explLoading
                  ? "Generating explanation..."
                  : explanation}
              </p>
            </div>
          )}

          {/* SIMULATION RESULT */}
          {simResult && (
            <div
              className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {/* CURRENT */}
              <div
                className="p-4 rounded-lg border"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg)",
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wide mb-3"
                  style={{ color: "var(--muted)" }}
                >
                  Current
                </p>

                <p className="text-sm">
                  Officer:{" "}
                  <span className="font-semibold">
                    {simResult.before?.officer.name ??
                      "Unknown"}
                  </span>
                </p>

                <p className="text-sm mt-2">
                  Match Score:{" "}
                  <span className="font-semibold">
                    {simResult.before?.score ?? "N/A"}
                  </span>
                </p>

                <p className="text-sm mt-2">
                  SLA Risk:{" "}
                  <span
                    className="font-semibold"
                    style={{
                      color: riskColor(
                        simResult.slaRiskBefore.level
                      ),
                    }}
                  >
                    {simResult.slaRiskBefore.percentage}%
                  </span>
                </p>
              </div>

              {/* SIMULATED */}
              <div
                className="p-4 rounded-lg border"
                style={{
                  borderColor: "var(--border)",
                  background: "white",
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wide mb-3"
                  style={{ color: "var(--muted)" }}
                >
                  Simulated Scenario
                </p>

                <p className="text-sm">
                  Officer:{" "}
                  <span className="font-semibold">
                    {simResult.after?.officer.name ??
                      "Unknown"}
                  </span>
                </p>

                <p className="text-sm mt-2">
                  Match Score:{" "}
                  <span className="font-semibold">
                    {simResult.after?.score ?? "N/A"}
                  </span>
                </p>

                <p className="text-sm mt-2">
                  SLA Risk:{" "}
                  <span
                    className="font-semibold"
                    style={{
                      color: riskColor(
                        simResult.slaRiskAfter.level
                      ),
                    }}
                  >
                    {simResult.slaRiskAfter.percentage}%
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      {notificationOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setNotificationOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border bg-white p-6 shadow-xl"
            style={{ borderColor: "var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2
                className="text-lg font-semibold"
                style={{ color: "var(--navy)" }}
              >
                Request Missing Document
              </h2>

              <button
                onClick={() => {
                  setNotificationOpen(false);
                  setNotificationSent(false);
                }}
                className="text-lg"
                style={{ color: "var(--muted)" }}
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p style={{ color: "var(--muted)" }}>Missing document</p>
                <p className="font-medium">Acquisition Order</p>
              </div>

              <div>
                <p style={{ color: "var(--muted)" }}>Applicant</p>
                <p className="font-medium">Ram Kumar</p>
              </div>

              <div>
                <p className="mb-2" style={{ color: "var(--muted)" }}>
                  Notify applicant via
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setNotificationMethod("email")}
                    className="px-4 py-2 rounded border text-sm"
                    style={{
                      borderColor:
                        notificationMethod === "email"
                          ? "var(--navy)"
                          : "var(--border)",
                      background:
                        notificationMethod === "email" ? "#F0F4FF" : "white",
                      color: "var(--navy)",
                    }}
                  >
                    Email
                  </button>

                  <button
                    onClick={() => setNotificationMethod("sms")}
                    className="px-4 py-2 rounded border text-sm"
                    style={{
                      borderColor:
                        notificationMethod === "sms"
                          ? "var(--navy)"
                          : "var(--border)",
                      background:
                        notificationMethod === "sms" ? "#F0F4FF" : "white",
                      color: "var(--navy)",
                    }}
                  >
                    SMS
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-2" style={{ color: "var(--muted)" }}>
                  {notificationMethod === "email" ? "Email address" : "Mobile number"}
                </p>

                <input
                  type={notificationMethod === "email" ? "email" : "tel"}
                  defaultValue={
                    notificationMethod === "email"
                      ? "ram.kumar@example.com"
                      : "+91 98765 43210"
                  }
                  className="w-full rounded border px-3 py-2 outline-none"
                  style={{ borderColor: "var(--border)" }}
                />
              </div>

              <div>
                <p className="mb-2" style={{ color: "var(--muted)" }}>
                  Message
                </p>

                <textarea
                  rows={4}
                  defaultValue="Your Acquisition Order is missing from your land compensation application. Please submit the document to continue processing your case."
                  className="w-full rounded border px-3 py-2 outline-none resize-none"
                  style={{ borderColor: "var(--border)" }}
                />
              </div>
            </div>

            {notificationSent && (
              <p
                className="mt-4 text-sm"
                style={{ color: "var(--success)" }}
              >
                ✓ Notification sent successfully.
              </p>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setNotificationOpen(false)}
                className="px-4 py-2 rounded border text-sm"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--navy)",
                }}
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  setNotificationOpen(false);
                  setNotificationSent(false);
                }}
                className="px-4 py-2 rounded text-sm text-white"
                style={{ background: "var(--navy)" }}
              >
                Send Notification
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}