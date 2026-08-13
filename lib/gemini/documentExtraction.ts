import { z } from "zod";
import { getGeminiClient } from "./client";

// case_type includes "unsupported" for real documents that don't match
// any GovFlow workflow template (e.g. a court judgment, an unrelated
// letter). "unsupported" cases are never persisted or scored — see
// STEP 4 of the extraction pipeline task spec.
export const extractionSchema = z.object({
  case_type: z.enum([
    "land_compensation",
    "birth_certificate_correction",
    "citizen_grievance",
    "unsupported",
  ]),
  case_name: z.string().nullable(),
  applicant_name: z.string().nullable(),
  district: z.string().nullable(),
  department: z.string().nullable(),
  subject_matter: z.string().nullable(),
  priority: z.enum(["low", "medium", "high"]),
  documents_detected: z.array(z.string()),
  missing_documents: z.array(z.string()),
  summary: z.string(),
  filing_date: z.string().nullable(),
  court: z.string().nullable(),
  status: z.string().nullable(),
  extracted_facts: z.array(z.string()).default([]),
});

export type ExtractionResult = z.infer<typeof extractionSchema>;

// Only shown when Gemini is genuinely unavailable (no API key configured).
// Clearly and only ever labeled "DEMO AI" in the UI — never presented as
// having come from an uploaded document.
const DEMO_FALLBACK: ExtractionResult = {
  case_type: "land_compensation",
  case_name: null,
  applicant_name: "Ram Kumar",
  district: "Panipat",
  department: "Revenue",
  subject_matter: "Land acquisition compensation",
  priority: "high",
  documents_detected: ["application_form", "id_proof", "land_record", "bank_details"],
  missing_documents: ["acquisition_order"],
  summary:
    "Applicant is requesting compensation for land acquired for road construction.",
  filing_date: null,
  court: null,
  status: null,
  extracted_facts: [],
};

const EXTRACTION_PROMPT = `You are extracting structured information from a real government or legal document. The text below was extracted directly from an uploaded PDF — treat it as ground truth about one specific case.

Return ONLY valid JSON, no markdown fences, no preamble, matching exactly this shape:
{
  "case_type": "land_compensation" | "birth_certificate_correction" | "citizen_grievance" | "unsupported",
  "case_name": string | null,
  "applicant_name": string | null,
  "district": string | null,
  "department": string | null,
  "subject_matter": string | null,
  "priority": "low" | "medium" | "high",
  "documents_detected": string[],
  "missing_documents": string[],
  "summary": string,
  "filing_date": string | null,
  "court": string | null,
  "status": string | null,
  "extracted_facts": string[]
}

Rules — follow these exactly:
1. GovFlow only supports three workflows: land_compensation (land acquisition compensation claims), birth_certificate_correction (municipal birth certificate correction requests), and citizen_grievance (general citizen grievances against a department). If the document is something else entirely — e.g. a court judgment, a title/property dispute case, a legal notice, an unrelated letter — set "case_type" to "unsupported". Do NOT force-fit it into one of the three workflows just because it superficially mentions land or a certificate.
2. Never invent a value. If a field cannot be determined from the document text, return null for that field (or an empty array for array fields). Do not guess a plausible-sounding name, district, or date that isn't actually in the text.
3. documents_detected values must be drawn from this set where applicable: application_form, id_proof, land_record, bank_details, acquisition_order, existing_certificate, supporting_document. Only include ones you can actually see evidence of in the text.
4. "extracted_facts" is a short list (max 6) of concrete, verifiable facts pulled directly from the text (e.g. case/suit numbers, court names, dates, parties) — useful when case_type is "unsupported" and there's no other structured place to put them.
5. If uncertain about priority, default to "medium".
6. "summary" must describe only what the document actually says, in 1-3 sentences.`;

export type ExtractionStatus = "ai_analyzed" | "demo_ai" | "ai_error";

/**
 * Calls Gemini on real extracted document text and returns a status that
 * honestly distinguishes:
 *  - "demo_ai"      Gemini isn't configured (no API key) OR no text was
 *                    supplied at all — synthetic demo data, clearly labeled.
 *  - "ai_analyzed"   Gemini actually read the supplied text and returned a
 *                    schema-valid result.
 *  - "ai_error"      Real text was supplied, Gemini is configured, but the
 *                    call failed or returned something that didn't pass
 *                    validation. We do NOT silently swap in demo data here
 *                    — that would misrepresent a real document as the
 *                    canned example, which is exactly what this pipeline
 *                    exists to stop.
 */
export async function extractDocument(
  documentText: string
): Promise<{ data: ExtractionResult | null; status: ExtractionStatus; error?: string }> {
  const gemini = getGeminiClient();
  const trimmed = documentText.trim();

  if (!gemini) {
    return { data: DEMO_FALLBACK, status: "demo_ai" };
  }
  if (!trimmed) {
    // Gemini IS configured but no real text came through — this should
    // only happen if a caller bypasses the client-side extraction step.
    return { data: DEMO_FALLBACK, status: "demo_ai" };
  }

  try {
    // gemini-2.0-flash was shut down by Google on June 1, 2026. Using the
    // current recommended replacement — check ai.google.dev/gemini-api/docs/deprecations
    // periodically since Google has been cycling Flash model IDs every
    // few months.
    const model = gemini.getGenerativeModel({ model: "gemini-3.5-flash" });
    const result = await model.generateContent([
      EXTRACTION_PROMPT,
      `Document text:\n${trimmed}`,
    ]);
    const raw = result.response.text().trim();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const validated = extractionSchema.safeParse(parsed);

    if (!validated.success) {
      console.error("Gemini extraction failed schema validation:", validated.error);
      return {
        data: null,
        status: "ai_error",
        error: "The AI's response didn't match the expected format. Please try again.",
      };
    }
    return { data: validated.data, status: "ai_analyzed" };
  } catch (err) {
    console.error("Gemini extraction error:", err);
    return {
      data: null,
      status: "ai_error",
      error: "The AI analysis failed. Please try again in a moment.",
    };
  }
}
