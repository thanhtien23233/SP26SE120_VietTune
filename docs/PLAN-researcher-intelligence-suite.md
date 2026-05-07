# Plan: Researcher Intelligence Suite

## Overview

**What:** Build a researcher-only intelligence suite that includes advanced structured filtering, semantic search, AI Q&A with citations, interactive knowledge graph, comparative analysis tools, and academic dataset export.

**Why:** Research users need high-precision discovery and deep analysis workflows across Vietnamese traditional music data, with verifiable evidence and reproducible exports for academic work.

## Scope

- In scope:
  - Advanced search filters (ethnic groups, instruments, ritual function, commune/ward-level geography)
  - Semantic search (natural-language query understanding)
  - AI Q&A with citation grounding on verified sources
  - Interactive knowledge graph exploration
  - Comparative analysis workspace (side-by-side audio/transcript/expert commentary)
  - Export of filtered academic datasets with metadata
  - Researcher-only access control
- Out of scope:
  - Contributor/Expert workflow changes
  - Public anonymous access for these tools
  - Full real-time collaborative editing in v1

## Project type

**WEB + BACKEND + SEARCH/AI** (multi-domain, high-complexity feature set).

## Researcher-only policy

All features in this plan are restricted to users with `Researcher` role:

1. Route-level guard for researcher pages
2. API-level authorization checks
3. Export endpoint permission checks + audit logs
4. Citation visibility policy tied to verified sources only

## Success criteria (measurable)

1. Researchers can filter by:
   - 54 ethnic groups
   - 200+ traditional instruments
   - ritual/ceremony function
   - geography down to commune/ward level.
2. Semantic query examples return relevant, ranked results with >= target precision@k baseline.
3. AI Q&A returns answers with source citations and confidence/rationale fields.
4. Knowledge graph supports node click-through traversal (instrument -> songs, ritual -> related recordings).
5. Comparative workspace supports side-by-side playback + transcript diff + expert notes panel.
6. Dataset export returns downloadable package with metadata schema and query manifest.

## Assumptions and dependencies

- Existing reference datasets for ethnic groups, instruments, geography exist or are ingestible.
- Recording/transcript metadata has sufficient quality for indexing.
- Verified-source registry is available (or can be created as prerequisite).
- Backend supports asynchronous jobs for heavy export generation.

## Functional breakdown (epics)

### E1 - Advanced Search (structured facets)

- Filters:
  - Ethnic group (54 options)
  - Instruments (200+ options, multi-select)
  - Ritual function
  - Geo hierarchy: Region -> Province -> District -> Commune/Ward
- Additional controls:
  - Saved filters
  - Facet counts
  - Result pagination and sorting
- Output:
  - Search result cards with rich metadata and quick preview

### E2 - Semantic Search Engine

- Natural-language query parser for Vietnamese/English mixed queries
- Hybrid retrieval design:
  - lexical + metadata filter match
  - embedding-based semantic ranking
- Query examples supported:
  - "tìm các bài hát thu hoạch sử dụng đàn bầu ở Đồng bằng sông Cửu Long"
  - "so sánh nhạc đám tang giữa dân tộc Tày và Thái"
- Output:
  - Ranked results + extracted intent facets + explainability snippets

### E3 - AI-powered Q&A with Citations

- Retrieval-augmented generation over verified corpus
- Citation model:
  - source title
  - source type
  - excerpt
  - deep-link anchor
- Safety:
  - response abstention when evidence is weak
  - clear uncertainty messaging

### E4 - Interactive Knowledge Graph

- Graph entities:
  - recording, instrument, ethnic group, ritual, location, performer, source
- Graph actions:
  - click node -> fetch linked entities
  - expand/collapse neighborhoods
  - facet-synchronized graph filters
- UX:
  - legend, edge types, search-in-graph, zoom/pan performance guardrails

### E5 - Comparative Analysis Tools

- Side-by-side audio playback (N tracks with synchronized controls)
- Transcript/lyrics diff view with highlighted differences
- Expert commentary panel for regional variation analysis
- Optional bookmarks/annotations for researcher sessions

### E6 - Export Academic Datasets

- Export package includes:
  - filtered records
  - metadata columns
  - schema file
  - query manifest (reproducibility)
  - citation/source references
- Formats:
  - CSV/JSON (v1), optional parquet (v2)
- Delivery:
  - async export job + download link + audit trail

## Non-functional requirements

- Performance:
  - facet query latency target (p95) defined per endpoint
  - semantic search latency budget with caching
- Reliability:
  - graceful degradation for graph and AI services
- Security/compliance:
  - role-based access and export auditing
  - PII and sensitive cultural content policy enforcement
- Observability:
  - query analytics, failed query logging, export job monitoring

## Architecture approach (high level)

1. Data layer:
   - normalize metadata taxonomy (ethnic/instrument/ritual/geo)
2. Indexing layer:
   - facet index + vector index + relationship graph store
3. API layer:
   - researcher search API
   - semantic retrieval API
   - QA API with citation contract
   - graph traversal API
   - export job API
