import { generateEmbedding } from "./openai-client";
import { findTopK } from "../utils/cosine-similarity";
import type { PolicyIndex, PolicyChunkMatch } from "../types";

let cachedIndex: PolicyIndex | null = null;
let cachedEmbeddings: number[][] | null = null;

async function loadIndex(): Promise<PolicyIndex> {
  if (cachedIndex) return cachedIndex;

  const fs = await import("fs");
  const path = await import("path");

  const indexPath = path.join(process.cwd(), "data", "policy-index.json");

  if (!fs.existsSync(indexPath)) {
    throw new Error(
      "Policy index not found. Run 'npx tsx scripts/index-policies.ts' first."
    );
  }

  const raw = fs.readFileSync(indexPath, "utf-8");
  cachedIndex = JSON.parse(raw) as PolicyIndex;
  cachedEmbeddings = cachedIndex.chunks.map((c) => c.embedding);

  return cachedIndex;
}

export async function findRelevantChunks(
  query: string,
  topK: number = 5
): Promise<PolicyChunkMatch[]> {
  const index = await loadIndex();
  const embeddings = cachedEmbeddings!;

  const queryEmbedding = await generateEmbedding(query);
  const topResults = findTopK(queryEmbedding, embeddings, topK);

  return topResults.map(({ index: idx, score }) => {
    const chunk = index.chunks[idx];
    return {
      text: chunk.text,
      policyId: chunk.policyId,
      policyTitle: chunk.policyTitle,
      pageNumber: chunk.pageNumber,
      score,
    };
  });
}
