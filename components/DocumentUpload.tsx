"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { extractPdfText, PdfExtractionError } from "@/lib/pdf/extractText";

interface ExtractionData {
  case_type: string;
  case_name: string | null;
  applicant_name: string | null;
  district: string | null;
  department: string | null;
  subject_matter: string | null;
  priority: string;
  documents_detected: string[];
  missing_documents: string[];
  summary: string;
  filing_date: string | null;
  court: string | null;
  status: string | null;
  extracted_facts: string[];
}

interface AnalysisResult {
  extraction: ExtractionData;
  validation: { required: string[]; present: string[]; missing: string[]; complete: boolean } | null;
  sla_hours: number | null;
  status: "ai_analyzed" | "demo_ai";
  persisted_case_id?: string | null;
}

// Distinct UI stages so a user always knows whether they're looking at
// their own document's data, synthetic demo data, or an error — never
// an ambiguous mix. Mirrors STEP 5 of the pipeline spec.
type Stage =
  | "idle"
  | "extracting" // pulling text out of the PDF client-side
  | "analyzing" // sending text to Gemini
  | "done"
  | "extraction_failed" // real PDF, but pdfjs couldn't get text out of it
  | "analysis_failed" // real text, but Gemini call/validation failed
  | "rejected"; // wrong file type / too large

