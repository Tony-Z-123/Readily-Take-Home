import { getOpenAIClient } from "./openai-client";
import type { Requirement } from "../types";

const EXTRACTION_PROMPT = `You are a regulatory compliance analyst. Your job is to extract individual requirements from a regulatory document.

A "requirement" is any statement that mandates, expects, or requires a healthcare organization (such as an MCP/Managed Care Plan) to do something specific in their Policies and Procedures (P&Ps).

For STRUCTURED documents (like submission review forms with numbered items):
- Each numbered item is a requirement.
- Preserve the exact text of each requirement.

For NARRATIVE documents (like policy guides):
- Look for language like "must", "shall", "required to", "are expected to", "are responsible for".
- Each distinct obligation is a separate requirement.
- Summarize each requirement concisely while preserving the specific obligation.

Return a JSON object with a single key "requirements" containing an array. Each element has:
- "id": sequential number starting at 1
- "text": the full requirement text
- "reference": any reference citation (e.g., "APL 25-008, page 2") or null

Example format: {"requirements": [{"id": 1, "text": "...", "reference": "..."}]}`;

export async function extractRequirements(
  pdfText: string
): Promise<Requirement[]> {
  const openai = getOpenAIClient();

  const truncatedText =
    pdfText.length > 100000 ? pdfText.slice(0, 100000) : pdfText;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    messages: [
      { role: "system", content: EXTRACTION_PROMPT },
      {
        role: "user",
        content: `Extract all requirements from the following regulatory document:\n\n${truncatedText}`,
      },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from requirement extraction model");
  }

  const parsed = JSON.parse(content);

  let requirements: Requirement[];
  if (Array.isArray(parsed)) {
    requirements = parsed;
  } else if (Array.isArray(parsed.requirements)) {
    requirements = parsed.requirements;
  } else if (parsed.id && parsed.text) {
    requirements = [parsed];
  } else {
    const firstArrayKey = Object.keys(parsed).find((k) => Array.isArray(parsed[k]));
    requirements = firstArrayKey ? parsed[firstArrayKey] : [];
  }

  return requirements.map((r, i) => ({
    id: r.id ?? i + 1,
    text: r.text,
    reference: r.reference ?? undefined,
  }));
}
