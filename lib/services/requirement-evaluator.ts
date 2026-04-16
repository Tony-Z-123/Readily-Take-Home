import { getOpenAIClient } from "./openai-client";
import type { EvaluationResult, PolicyChunkMatch } from "../types";

const EVALUATION_PROMPT = `You are a healthcare regulatory compliance evaluator. Given a regulatory requirement and excerpts from an organization's policies, determine whether the requirement is met.

Evaluate carefully:
- "met": The policy addresses the requirement with sufficient specificity.
- "not_met": No policy excerpt adequately addresses the requirement.

Return a JSON object with:
- "status": "met" or "not_met" (no other values)
- "confidence": 0.0 to 1.0 indicating your confidence in the determination
- "evidence": The exact quote from the policy that addresses the requirement (null if not_met)
- "sourcePolicyId": The policy ID where evidence was found (null if not_met)
- "sourcePolicyTitle": The policy title (null if not_met)
- "sourcePageNumber": The page number (null if not_met)
- "reasoning": Brief explanation of your determination

Return ONLY valid JSON.`;

export async function evaluateRequirement(
  requirementId: number,
  requirementText: string,
  policyChunks: PolicyChunkMatch[]
): Promise<EvaluationResult> {
  const openai = getOpenAIClient();

  const chunksContext = policyChunks
    .map(
      (c, i) =>
        `--- Policy: ${c.policyId} (${c.policyTitle}), Page ${c.pageNumber}, Relevance: ${(c.score * 100).toFixed(1)}% ---\n${c.text}`
    )
    .join("\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    messages: [
      { role: "system", content: EVALUATION_PROMPT },
      {
        role: "user",
        content: `REQUIREMENT:\n${requirementText}\n\nPOLICY EXCERPTS:\n${chunksContext}`,
      },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error(
      `No response evaluating requirement ${requirementId}`
    );
  }

  const parsed = JSON.parse(content);

  return {
    requirementId,
    requirementText,
    status: parsed.status === "met" ? "met" : "not_met",
    confidence: parsed.confidence ?? 0,
    evidence: parsed.evidence || null,
    sourcePolicyId: parsed.sourcePolicyId || null,
    sourcePolicyTitle: parsed.sourcePolicyTitle || null,
    sourcePageNumber: parsed.sourcePageNumber || null,
    reasoning: parsed.reasoning || "",
  };
}