export default function DocumentUpload() {
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  const analyzeFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    setPageCount(null);
    setFileName(file.name);
    setRedirectCountdown(null);

    if (file.type !== "application/pdf") {
      setStage("rejected");
      setError(
        file.type.startsWith("image/")
          ? "Image uploads (PNG/JPG) aren't supported for AI analysis yet — only text-based PDFs. Please upload a PDF."
          : "Please upload a PDF file."
      );
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setStage("rejected");
      setError("File is too large. Please keep it under 10MB.");
      return;
    }

    setStage("extracting");
    let documentText: string;
    try {
      const extracted = await extractPdfText(file);
      documentText = extracted.text;
      setPageCount(extracted.pageCount);
    } catch (err) {
      setStage("extraction_failed");
      setError(
        err instanceof PdfExtractionError
          ? err.message
          : "We couldn't extract text from this PDF. Please try a different file."
      );
      return;
    }

    setStage("analyzing");
    try {
      const res = await fetch("/api/analyze-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentText }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStage("analysis_failed");
        setError(data?.error ?? "AI analysis failed. Please try again.");
        return;
      }

      setResult(data as AnalysisResult);
      setStage("done");
      // Case-detail route (/cases/[id]) is now the single authoritative
      // view for an analyzed case, so once it's actually persisted we
      // hand off there automatically instead of leaving the user on a
      // dashboard that still shows unrelated/stale case sections.
      if (data.persisted_case_id) {
        setRedirectCountdown(2);
      }
    } catch {
      setStage("analysis_failed");
      setError("We couldn't reach the AI analysis service. Please check your connection and try again.");
    }
  }, []);

  useEffect(() => {
    if (redirectCountdown === null || !result?.persisted_case_id) return;
    if (redirectCountdown <= 0) {
      router.push(`/cases/${result.persisted_case_id}`);
      return;
    }
    const timer = setTimeout(() => setRedirectCountdown((c) => (c ?? 0) - 1), 1000);
    return () => clearTimeout(timer);
  }, [redirectCountdown, result, router]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) analyzeFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) analyzeFile(file);
  }

  const busy = stage === "extracting" || stage === "analyzing";
  const isUnsupportedCaseType = result?.extraction.case_type === "unsupported";

  return (
    <div className="rounded-lg border bg-white p-6" style={{ borderColor: "var(--border)" }}>
      <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        Upload Government Case
      </h3>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className="rounded-lg border-2 border-dashed flex flex-col items-center justify-center py-10 text-center transition-colors"
        style={{
          borderColor: dragActive ? "var(--navy)" : "var(--border)",
          background: dragActive ? "#F0F4FF" : "transparent",
        }}
      >
        <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>
          Drag & drop a file, or
        </p>
        <label className="cursor-pointer text-sm font-medium px-4 py-2 rounded text-white" style={{ background: "var(--navy)" }}>
          Choose File
          <input type="file" accept=".pdf" onChange={handleFileInput} className="hidden" />
        </label>
        <p className="text-xs mt-3" style={{ color: "var(--muted)" }}>Supported: text-based PDF · up to 10MB</p>
      </div>

      {fileName && (busy || stage === "done" || stage === "extraction_failed" || stage === "analysis_failed") && (
        <div className="mt-4 text-sm space-y-1" style={{ color: "var(--muted)" }}>
          <p className="font-medium" style={{ color: "var(--navy)" }}>{fileName}{pageCount ? ` · ${pageCount} page${pageCount === 1 ? "" : "s"}` : ""}</p>
          <p>{stage === "extracting" ? "⏳ Extracting document text…" : "✓ Text extracted"}</p>
          {(stage === "analyzing" || stage === "done" || stage === "analysis_failed") && (
            <p>
              {stage === "analyzing"
                ? "⏳ Analyzing with AI…"
                : stage === "analysis_failed"
                ? "✗ AI analysis failed"
                : "✓ AI analysis complete"}
            </p>
          )}
        </div>
      )}

      {error && (stage === "rejected" || stage === "extraction_failed" || stage === "analysis_failed") && (
        <p className="mt-4 text-sm" style={{ color: "var(--critical)" }}>{error}</p>
      )}

      {result && stage === "done" && (
        <div className="mt-4 p-4 rounded border text-sm space-y-2" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
          <span
            className="inline-block text-xs px-2 py-0.5 rounded-full border font-medium"
            style={{
              borderColor: "var(--border)",
              color: result.status === "demo_ai" ? "var(--muted)" : "var(--success)",
            }}
          >
            {result.status === "demo_ai" ? "DEMO AI" : "AI ANALYZED"}
          </span>

          {isUnsupportedCaseType ? (
            <>
              <p style={{ color: "var(--warning)" }}>
                This document doesn&apos;t match a supported GovFlow workflow (land compensation, birth
                certificate correction, or citizen grievance) — showing it as an informational document instead.
              </p>
              {result.extraction.case_name && (
                <p><span style={{ color: "var(--muted)" }}>Document:</span> {result.extraction.case_name}</p>
              )}
              {result.extraction.court && (
                <p><span style={{ color: "var(--muted)" }}>Court:</span> {result.extraction.court}</p>
              )}
              {result.extraction.filing_date && (
                <p><span style={{ color: "var(--muted)" }}>Filing date:</span> {result.extraction.filing_date}</p>
              )}
              {result.extraction.status && (
                <p><span style={{ color: "var(--muted)" }}>Status:</span> {result.extraction.status}</p>
              )}
              <p><span style={{ color: "var(--muted)" }}>Summary:</span> {result.extraction.summary}</p>
              {result.extraction.extracted_facts.length > 0 && (
                <div>
                  <span style={{ color: "var(--muted)" }}>Extracted facts:</span>
                  <ul className="list-disc list-inside mt-1">
                    {result.extraction.extracted_facts.map((fact, i) => (
                      <li key={i}>{fact}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              <p><span style={{ color: "var(--muted)" }}>Case type:</span> {result.extraction.case_type.replace(/_/g, " ")}</p>
              <p><span style={{ color: "var(--muted)" }}>Applicant:</span> {result.extraction.applicant_name ?? "Not found in document"}</p>
              <p><span style={{ color: "var(--muted)" }}>Summary:</span> {result.extraction.summary}</p>
              {result.validation && !result.validation.complete && (
                <p style={{ color: "var(--critical)" }}>
                  Missing: {result.validation.missing.join(", ")}
                </p>
              )}
              {result.persisted_case_id && (
                <p className="text-xs">
                  <Link
                    href={`/cases/${result.persisted_case_id}`}
                    className="font-medium hover:underline"
                    style={{ color: "var(--success)" }}
                  >
                    ✓ Saved to case database
                    {redirectCountdown !== null
                      ? ` — opening case in ${redirectCountdown}s…`
                      : " — open this case →"}
                  </Link>
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
