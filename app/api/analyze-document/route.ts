import { NextRequest, NextResponse } from "next/server";
import { extractDocument } from "@/lib/gemini/documentExtraction";
import { validateDocuments, SLA_HOURS } from "@/lib/workflow/templates";
import { persistExtractedCase } from "@/lib/supabase/cases";
import { CaseType } from "@/types";

export async function POST(req: NextRequest) {
  let documentText: string;
  try {
    const body = (await req.json()) as { documentText?: string };
    documentText = body.documentText ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // documentText arrives already-extracted from the client (see
  // lib/pdf/extractText.ts + components/DocumentUpload.tsx). If a real
  // file was uploaded but produced no text, the client is expected to
  // stop before ever calling this route — but guard anyway.
  if (!documentText.trim()) {
    return NextResponse.json(
      { error: "No document text was provided to analyze." },
      { status: 400 }
    );
  }

  try {
    const { data, status, error } = await extractDocument(documentText);

    if (status === "ai_error" || !data) {
      return NextResponse.json(
        { error: error ?? "AI analysis failed. Please try again.", status: "ai_error" },
        { status: 502 }
      );
    }

    // "unsupported" means the real document doesn't map to any GovFlow
    // workflow template. Don't run it through validateDocuments/SLA_HOURS
    // (both keyed on the 3 real CaseTypes) and don't persist it.
    if (data.case_type === "unsupported") {
      return NextResponse.json({
        extraction: data,
        validation: null,
        sla_hours: null,
        status,
      });
    }

    const caseType = data.case_type as CaseType;
    const validation = validateDocuments(caseType, data.documents_detected);
    const slaHours = SLA_HOURS[caseType];

    let persisted: { caseId: string } | null = null;
    if (status === "ai_analyzed") {
      persisted = await persistExtractedCase(caseType, slaHours, data);
    }

    return NextResponse.json({
      extraction: data,
      validation,
      sla_hours: slaHours,
      status, // "ai_analyzed" | "demo_ai" — surfaced honestly in the UI
      persisted_case_id: persisted?.caseId ?? null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "We couldn't analyze this document. Please try again.", status: "ai_error" },
      { status: 500 }
    );
  }
}
