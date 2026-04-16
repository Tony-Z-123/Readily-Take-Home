import pdfParse from "pdf-parse/lib/pdf-parse.js";

export interface ParsedPage {
  pageNumber: number;
  text: string;
}

export interface ParsedPDF {
  fullText: string;
  pages: ParsedPage[];
  totalPages: number;
  fileName: string;
}

export async function parsePDFBuffer(
  buffer: Buffer,
  fileName: string
): Promise<ParsedPDF> {
  const data = await pdfParse(buffer);

  const rawText = data.text || "";

  const pageTexts = rawText.split(/\n--\s*\d+\s+of\s+\d+\s*--\n/);

  const pages: ParsedPage[] = pageTexts
    .map((text, index) => ({
      pageNumber: index + 1,
      text: text.trim(),
    }))
    .filter((p) => p.text.length > 0);

  return {
    fullText: rawText,
    pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: rawText }],
    totalPages: data.numpages,
    fileName,
  };
}

export async function parsePDFFile(filePath: string): Promise<ParsedPDF> {
  const fs = await import("fs");
  const path = await import("path");
  const buffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath, ".pdf");
  return parsePDFBuffer(buffer, fileName);
}
