// Client-side PDF text extraction. Runs in the browser (invoked from
// components/DocumentUpload.tsx) so the raw PDF never has to be uploaded
// to a server just to pull its text out — we send the already-extracted
// text to /api/analyze-document instead.

export class PdfExtractionError extends Error {}

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
}

/**
 * Extracts text from a PDF File, page by page, preserving page
 * boundaries with form-feed-style separators so downstream consumers
 * (Gemini) can still reason about page structure if useful.
 *
 * Throws PdfExtractionError with a user-facing message for: files that
 * aren't actually valid PDFs, password-protected/corrupt PDFs, and PDFs
 * that parse but contain no extractable text (e.g. pure image scans —
 * this pipeline doesn't do OCR).
 */
export async function extractPdfText(file: File): Promise<PdfExtractionResult> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  } catch (err) {
    console.error("PDF load failed:", err);
    throw new PdfExtractionError(
      "This file couldn't be read as a PDF. It may be corrupted, password-protected, or not actually a PDF."
    );
  }

  const pageCount = pdf.numPages;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      pageTexts.push(pageText);
    } catch (err) {
      console.error(`Failed to extract text from page ${pageNum}:`, err);
      pageTexts.push("");
    }
  }

  const text = pageTexts
    .map((t, i) => `--- Page ${i + 1} ---\n${t}`)
    .join("\n\n")
    .trim();

  const totalTextLength = pageTexts.join("").trim().length;
  if (totalTextLength === 0) {
    throw new PdfExtractionError(
      "No readable text was found in this PDF. It may be a scanned image without a text layer — try a text-based PDF instead."
    );
  }

  return { text, pageCount };
}
