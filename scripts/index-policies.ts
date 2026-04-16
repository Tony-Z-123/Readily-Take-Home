import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import OpenAI from "openai";
import { chunkText } from "../lib/utils/chunker";
import type { PolicyChunk, PolicyIndex } from "../lib/types";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const POLICIES_DIR = path.resolve(
  __dirname,
  "../../ENG #3/Public Policies"
);
const OUTPUT_PATH = path.resolve(__dirname, "../data/policy-index.json");
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 512;
const BATCH_SIZE = 50;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function findPDFs(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findPDFs(fullPath));
    } else if (entry.name.toLowerCase().endsWith(".pdf")) {
      results.push(fullPath);
    }
  }
  return results;
}

function extractPolicyId(fileName: string): string {
  const match = fileName.match(/^([A-Z]+\.\d+[a-z]?)/);
  return match ? match[1] : fileName.replace(".pdf", "");
}

async function parsePDF(
  filePath: string
): Promise<{ pages: { pageNumber: number; text: string }[]; title: string }> {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  const rawText = data.text || "";

  const pageTexts = rawText.split(/\n--\s*\d+\s+of\s+\d+\s*--\n/);
  const pages = pageTexts
    .map((text, index) => ({
      pageNumber: index + 1,
      text: text.trim(),
    }))
    .filter((p) => p.text.length > 0);

  const titleMatch = rawText.match(/Title:\s*([^\n]+)/);

  const title = titleMatch ? titleMatch[1].trim() : path.basename(filePath, ".pdf");

  return {
    pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: rawText }],
    title,
  };
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    dimensions: EMBEDDING_DIMENSIONS,
  });
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

async function main() {
  console.log(`Scanning for PDFs in: ${POLICIES_DIR}`);

  if (!fs.existsSync(POLICIES_DIR)) {
    console.error(`Directory not found: ${POLICIES_DIR}`);
    process.exit(1);
  }

  const pdfFiles = findPDFs(POLICIES_DIR);
  console.log(`Found ${pdfFiles.length} PDF files`);

  const allChunks: Omit<PolicyChunk, "embedding">[] = [];
  let processedCount = 0;
  let errorCount = 0;

  for (const filePath of pdfFiles) {
    try {
      const fileName = path.basename(filePath);
      const policyId = extractPolicyId(fileName);
      const { pages, title } = await parsePDF(filePath);
      const chunks = chunkText(pages);

      for (const chunk of chunks) {
        allChunks.push({
          text: chunk.text,
          policyId,
          policyTitle: title,
          pageNumber: chunk.pageNumber,
          chunkIndex: chunk.chunkIndex,
        });
      }

      processedCount++;
      if (processedCount % 25 === 0) {
        console.log(
          `Parsed ${processedCount}/${pdfFiles.length} PDFs (${allChunks.length} chunks so far)`
        );
      }
    } catch (err) {
      errorCount++;
      console.error(`Error parsing ${path.basename(filePath)}: ${err}`);
    }
  }

  console.log(
    `\nParsing complete: ${processedCount} PDFs, ${allChunks.length} chunks, ${errorCount} errors`
  );
  console.log("Generating embeddings...");

  const allEmbeddings: number[][] = [];
  const texts = allChunks.map((c) => c.text);

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    try {
      const embeddings = await embedBatch(batch);
      allEmbeddings.push(...embeddings);
    } catch (err) {
      console.error(`Embedding batch ${i}-${i + BATCH_SIZE} failed: ${err}`);
      for (let j = 0; j < batch.length; j++) {
        allEmbeddings.push(new Array(EMBEDDING_DIMENSIONS).fill(0));
      }
    }

    if ((i + BATCH_SIZE) % 200 === 0 || i + BATCH_SIZE >= texts.length) {
      console.log(
        `Embedded ${Math.min(i + BATCH_SIZE, texts.length)}/${texts.length} chunks`
      );
    }
  }

  const fullChunks: PolicyChunk[] = allChunks.map((chunk, i) => ({
    ...chunk,
    embedding: allEmbeddings[i],
  }));

  const index: PolicyIndex = {
    chunks: fullChunks,
    metadata: {
      totalPolicies: processedCount,
      totalChunks: fullChunks.length,
      embeddingModel: EMBEDDING_MODEL,
      embeddingDimensions: EMBEDDING_DIMENSIONS,
      createdAt: new Date().toISOString(),
    },
  };

  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(index));
  const sizeMB = (fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(1);
  console.log(`\nIndex saved to: ${OUTPUT_PATH} (${sizeMB} MB)`);
  console.log(
    `Total: ${index.metadata.totalPolicies} policies, ${index.metadata.totalChunks} chunks`
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
