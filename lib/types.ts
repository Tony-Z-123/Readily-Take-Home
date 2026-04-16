export interface Requirement {
  id: number;
  text: string;
  reference?: string;
}

export interface PolicyChunk {
  text: string;
  policyId: string;
  policyTitle: string;
  pageNumber: number;
  chunkIndex: number;
  embedding: number[];
}

export interface PolicyChunkMatch {
  text: string;
  policyId: string;
  policyTitle: string;
  pageNumber: number;
  score: number;
}

export interface EvaluationResult {
  requirementId: number;
  requirementText: string;
  status: "met" | "not_met";
  confidence: number;
  evidence: string | null;
  sourcePolicyId: string | null;
  sourcePolicyTitle: string | null;
  sourcePageNumber: number | null;
  reasoning: string;
}

export interface ProcessingEvent {
  type: "requirements_extracted" | "requirement_evaluated" | "processing_complete" | "error";
  data: RequirementsExtractedEvent | RequirementEvaluatedEvent | ProcessingCompleteEvent | ErrorEvent;
}

export interface RequirementsExtractedEvent {
  requirements: Requirement[];
  totalCount: number;
}

export interface RequirementEvaluatedEvent {
  result: EvaluationResult;
  progress: number;
  total: number;
}

export interface ProcessingCompleteEvent {
  summary: {
    total: number;
    met: number;
    notMet: number;
  };
}

export interface ErrorEvent {
  message: string;
}

export interface PolicyIndex {
  chunks: PolicyChunk[];
  metadata: {
    totalPolicies: number;
    totalChunks: number;
    embeddingModel: string;
    embeddingDimensions: number;
    createdAt: string;
  };
}
