import Link from "next/link";
import { getCaseById, getWorkflowSteps } from "@/lib/supabase/cases";
import { getOfficers } from "@/lib/supabase/data";
import { validateDocuments, WORKFLOW_TEMPLATES } from "@/lib/workflow/templates";
import { calculateSLARisk } from "@/lib/calculations/slaRisk";
import { recommendOfficer } from "@/lib/calculations/officerScore";
import { officersForDepartment } from "@/lib/simulation/workload";
import { CaseType } from "@/types";
import AssignOfficerControl from "@/components/AssignOfficerControl";

// This route is the single authoritative view for ONE case, identified
// by the database ID in the URL. Everything here is derived from that
// exact row — never "latest case", never lib/demo/seedData.ts. If the
// row can't be found or Supabase isn't configured, we say so explicitly
// instead of silently substituting demo/seed data (STEP 16, no fake
// fallbacks).

function riskColor(level: string) {
  if (level === "high") return "var(--critical, #EF4444)";
  if (level === "medium") return "var(--warning, #F59E0B)";
  return "var(--success, #10B981)";
}

function statusBadgeClass(level: string) {
  if (level === "high") return "gf-status gf-status-critical";
  if (level === "medium") return "gf-status gf-status-warning";
  return "gf-status gf-status-success";
}

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getCaseById(id);

  if (!result) {
    return (
      <main className="px-8 py-8 max-w-3xl mx-auto">
        <Link href="/cases" className="text-sm font-medium" style={{ color: "var(--navy)" }}>
          ← Back to Cases
        </Link>

        <div
          className="mt-6 rounded-lg border p-6 text-sm"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}
        >
          <p className="font-semibold mb-1" style={{ color: "var(--navy)" }}>
            Case not available
          </p>
          <p>
            We couldn&apos;t load case <span className="font-mono">{id}</span>. Either it doesn&apos;t
            exist, or the database connection isn&apos;t configured. This page never falls back to
            demo data — check your Supabase environment variables if this is unexpected.
          </p>
        </div>
      </main>
    );
  }

  const { caseRecord, documents } = result;
  const caseType = caseRecord.case_type as CaseType;

  // Present documents come from the documents table when available,
  // falling back to extracted_data.documents_detected (set at analysis
  // time, before any per-document rows existed).
  const documentsDetected =
    documents.length > 0
      ? documents.filter((d) => d.status === "present").map((d) => d.doc_type)
      : ((caseRecord.extracted_data as { documents_detected?: string[] })
          ?.documents_detected ?? []);

  const validation = validateDocuments(caseType, documentsDetected);

  const template = WORKFLOW_TEMPLATES[caseType] ?? [];
  const currentStepIndex = Math.min(
    Math.max((caseRecord.current_step ?? 1) - 1, 0),
    Math.max(template.length - 1, 0)
  );
  const currentStepDef = template[currentStepIndex];

  const { officers } = await getOfficers();

  // Real, persisted per-case workflow steps (created when the case was
  // first saved — see persistExtractedCase). Assignment reads/writes
  // against these rows, not the static template, and not the seed
  // demo cases from lib/demo/seedData.ts.
  const workflowSteps = await getWorkflowSteps(caseRecord.id);
  const stepsAvailable = workflowSteps.length > 0;

  const activeStep =
    workflowSteps.find((s) => s.status === "in_progress") ??
    workflowSteps.find((s) => s.status === "pending") ??
    workflowSteps[currentStepIndex] ??
    null;

  const recommendation = activeStep ? recommendOfficer(officers, activeStep) : null;

  const slaRisk = calculateSLARisk({
    createdAt: caseRecord.created_at,
    slaHours: caseRecord.sla_hours,
    queueLength: recommendation?.officer.current_load ?? 0,
    priority: caseRecord.priority,
  });

  return (
    <main className="min-h-screen px-8 py-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/cases" className="text-sm font-medium" style={{ color: "var(--navy)" }}>
            ← Back to Cases
          </Link>
          <h1 className="text-2xl font-semibold mt-2" style={{ color: "var(--navy, #0F172A)" }}>
            {caseRecord.case_number} — {caseType.replace(/_/g, " ")}
          </h1>
        </div>

        <span
          className="text-xs font-medium px-3 py-1 rounded-full border"
          style={{ borderColor: "var(--border, #E2E8F0)", color: "var(--muted, #64748B)" }}
        >
          AI-POWERED CASE PROCESSING
        </span>
      </div>

      {/* CASE SUMMARY */}
      <div className="rounded-lg border bg-white p-6" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">
              {caseRecord.applicant_name || "Applicant name not available"}
            </h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {caseRecord.summary || "No summary available for this case."}
            </p>
          </div>

          <span
            className="text-sm font-semibold px-3 py-1 rounded"
            style={{
              background: `${riskColor(slaRisk.level)}1A`,
              color: riskColor(slaRisk.level),
            }}
          >
            {slaRisk.level === "high" ? "🔴 AT RISK" : slaRisk.level === "medium" ? "🟠 WATCH" : "🟢 ON TRACK"}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span style={{ color: "var(--muted)" }}>Case ID</span>
            <p className="font-medium font-mono text-xs mt-1">{caseRecord.id}</p>
          </div>
          <div>
            <span style={{ color: "var(--muted)" }}>District</span>
            <p className="font-medium">{caseRecord.district || "Not available"}</p>
          </div>
          <div>
            <span style={{ color: "var(--muted)" }}>Priority</span>
            <p className="font-medium capitalize">{caseRecord.priority || "Not available"}</p>
          </div>
          <div>
            <span style={{ color: "var(--muted)" }}>SLA</span>
            <p className="font-medium">{caseRecord.sla_hours}h</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DOCUMENT CHECK */}
        <div className="gf-card overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--navy)" }}>Document Check</h3>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                Required documents for {caseType.replace(/_/g, " ")}.
              </p>
            </div>
            <span className={validation.complete ? "gf-status gf-status-success" : "gf-status gf-status-critical"}>
              {validation.complete ? "Complete" : `${validation.missing.length} missing`}
            </span>
          </div>

          <div className="px-6 py-4 space-y-2 text-sm">
            {validation.required.length === 0 && (
              <p style={{ color: "var(--muted)" }}>No document requirements defined for this case type.</p>
            )}
            {validation.required.map((doc) => {
              const present = validation.present.includes(doc);
              return (
                <div key={doc} className="flex items-center justify-between">
                  <span>{doc.replace(/_/g, " ")}</span>
                  <span style={{ color: present ? "var(--success)" : "var(--critical)" }}>
                    {present ? "✓ Present" : "✗ Missing"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* WORKFLOW */}
        <div className="gf-card overflow-hidden">
          <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--navy)" }}>Workflow</h3>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              {stepsAvailable
                ? `${workflowSteps.filter((s) => s.status === "completed").length} of ${workflowSteps.length} steps complete.`
                : "No workflow steps found for this case."}
            </p>
          </div>

          <div className="px-6 py-4 space-y-4 text-sm">
            {!stepsAvailable && (
              <p style={{ color: "var(--muted)" }}>
                This case has no persisted workflow steps — it may have been created before
                workflow tracking was added. Re-upload the document to generate steps, or add
                them manually in Supabase.
              </p>
            )}
            {workflowSteps.map((step) => {
              const isActive = step.id === activeStep?.id;
              const assignedOfficer = officers.find((o) => o.id === step.assigned_officer_id);
              const eligibleOfficers = officersForDepartment(officers, step.department, []);

              return (
                <div key={step.id} className="border-b last:border-0 pb-4 last:pb-0" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center justify-between">
                    <span
                      className={isActive ? "font-semibold" : ""}
                      style={{ color: isActive ? "var(--navy)" : "var(--text)" }}
                    >
                      {step.step_order}. {step.step_name}
                    </span>
                    <span
                      className={
                        step.status === "completed"
                          ? "gf-status gf-status-success"
                          : step.status === "in_progress"
                          ? "gf-status gf-status-warning"
                          : "gf-status"
                      }
                      style={step.status === "pending" ? { background: "var(--bg)", color: "var(--muted)" } : undefined}
                    >
                      {step.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{step.department}</p>

                  <div className="mt-2">
                    {assignedOfficer ? (
                      <p className="text-xs">
                        Assigned to <strong>{assignedOfficer.name}</strong>
                        {step.status !== "completed" && (
                          <span className="ml-2">
                            <AssignOfficerControl
                              caseId={caseRecord.id}
                              stepId={step.id}
                              eligibleOfficers={eligibleOfficers}
                              currentOfficerId={step.assigned_officer_id}
                            />
                          </span>
                        )}
                      </p>
                    ) : step.status === "completed" ? (
                      <p className="text-xs" style={{ color: "var(--muted)" }}>No officer recorded.</p>
                    ) : (
                      <AssignOfficerControl
                        caseId={caseRecord.id}
                        stepId={step.id}
                        eligibleOfficers={eligibleOfficers}
                        currentOfficerId={step.assigned_officer_id}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RESOURCE INTELLIGENCE */}
      <div className="gf-card overflow-hidden">
        <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--navy)" }}>Resource Intelligence</h3>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Recommended officer for the current step ({currentStepDef?.name ?? "n/a"}).
          </p>
        </div>

        <div className="px-6 py-4 text-sm">
          {recommendation ? (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span style={{ color: "var(--muted)" }}>Officer</span>
                <p className="font-medium">{recommendation.officer.name}</p>
              </div>
              <div>
                <span style={{ color: "var(--muted)" }}>Match score</span>
                <p className="font-medium">{recommendation.score}</p>
              </div>
              <div>
                <span style={{ color: "var(--muted)" }}>Current load</span>
                <p className="font-medium">
                  {recommendation.officer.current_load}/{recommendation.officer.max_load}
                </p>
              </div>
            </div>
          ) : (
            <p style={{ color: "var(--muted)" }}>
              No eligible officer found for this step, or no workflow step is currently active.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
