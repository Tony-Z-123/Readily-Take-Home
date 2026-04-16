"use client";

import { useState, useCallback } from "react";
import { FileUpload } from "@/components/file-upload";
import { RequirementsList } from "@/components/requirements-list";
import { Loader2 } from "lucide-react";
import type {
  Requirement,
  EvaluationResult,
  ProcessingEvent,
  RequirementsExtractedEvent,
  RequirementEvaluatedEvent,
  ProcessingCompleteEvent,
  ErrorEvent,
} from "@/lib/types";

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [results, setResults] = useState<Map<number, EvaluationResult>>(
    new Map()
  );
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<{
    met: number;
    notMet: number;
    partial: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setIsProcessing(true);
    setStatusMessage("Uploading and parsing PDF...");
    setRequirements([]);
    setResults(new Map());
    setProgress(0);
    setTotal(0);
    setSummary(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errBody = await response.json();
        throw new Error(errBody.error || "Failed to process document");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const jsonStr = trimmed.slice(6);
          let event: ProcessingEvent;
          try {
            event = JSON.parse(jsonStr);
          } catch {
            continue;
          }

          switch (event.type) {
            case "requirements_extracted": {
              const d = event.data as RequirementsExtractedEvent;
              setRequirements(d.requirements);
              setTotal(d.totalCount);
              setStatusMessage(
                `Found ${d.totalCount} requirements. Evaluating...`
              );
              break;
            }
            case "requirement_evaluated": {
              const d = event.data as RequirementEvaluatedEvent;
              setResults((prev) => {
                const next = new Map(prev);
                next.set(d.result.requirementId, d.result);
                return next;
              });
              setProgress(d.progress);
              setStatusMessage(
                `Evaluating requirement ${d.progress} of ${d.total}...`
              );
              break;
            }
            case "processing_complete": {
              const d = event.data as ProcessingCompleteEvent;
              setSummary({
                met: d.summary.met,
                notMet: d.summary.notMet,
                partial: d.summary.partial,
              });
              setStatusMessage(null);
              setIsProcessing(false);
              break;
            }
            case "error": {
              const d = event.data as ErrorEvent;
              setError(d.message);
              setStatusMessage(null);
              setIsProcessing(false);
              break;
            }
          }
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setStatusMessage(null);
      setIsProcessing(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="border-b bg-white dark:bg-neutral-900">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            Regulatory Compliance Checker
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Upload a regulatory document to check policy compliance
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        <FileUpload onFileSelect={handleFileSelect} isProcessing={isProcessing} />

        {isProcessing && statusMessage && (
          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {statusMessage}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {requirements.length > 0 && (
          <RequirementsList
            requirements={requirements}
            results={results}
            progress={progress}
            total={total}
            summary={summary}
          />
        )}
      </main>
    </div>
  );
}
