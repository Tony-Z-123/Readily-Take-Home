import { NextRequest } from "next/server";
import { parsePDFBuffer } from "@/lib/services/pdf-parser";
import { extractRequirements } from "@/lib/services/requirement-extractor";
import { generateEmbeddings } from "@/lib/services/openai-client";
import { findRelevantChunks } from "@/lib/services/policy-retriever";
import { evaluateRequirement } from "@/lib/services/requirement-evaluator";
import { processWithConcurrency } from "@/lib/utils/concurrency";
import type { ProcessingEvent } from "@/lib/types";

const CONCURRENCY_LIMIT = 10;

export const maxDuration = 300;

function encodeSSE(event: ProcessingEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file || file.type !== "application/pdf") {
    return new Response(JSON.stringify({ error: "Please upload a PDF file" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function send(event: ProcessingEvent) {
        controller.enqueue(encoder.encode(encodeSSE(event)));
      }

      try {
        const parsed = await parsePDFBuffer(buffer, file.name);
        const requirements = await extractRequirements(parsed.fullText);

        send({
          type: "requirements_extracted",
          data: {
            requirements,
            totalCount: requirements.length,
          },
        });

        let met = 0;
        let notMet = 0;
        let completedCount = 0;

        const allEmbeddings = await generateEmbeddings(
          requirements.map((r) => r.text)
        );

        await processWithConcurrency(
          requirements.map((req, i) => ({ req, embedding: allEmbeddings[i] })),
          async ({ req, embedding }) => {
            try {
              const relevantChunks = await findRelevantChunks(
                req.text,
                5,
                embedding
              );
              const result = await evaluateRequirement(
                req.id,
                req.text,
                relevantChunks
              );

              if (result.status === "met") met++;
              else notMet++;

              send({
                type: "requirement_evaluated",
                data: {
                  result,
                  progress: ++completedCount,
                  total: requirements.length,
                },
              });
            } catch (err) {
              notMet++;

              send({
                type: "requirement_evaluated",
                data: {
                  result: {
                    requirementId: req.id,
                    requirementText: req.text,
                    status: "not_met",
                    confidence: 0,
                    evidence: null,
                    sourcePolicyId: null,
                    sourcePolicyTitle: null,
                    sourcePageNumber: null,
                    reasoning: `Error evaluating: ${err instanceof Error ? err.message : "Unknown error"}`,
                  },
                  progress: ++completedCount,
                  total: requirements.length,
                },
              });
            }
          },
          CONCURRENCY_LIMIT
        );

        send({
          type: "processing_complete",
          data: {
            summary: {
              total: requirements.length,
              met,
              notMet,
            },
          },
        });
      } catch (err) {
        send({
          type: "error",
          data: {
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          },
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
