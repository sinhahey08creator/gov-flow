import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractionSchema, extractDocument } from "../documentExtraction";

// Mock the Gemini client module so these tests don't hit a real API and
// can deterministically exercise each branch (no key / success / schema
// failure / thrown error).
vi.mock("../client", () => ({
  getGeminiClient: vi.fn(),
}));

import { getGeminiClient } from "../client";

function mockGeminiReturning(jsonText: string) {
  (getGeminiClient as ReturnType<typeof vi.fn>).mockReturnValue({
    getGenerativeModel: () => ({
      generateContent: async () => ({
        response: { text: () => jsonText },
      }),
    }),
  });
}

describe("extractionSchema", () => {
  it("accepts a fully-populated valid extraction", () => {
    const result = extractionSchema.safeParse({
      case_type: "land_compensation",
      case_name: null,
      applicant_name: "Suresh Kumar",
      district: "Karnal",
      department: "Revenue",
      subject_matter: "Land acquisition",
      priority: "medium",
      documents_detected: ["application_form"],
      missing_documents: [],
      summary: "A land compensation claim.",
      filing_date: null,
      court: null,
      status: null,
      extracted_facts: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts case_type 'unsupported' for real documents outside GovFlow's workflows", () => {
    const result = extractionSchema.safeParse({
      case_type: "unsupported",
      case_name: "Gopal Singh Visharad v. State of Uttar Pradesh & Others",
      applicant_name: null,
      district: null,
      department: null,
      subject_matter: "Property title / right to worship",
      priority: "medium",
      documents_detected: [],
      missing_documents: [],
      summary: "A title dispute case, not a GovFlow-supported case type.",
      filing_date: "16 January 1950",
      court: "Supreme Court of India",
      status: "Disposed",
      extracted_facts: ["Suit No. 1 of 1950"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a fabricated case_type not in the enum", () => {
    const result = extractionSchema.safeParse({
      case_type: "criminal_appeal",
      case_name: null,
      applicant_name: null,
      district: null,
      department: null,
      subject_matter: null,
      priority: "medium",
      documents_detected: [],
      missing_documents: [],
      summary: "x",
      filing_date: null,
      court: null,
      status: null,
      extracted_facts: [],
    });
    expect(result.success).toBe(false);
  });

  it("allows null applicant_name/district instead of forcing invented values", () => {
    const result = extractionSchema.safeParse({
      case_type: "citizen_grievance",
      case_name: null,
      applicant_name: null,
      district: null,
      department: null,
      subject_matter: null,
      priority: "low",
      documents_detected: [],
      missing_documents: [],
      summary: "Not enough info in the document.",
      filing_date: null,
      court: null,
      status: null,
      extracted_facts: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("extractDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns demo_ai when Gemini isn't configured (no API key)", async () => {
    (getGeminiClient as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const result = await extractDocument("some real extracted PDF text");
    expect(result.status).toBe("demo_ai");
    expect(result.data?.applicant_name).toBe("Ram Kumar"); // canned demo data, clearly labeled upstream
  });

  it("returns demo_ai (not ai_error) when documentText is empty, regardless of config", async () => {
    (getGeminiClient as ReturnType<typeof vi.fn>).mockReturnValue({});
    const result = await extractDocument("   ");
    expect(result.status).toBe("demo_ai");
  });

  it("returns ai_analyzed with the model's actual output when Gemini succeeds", async () => {
    mockGeminiReturning(
      JSON.stringify({
        case_type: "unsupported",
        case_name: "Gopal Singh Visharad v. State of Uttar Pradesh & Others",
        applicant_name: null,
        district: null,
        department: null,
        subject_matter: "Property title / right to worship",
        priority: "medium",
        documents_detected: [],
        missing_documents: [],
        summary: "A title dispute, not a GovFlow-supported case.",
        filing_date: "16 January 1950",
        court: "Supreme Court of India",
        status: "Disposed",
        extracted_facts: ["Suit No. 1 of 1950"],
      })
    );

    const result = await extractDocument(
      "Gopal Singh Visharad v. State of Uttar Pradesh & Others, Suit No. 1 of 1950..."
    );

    expect(result.status).toBe("ai_analyzed");
    expect(result.data?.case_type).toBe("unsupported");
    expect(result.data?.applicant_name).toBeNull();
    // Must NOT be the demo fallback's invented applicant
    expect(result.data?.applicant_name).not.toBe("Ram Kumar");
  });

  it("returns ai_error (not a silent demo fallback) when the model's output fails schema validation", async () => {
    mockGeminiReturning(JSON.stringify({ not: "the expected shape" }));

    const result = await extractDocument("some real document text");

    expect(result.status).toBe("ai_error");
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("returns ai_error (not a silent demo fallback) when the Gemini call throws", async () => {
    (getGeminiClient as ReturnType<typeof vi.fn>).mockReturnValue({
      getGenerativeModel: () => ({
        generateContent: async () => {
          throw new Error("network error");
        },
      }),
    });

    const result = await extractDocument("some real document text");

    expect(result.status).toBe("ai_error");
    expect(result.data).toBeNull();
  });

  it("returns ai_error when Gemini wraps valid JSON in markdown fences but content is still invalid", async () => {
    mockGeminiReturning("```json\n{\"bad\": true}\n```");

    const result = await extractDocument("some real document text");

    expect(result.status).toBe("ai_error");
  });
});
