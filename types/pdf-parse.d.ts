declare module "pdf-parse/lib/pdf-parse.js" {
  interface PDFParseResult {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    version: string;
    text: string;
  }

  function pdfParse(
    buffer: Buffer,
    options?: Record<string, unknown>
  ): Promise<PDFParseResult>;

  export default pdfParse;
}
