import { NextRequest, NextResponse } from "next/server";
import { extractDocument } from "@/lib/gemini/documentExtraction";
import { validateDocuments, SLA_HOURS } from "@/lib/workflow/templates";

export async function POST(req: NextRequest) {
  try {
    const { documentText } = (await req.json()) as { documentText: string };
    const { data, source } = await extractDocument(documentText ?? "");
    const validation = validateDocuments(data.case_type, data.documents_detected);

    return NextResponse.json({
      extraction: data,
      validation,
      sla_hours: SLA_HOURS[data.case_type],
      source, // "gemini" | "demo_fallback" — surfaced in UI per spec
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "We couldn't analyze this document automatically. Please upload a text-based PDF or try again." },
      { status: 500 }
    );
  }
}
