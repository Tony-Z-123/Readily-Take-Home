# Task: Add Parallel Requirement Evaluation

## Context

This is a regulatory compliance checker app. When a user uploads a PDF, the backend:
1. Extracts requirements from the document (single LLM call)
2. For each requirement, sequentially: generates an embedding, searches the policy index, and calls the LLM to evaluate met/not-met
3. Streams each result to the frontend via SSE

Step 2 is the bottleneck. With 64+ requirements evaluated one at a time, the full run takes ~3 minutes. Each individual evaluation is independent (no shared mutable state between requirements), making this an ideal candidate for concurrency.

## What Needs to Change

### Backend: `app/api/process/route.ts`

The current loop at line ~53 processes requirements sequentially:

```typescript
for (let i = 0; i < requirements.length; i++) {
  const relevantChunks = await findRelevantChunks(req.text, 5);
  const result = await evaluateRequirement(req.id, req.text, relevantChunks);
  send({ type: "requirement_evaluated", data: { result, progress, total } });
}
```

This should be replaced with a concurrency-limited parallel approach. Key constraints:
- **Concurrency limit**: OpenAI rate limits apply. A reasonable starting point is 5-10 concurrent evaluations. Make this configurable.
- **SSE ordering**: Results will arrive out of order. The frontend already handles this correctly (it uses a Map keyed by requirementId), but the `progress` counter sent in each SSE event needs to reflect how many have completed so far, not the sequential index.
- **Error isolation**: One failed evaluation must not kill the others.
- **Backpressure**: The ReadableStream controller should not queue unbounded data. Each `send()` call enqueues to the stream, so this is naturally fine as long as the client reads.

### Implementation approach

Use a simple concurrency pool pattern. Recommended: create a utility function like `processWithConcurrency<T>(items: T[], fn: (item: T) => Promise<void>, limit: number)` in `lib/utils/`. This avoids adding a dependency like `p-limit`.

The pattern:
1. Maintain an active set of promises (max size = concurrency limit)
2. As each promise resolves, remove it and start the next item
3. Track a shared `completedCount` that increments atomically on each completion
4. Call `send()` inside the per-item callback after each evaluation completes

### Frontend: No changes needed

The frontend in `app/page.tsx` already handles out-of-order results correctly:
- `results` is a `Map<number, EvaluationResult>` — keyed by requirementId, not insertion order
- The progress bar uses `progress` / `total` from the SSE event
- RequirementCard components re-render when their specific result appears in the map

### Embedding calls

`findRelevantChunks()` in `lib/services/policy-retriever.ts` calls the OpenAI embeddings API once per requirement. These calls are also independent and can run concurrently. However, the embedding API already supports batching (see `generateEmbeddings()` in `openai-client.ts`). A more efficient approach:
1. After extracting all requirements, batch-embed ALL requirement texts in one API call
2. Then run the cosine similarity + LLM evaluation in parallel, skipping the per-requirement embedding call

This would require a small refactor: pass the pre-computed embedding into `findRelevantChunks()` instead of having it call `generateEmbedding()` internally. Add an optional `queryEmbedding` parameter to the function signature.

## Files to Modify

1. `app/api/process/route.ts` — replace sequential loop with concurrent processing
2. `lib/utils/concurrency.ts` — new file, concurrency pool utility
3. `lib/services/policy-retriever.ts` — add optional pre-computed embedding parameter to `findRelevantChunks()`
4. `lib/services/openai-client.ts` — `generateEmbeddings()` already exists for batching, no changes needed

## Expected Impact

With 10 concurrent evaluations, total processing time for 64 requirements should drop from ~3 minutes to ~30-40 seconds.