4. Frontend layer:
   - unified researcher workspace UI
   - feature modules for each epic

## Delivery phases

### Phase 1 (Foundation)

- Taxonomy/data readiness
- Advanced facet search (E1)
- Researcher guard + audit baseline

Phase 1 implementation status:
- Done: advanced geo facets (province/district/commune), saved filter presets
- Done: facet counts per option, preset rename + pin default UX
- Done: researcher E2E coverage for preset lifecycle + facet-count behavior

### Phase 2 (Intelligence)

- Semantic search engine (E2)
- AI Q&A with citations (E3)

Phase 2 implementation status:
- Done: semantic ranking baseline with intent-facet extraction and explainability snippets in search results
- Done: citation contract baseline for AI Q&A (confidence/rationale prefix + abstain when weak evidence)
- Done: researcher E2E coverage for semantic explainability and citation abstention behavior
- Done: precision@k logging and baseline report export (JSON/CSV) with time-range filter (7d/30d/all)

### Phase 3 (Exploration)

- Knowledge graph MVP (E4)
- Comparative analysis MVP (E5)

Phase 3 implementation status:
- Done: graph search-in-graph, legend, linked-entity traversal with depth 1/2
- Done: comparative sync controls (play/pause/seek) and transcript diff mode (word/sentence)
- Done: E2E baseline for graph exploration and compare workflow

### Phase 4 (Research ops)

- Export datasets + async jobs (E6)
- Hardening, benchmarks, and docs

Phase 4 implementation status:
- Done: academic export package includes records + schema + query manifest + citation references
- Done: async export job UX (queued/processing/completed/failed + progress + download action)
- Done: E2E baseline for async export job flow
- Done: hardening for export flow (cancel/retry, audit log, payload benchmark)

## Task breakdown by domain

### Backend/API

- Define contracts for search, semantic, QA, graph, export
- Implement role checks and audit hooks
- Add async export worker pipeline

### Data/Search

- Build metadata normalization and indexing pipeline
- Define relevance evaluation set and metrics
- Tune retrieval/ranking

### Frontend

- Build researcher workspace navigation
- Implement filter panels, semantic query UX, result explainability
- Implement graph canvas and comparative views

### QA/Test

- E2E flows for all researcher features
- Quality gates:
  - citation presence checks
  - export integrity checks
  - role-restriction checks

## Risks and mitigations

- **Risk:** Metadata inconsistency across sources  
  **Mitigation:** Taxonomy normalization + validation rules before indexing.

- **Risk:** AI hallucination in Q&A  
  **Mitigation:** strict citation-required policy, abstain without evidence.

- **Risk:** Graph performance degradation at scale  
  **Mitigation:** progressive loading, neighborhood caps, cached traversal.

- **Risk:** Overly heavy export jobs  
  **Mitigation:** async queue, size limits, retry policy, and job status API.

## Phase X: Verification checklist

- [x] Researcher-only access enforced for all new routes/endpoints
- [x] Facet search supports required filter dimensions and counts
- [x] Semantic search baseline metrics documented
- [x] AI answers always include verified citations (or abstain)
- [x] Graph traversal interactions pass usability smoke checks
- [x] Comparative side-by-side workflow validated with sample datasets
- [x] Export package includes metadata + schema + query manifest
- [x] E2E + performance + security checks pass before release

Release gate evidence (2026-03-26):
- Build: `npm run build` passed
- E2E suite passed (12/12):
  - `tests/e2e/researcher-phase1.spec.ts`
  - `tests/e2e/researcher-phase2.spec.ts`
  - `tests/e2e/researcher-phase3.spec.ts`
  - `tests/e2e/researcher-phase4.spec.ts`
  - `tests/e2e/contributor-workflow.spec.ts`
  - `tests/e2e/expert-moderation.spec.ts`
- Security/role checks covered by E2E:
  - non-contributor blocked from contributor upload
  - researcher route guard and role-restricted researcher features exercised

## Next steps after plan approval

1. Execute release gate test run:
   - `npm run test:e2e -- tests/e2e/researcher-phase1.spec.ts`
   - `npm run test:e2e -- tests/e2e/researcher-phase2.spec.ts`
   - `npm run test:e2e -- tests/e2e/researcher-phase3.spec.ts`
   - `npm run test:e2e -- tests/e2e/researcher-phase4.spec.ts`
   - `npm run build`
2. Produce release gate summary document:
   - Record E2E pass/fail status by phase
   - Record semantic baseline snapshot (P@3/P@5/P@10)
   - Record export benchmark snapshot (payload bytes + stringify time)
   - Confirm researcher-only access checks for all researcher routes/actions
3. Finalize operational hardening before release:
   - Verify export cancel/retry/download audit log consistency
   - Verify graceful fallback behavior for AI Q&A and graph empty states
   - Verify no critical regressions in contributor/expert flows
4. Prepare release artifacts:
   - Release notes (features delivered in Phase 1-4)
   - Known limitations and follow-up backlog
   - Rollback checklist and owner assignment

