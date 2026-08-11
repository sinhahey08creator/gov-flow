"use client";

import { useState, useCallback } from "react";

interface AnalysisResult {
  extraction: {
    case_type: string;
    applicant_name: string;
    district: string;
    priority: string;
    documents_detected: string[];
    missing_documents: string[];
    summary: string;
  };
  validation: { required: string[]; present: string[]; missing: string[]; complete: boolean };
  sla_hours: number;
  source: "gemini" | "demo_fallback";
}

export default function DocumentUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);

    if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
      setError("Please upload a PDF, PNG, or JPG file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File is too large. Please keep it under 10MB.");
      return;
    }

    setAnalyzing(true);
    try {
      // MVP: for text-based PDFs, extract text client-side isn't wired yet —
      // for now we send the filename as a stand-in signal to the demo
      // fallback path. Swap this for real PDF text extraction (e.g. pdfjs)
      // before relying on this for anything beyond the demo.
      const documentText = `Uploaded file: ${file.name}`;

      const res = await fetch("/api/analyze-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentText }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Analysis failed");
      }

      const data = (await res.json()) as AnalysisResult;
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't analyze this document automatically. Please upload a text-based PDF or try again."
      );
    } finally {
      setAnalyzing(false);
    }
  }, []);

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
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileInput} className="hidden" />
        </label>
        <p className="text-xs mt-3" style={{ color: "var(--muted)" }}>Supported: PDF, PNG, JPG · up to 10MB</p>
      </div>

      {analyzing && (
        <div className="mt-4 text-sm space-y-1" style={{ color: "var(--muted)" }}>
          <p>Analyzing document...</p>
          <p>Extracting case information...</p>
          <p>Detecting required documents...</p>
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm" style={{ color: "var(--critical)" }}>{error}</p>
      )}

      {result && (
        <div className="mt-4 p-4 rounded border text-sm space-y-2" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
          {result.source === "demo_fallback" && (
            <span className="inline-block text-xs px-2 py-0.5 rounded-full border font-medium" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
              DEMO AI
            </span>
          )}
          <p><span style={{ color: "var(--muted)" }}>Case type:</span> {result.extraction.case_type.replace(/_/g, " ")}</p>
          <p><span style={{ color: "var(--muted)" }}>Applicant:</span> {result.extraction.applicant_name}</p>
          <p><span style={{ color: "var(--muted)" }}>Summary:</span> {result.extraction.summary}</p>
          {!result.validation.complete && (
            <p style={{ color: "var(--critical)" }}>
              Missing: {result.validation.missing.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
