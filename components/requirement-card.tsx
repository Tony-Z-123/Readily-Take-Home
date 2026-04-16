"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EvaluationResult, Requirement } from "@/lib/types";

interface RequirementCardProps {
  requirement: Requirement;
  result: EvaluationResult | null;
}

const statusConfig = {
  met: {
    icon: CheckCircle2,
    label: "Met",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    iconClass: "text-emerald-600",
  },
  not_met: {
    icon: XCircle,
    label: "Not Met",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    iconClass: "text-red-600",
  },
};

export function RequirementCard({
  requirement,
  result,
}: RequirementCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLoading = !result;

  const config = result ? statusConfig[result.status] : null;
  const StatusIcon = config?.icon;

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
      >
        <div className="flex-shrink-0 mt-0.5">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-neutral-400 animate-spin" />
          ) : StatusIcon ? (
            <StatusIcon className={`h-5 w-5 ${config!.iconClass}`} />
          ) : null}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-neutral-900 dark:text-neutral-100">
              <span className="font-semibold mr-1.5">
                #{requirement.id}
              </span>
              {requirement.text.length > 200
                ? requirement.text.slice(0, 200) + "..."
                : requirement.text}
            </p>
            <div className="flex-shrink-0 flex items-center gap-2">
              {result && config && (
                <Badge className={config.badgeClass}>
                  {config.label}
                </Badge>
              )}
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-neutral-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-neutral-400" />
              )}
            </div>
          </div>
        </div>
      </button>

      {isExpanded && result && (
        <div className="border-t px-4 py-3 space-y-3 bg-neutral-50/50 dark:bg-neutral-900/20">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-1">
              Full Requirement
            </p>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              {requirement.text}
            </p>
            {requirement.reference && (
              <p className="text-xs text-neutral-500 mt-1">
                Reference: {requirement.reference}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-1">
              Assessment
            </p>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              {result.reasoning}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Confidence: {(result.confidence * 100).toFixed(0)}%
            </p>
          </div>

          {result.evidence && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-1">
                Evidence
              </p>
              <blockquote className="border-l-2 border-blue-400 pl-3 text-sm italic text-neutral-700 dark:text-neutral-300">
                &ldquo;{result.evidence}&rdquo;
              </blockquote>
              {result.sourcePolicyId && (
                <p className="text-xs text-neutral-500 mt-1">
                  Source: {result.sourcePolicyId}
                  {result.sourcePolicyTitle &&
                    ` — ${result.sourcePolicyTitle}`}
                  {result.sourcePageNumber &&
                    `, Page ${result.sourcePageNumber}`}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
