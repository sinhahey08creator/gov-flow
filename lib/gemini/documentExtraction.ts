import { z } from "zod";
import { getGeminiClient } from "./client";

export const extractionSchema = z.object({
  case_type: z.enum(["land_compensation", "birth_certificate_correction", "citizen_grievance"]),
  applicant_name: z.string(),
  district: z.string(),
  priority: z.enum(["low", "medium", "high"]),
  documents_detected: z.array(z.string()),
  missing_documents: z.array(z.string()),
  summary: z.string(),
});

export type ExtractionResult = z.infer<typeof extractionSchema>;

const DEMO_FALLBACK: ExtractionResult = {
  case_type: "land_compensation",
  applicant_name: "Ram Kumar",
  district: "Panipat",
  priority: "high",
  documents_detected: ["application_form", "id_proof", "land_record", "bank_details"],
  missing_documents: ["acquisition_order"],
  summary:
    "Applicant is requesting compensation for land acquired for road construction.",
};

const EXTRACTION_PROMPT = `You are extracting structured information from a government case document.
Return ONLY valid JSON, no markdown fences, no preamble, matching exactly this shape:
{
  "case_type": "land_compensation" | "birth_certificate_correction" | "citizen_grievance",
  "applicant_name": string,
  "district": string,
  "priority": "low" | "medium" | "high",
  "documents_detected": string[],
  "missing_documents": string[],
  "summary": string
}
documents_detected values must be from this set: application_form, id_proof, land_record, bank_details, acquisition_order, existing_certificate, supporting_document.
Do not invent numeric values. If uncertain about priority, default to "medium".`;

export async function extractDocument(
  documentText: string
): Promise<{ data: ExtractionResult; source: "gemini" | "demo_fallback" }> {
  const gemini = getGeminiClient();

  if (!gemini || !documentText.trim()) {
    return { data: DEMO_FALLBACK, source: "demo_fallback" };
  }

  try {
    const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent([
      EXTRACTION_PROMPT,
      `Document text:\n${documentText}`,
    ]);
    const raw = result.response.text().trim();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const validated = extractionSchema.safeParse(parsed);

    if (!validated.success) {
      console.error("Gemini extraction failed schema validation:", validated.error);
      return { data: DEMO_FALLBACK, source: "demo_fallback" };
    }
    return { data: validated.data, source: "gemini" };
  } catch (err) {
    console.error("Gemini extraction error, using demo fallback:", err);
    return { data: DEMO_FALLBACK, source: "demo_fallback" };
  }
}
