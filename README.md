# Regulatory Compliance Checker

A web application that automates healthcare regulatory compliance audits. Upload a regulatory document (PDF), and the app extracts each requirement, searches an organization's policy corpus for matching evidence, and reports whether each requirement is met.

## How It Works

```
Upload regulatory PDF
        |
        v
Extract requirements (GPT-5.4)
        |
        v
For each requirement:
  1. Embed the requirement text (text-embedding-3-small)
  2. Find top-5 matching policy chunks via cosine similarity
  3. Evaluate met/not-met with evidence (GPT-5.4-mini)
        |
        v
Stream results to browser via SSE
```

**Pre-indexed policy corpus**: 373 policy PDFs from CalOptima Health are pre-processed into 7,380 text chunks with vector embeddings, stored in a local JSON file. At runtime, requirements are matched against this corpus using cosine similarity search — no external database required.

## Getting Started

### Prerequisites

- Node.js 18+
- An OpenAI API key with access to `gpt-5.4`, `gpt-5.4-mini`, and `text-embedding-3-small`

### Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
# Edit .env.local and add your OpenAI API key:
# OPENAI_API_KEY=sk-...
```

### Build the Policy Index (one-time)

The policy PDFs must be placed at `../ENG #3/Public Policies/` relative to the project root (the same directory structure from the take-home data).

```bash
npx tsx scripts/index-policies.ts
```

This reads all PDFs, chunks the text, generates embeddings via OpenAI, and saves the index to `data/policy-index.json` (~75 MB). This step takes approximately 3 minutes and costs a few cents in embedding API usage.

### Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), drop a regulatory PDF, and watch the results stream in.

## Project Structure

```
app/
  page.tsx                        Main page — file upload + results display
  api/process/route.ts            SSE endpoint orchestrating the full pipeline

lib/
  types.ts                        Shared TypeScript interfaces
  services/
    openai-client.ts              OpenAI SDK wrapper + embedding helper
    pdf-parser.ts                 PDF text extraction
    requirement-extractor.ts      LLM-powered requirement extraction
    policy-retriever.ts           In-memory vector search over policy index
    requirement-evaluator.ts      LLM-powered met/not-met evaluation
  utils/
    cosine-similarity.ts          Vector math (dot product, top-K search)
    chunker.ts                    Text chunking with overlap

components/
  file-upload.tsx                 Drag-and-drop PDF upload zone
  requirements-list.tsx           Results list with summary and progress bar
  requirement-card.tsx            Expandable card showing status + evidence

scripts/
  index-policies.ts              One-time script to build the policy vector index
```

## Architecture Decisions

- **In-memory vector search**: Policy embeddings are loaded into memory from a JSON file. Cosine similarity runs in TypeScript — no vector database dependency.
- **Server-Sent Events**: Results stream to the browser as each requirement is evaluated, giving immediate feedback on a process that may take several minutes.
- **Separate models for separate tasks**: `gpt-5.4` handles the complex task of extracting requirements from unstructured documents. `gpt-5.4-mini` handles the simpler per-requirement evaluation, keeping cost and latency manageable across 60+ requirements.
- **SOLID structure**: Each service has a single responsibility. The OpenAI client is abstracted behind a wrapper so the LLM provider can be swapped without touching business logic.

## Test Results

| Document | Type | Requirements | Met | Partial | Not Met |
|----------|------|-------------|-----|---------|---------|
| APL 25-008 Hospice (Easy) | Structured checklist | 64 | 7 | 43 | 14 |
| CalAIM ECM Policy Guide (Hard) | 145-page narrative | 78 | 14 | 57 | 7 |

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **LLM**: OpenAI GPT-5.4 / GPT-5.4-mini
- **Embeddings**: OpenAI text-embedding-3-small (512 dimensions)
- **PDF Parsing**: pdf-parse
- **Language**: TypeScript
