import { createServerClient, isSupabaseConfigured } from "./server";
import { CaseType, CaseRecord, DocumentRecord, WorkflowStep } from "@/types";
import { ExtractionResult } from "@/lib/gemini/documentExtraction";
import { WORKFLOW_TEMPLATES } from "@/lib/workflow/templates";

/**
 * Persists a real, successfully-extracted (non-demo, non-unsupported)
 * case + its detected documents to Supabase. Server-only — uses the
 * service role key via createServerClient().
 *
 * Mirrors the existing fallback pattern: if Supabase isn't configured,
 * or the write fails, we log and return null rather than throwing —
 * a document upload should still succeed and show results to the user
 * even if persistence isn't available (same reasoning as getOfficers()
 * in lib/supabase/data.ts).
 */
export async function persistExtractedCase(
  caseType: CaseType,
  slaHours: number,
  extraction: ExtractionResult
): Promise<{ caseId: string } | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = createServerClient();
    const caseNumber = `GF-${Date.now().toString().slice(-6)}`;

    const { data: caseRow, error: caseError } = await supabase
      .from("cases")
      .insert({
        case_number: caseNumber,
        case_type: caseType,
        applicant_name: extraction.applicant_name,
        district: extraction.district,
        priority: extraction.priority,
        sla_hours: slaHours,
        status: "pending",
        current_step: 1,
        summary: extraction.summary,
        extracted_data: extraction,
      })
      .select("id")
      .single();

    if (caseError || !caseRow) throw caseError;

    if (extraction.documents_detected.length > 0) {
      const docRows = extraction.documents_detected.map((docType) => ({
        case_id: caseRow.id,
        doc_type: docType,
        status: "present" as const,
      }));
      const { error: docsError } = await supabase.from("documents").insert(docRows);
      if (docsError) console.error("Failed to persist detected documents:", docsError);
    }

    // Create one workflow_steps row per stage in this case type's
    // pipeline, all starting unassigned/pending. Without this, a real
    // case would have no rows to assign an officer to — assignment
    // would have nothing in the database to update.
    const template = WORKFLOW_TEMPLATES[caseType] ?? [];
    if (template.length > 0) {
      const stepRows = template.map((step, i) => ({
        case_id: caseRow.id,
        step_name: step.name,
        department: step.department,
        step_order: i + 1,
        status: i === 0 ? "pending" : "pending",
        assigned_officer_id: null,
        estimated_processing_days: step.estimated_processing_days,
        required_skill: step.required_skill ?? null,
        required_authority: step.required_authority ?? null,
      }));
      const { error: stepsError } = await supabase.from("workflow_steps").insert(stepRows);
      if (stepsError) console.error("Failed to persist workflow steps:", stepsError);
    }

    return { caseId: caseRow.id as string };
  } catch (err) {
    console.error("Failed to persist extracted case to Supabase:", err);
    return null;
  }
}

/**
 * Fetches the workflow_steps rows for a case, ordered by step_order —
 * this is the real, persisted pipeline for that specific case, not the
 * static template. Assignment reads and writes against these rows.
 */
export async function getWorkflowSteps(caseId: string): Promise<WorkflowStep[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("workflow_steps")
      .select("*")
      .eq("case_id", caseId)
      .order("step_order", { ascending: true });

    if (error || !data) {
      console.error("Failed to fetch workflow steps:", error);
      return [];
    }
    return data as WorkflowStep[];
  } catch (err) {
    console.error("Failed to fetch workflow steps:", err);
    return [];
  }
}

/**
 * Assigns an officer to a specific workflow step and marks it
 * in_progress. This is the one place that actually writes an
 * assignment — nothing else in the app should mutate
 * workflow_steps.assigned_officer_id directly.
 */
export async function assignOfficerToStep(
  stepId: string,
  officerId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase is not configured." };
  }

  try {
    const supabase = createServerClient();
    const { error } = await supabase
      .from("workflow_steps")
      .update({ assigned_officer_id: officerId, status: "in_progress" })
      .eq("id", stepId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error("Failed to assign officer:", err);
    return { success: false, error: "Unexpected error while assigning officer." };
  }
}

/**
 * Fetches ONE case by its exact database ID, plus its associated
 * documents — this is the sole read path for /cases/[id]. Deliberately
 * NOT "fetch most recent case": the case-detail route must always show
 * the case whose ID is in the URL, never whatever happens to be latest.
 *
 * Returns null if Supabase isn't configured, the row doesn't exist, or
 * the fetch fails — callers must render an explicit "not found" /
 * "unavailable" state rather than substituting demo data (see STEP 16
 * of the pipeline spec: no fake fallbacks).
 */
export async function getCaseById(
  caseId: string
): Promise<{ caseRecord: CaseRecord; documents: DocumentRecord[] } | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = createServerClient();

    const { data: caseRow, error: caseError } = await supabase
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .single();

    if (caseError || !caseRow) return null;

    const { data: documentRows, error: documentsError } = await supabase
      .from("documents")
      .select("*")
      .eq("case_id", caseId);

    if (documentsError) {
      console.error("Failed to fetch documents for case:", documentsError);
    }

    return {
      caseRecord: caseRow as CaseRecord,
      documents: (documentRows ?? []) as DocumentRecord[],
    };
  } catch (err) {
    console.error("Failed to fetch case by id from Supabase:", err);
    return null;
  }
}
