"use client";

import { Progress } from "@/components/ui/progress";
import { RequirementCard } from "./requirement-card";
import type { Requirement, EvaluationResult } from "@/lib/types";

interface RequirementsListProps {
  requirements: Requirement[];
  results: Map<number, EvaluationResult>;
  progress: number;
  total: number;
  summary: { met: number; notMet: number; partial: number } | null;
}

export function RequirementsList({
  requirements,
  results,
  progress,
  total,
  summary,
}: RequirementsListProps) {
  const pct = total > 0 ? (progress / total) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Requirements ({requirements.length})
        </h2>
        {summary && (
          <div className="flex gap-3 text-sm">
            <span className="text-emerald-600 font-medium">
              {summary.met} met
            </span>
            <span className="text-red-600 font-medium">
              {summary.notMet} not met
            </span>
            {summary.partial > 0 && (
              <span className="text-amber-600 font-medium">
                {summary.partial} partial
              </span>
            )}
          </div>
        )}
      </div>

      {total > 0 && progress < total && (
        <div className="space-y-1">
          <Progress value={pct} className="h-2" />
          <p className="text-xs text-neutral-500">
            Evaluating requirement {progress} of {total}...
          </p>
        </div>
      )}

      {total > 0 && progress >= total && summary && (
        <div className="rounded-lg bg-neutral-100 dark:bg-neutral-800 p-3 text-sm text-neutral-700 dark:text-neutral-300">
          Evaluation complete: {summary.met} of {total} requirements met (
          {((summary.met / total) * 100).toFixed(0)}%)
        </div>
      )}

      <div className="space-y-2">
        {requirements.map((req) => (
          <RequirementCard
            key={req.id}
            requirement={req}
            result={results.get(req.id) ?? null}
          />
        ))}
      </div>
    </div>
  );
}
