import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { CaseType, CaseRecord, DocumentRecord } from "@/types";
import { ExtractionResult } from "@/lib/gemini/documentExtraction";

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

    return { caseId: caseRow.id as string };
  } catch (err) {
    console.error("Failed to persist extracted case to Supabase:", err);
    return null;
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
