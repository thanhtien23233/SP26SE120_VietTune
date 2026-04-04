# PLAN: Semantic Search (RAG / Embeddings / Vector DB)

**Slug:** `semantic-search`

## Phase −1 — Context check

### Hiện trạng trong repo (FE)

| Khu vực | Hành vi hiện tại | Ghi chú |
|--------|------------------|---------|
| `SemanticSearchPage` (`/semantic-search`) | Fetch danh sách recordings (ví dụ `getRecordings` tới giới hạn trang), rồi **tokenize** query và **chấm điểm overlap** trên title/description/ethnicity/tags | Không gọi embeddings, không vector DB, không retrieval RAG |
| Explore “semantic” | `semanticLocal` + `exploreSemanticRank.ts` — **rank cục bộ** trên pool đã load | Cùng họ “semantic-like”, không phải vector search |
| Home marketing | Có thể mô phỏng loading / gateway (theo plan gateway) | Không thay thế semantic search thật |
| AI Q&A (chat) | `researcherChatService` → POST tới VietTune AI `/Chat` (hoặc path cấu hình) | **Tách biệt** với “tìm bản thu theo ngữ nghĩa”; RAG thật (nếu có) nằm ở backend AI service, không chứng minh được chỉ từ FE |

### Gap so với mục tiêu “semantic thật”

- Cần **embedding** metadata/lyrics (hoặc chunk text), **lưu vector DB**, **truy vấn similarity**, có thể kết hợp **rerank** / filter facet.
- Cần **đồng bộ ingest**: khi recording/submission được duyệt hoặc metadata đổi → cập nhật index.

### Ràng buộc

- Plan chỉ tài liệu — **không** chứa patch code trong phase này.
- Phạm vi có thể chia: (A) chỉ trang `/semantic-search`, (B) Explore semantic mode, (C) cả hai + API chung.

---

    ## Phase 0 — Socratic gate (cần chốt trước khi implement)

    1. **Nguồn dữ liệu embed**: chỉ bản đã duyệt / public, hay cả draft? Ai được xem kết quả semantic?
    2. **Vector DB**: Pinecone / Weaviate / pgvector / Qdrant / Elastic vector — team đã chọn hay ưu tiên “cùng stack PostgreSQL”?
    3. **Embedding model**: OpenAI `text-embedding-3-*`, local model, hay Gemini — và **chi phí / rate limit**?
    4. **Chunking**: mỗi recording một vector hay chia lyrics/description thành nhiều chunk?
    5. **Hybrid search**: có giữ keyword + facet filter song song với vector score không?
    6. **Latency & NFR**: mục tiêu (ví dụ &lt; 2s) áp dụng cho endpoint nào và trên môi trường nào?
    7. **Privacy**: recording nhạy cảm / embargo có được index semantic không?

*Mặc định gợi ý nếu chưa trả lời:* hybrid (facet + vector), chỉ index **đã công khai/đã duyệt**, pgvector hoặc managed vector DB tùy DevOps.

---

## Phase 1 — Thiết kế hợp đồng API & luồng dữ liệu

| Bước | Việc | Output |
|------|------|--------|
| 1.1 | Định nghĩa endpoint semantic search: input (query, filters, pagination), output (ids + scores + snippet) | OpenAPI snippet / ADR ngắn |
| 1.2 | Định nghĩa pipeline ingest: trigger (on approve, cron, manual reindex) | Sequence diagram hoặc checklist |
| 1.3 | Map field FE hiện tại (`Recording`, filters Explore) → payload backend | Bảng mapping |
| 1.4 | Chiến lược fallback khi vector service down | Keyword-only hoặc empty state + message |

**Gán:** Backend lead + Frontend (contract review).

---

## Phase 2 — Backend: embedding + vector store + retrieval

| Bước | Việc | Ghi chú |
|------|------|---------|
| 2.1 | Job/service tạo embedding từ text đã chuẩn hóa (title, mô tả, lyrics, tags, ethnicity…) | Idempotent theo `recordingId` + version hash metadata |
| 2.2 | Lưu vector + metadata tối thiểu (id, title snippet, permission flags) | Tránh PII không cần thiết trong index |
| 2.3 | Query: embed user query → top-k nearest → áp dụng RBAC / visibility | |
| 2.4 | (Tuỳ chọn RAG “generation”) Nếu cần trả lời tự nhiên kèm nguồn: retrieve top-k → prompt LLM → citations | Tách khỏi “chỉ list recordings” |

**Gán:** Backend + ML/AI nếu có.

---

## Phase 3 — Frontend: tích hợp API thật

| Bước | Việc | File / vùng (gợi ý) |
|------|------|---------------------|
| 3.1 | Thay logic local score trong `SemanticSearchPage` bằng gọi API semantic (giữ debounce, loading, error) | `src/pages/SemanticSearchPage.tsx` |
| 3.2 | Explore mode `semantic`: khi submit, gọi cùng contract hoặc proxy qua BE | `ExplorePage.tsx`, `exploreRecordingsLoad.ts` |
| 3.3 | Hiển thị score/snippet/citations (nếu BE trả) — không phá layout hiện tại | |
| 3.4 | Feature flag / env: `VITE_SEMANTIC_SEARCH_API=1` để rollback local | |

**Gán:** Frontend specialist.

---

## Phase 4 — QA, hiệu năng, vận hành

| Hạng mục | Tiêu chí |
|----------|----------|
| Đúng quyền | User không thấy recording không được phép |
| Chất lượng | Query mẫu tiếng Việt (có dấu / không dấu) cho kết quả hợp lý |
| Hiệu năng | p95 latency theo NFR đã chốt |
| Hồi quy | `/search`, `/explore`, `/semantic-search` vẫn hoạt động khi tắt vector |
| Reindex | Chạy lại ingest sau deploy không làm duplicate sai |

**Gán:** QA + DevOps (monitoring, alert khi index lag).

---

## Agent assignments

| Vai trò | Trách nhiệm |
|---------|-------------|
| Planner / PM | Chốt Phase 0, phạm vi A/B/C |
| Backend | API semantic + ingest + vector DB |
| Frontend | Gọi API, UX loading/error, feature flag |
| QA | Ma trận query + permission + regression |
| DevOps | Secrets, quota embedding, job reindex |

---

## Phase X — Verification checklist

- [ ] Phase 0 đã trả lời (vector DB, model, phạm vi index, hybrid vs pure vector).
- [ ] Có tài liệu contract API semantic search (request/response).
- [ ] Ingest chạy được trên môi trường dev/staging; vector count khớp số bản ghi kỳ vọng.
- [ ] `SemanticSearchPage` dùng API thật (hoặc feature flag bật) và không còn chỉ local overlap **khi flag bật**.
- [ ] Explore semantic mode (nếu trong scope) dùng cùng nguồn truth.
- [ ] Không lộ recording bị hạn chế qua semantic API.
- [ ] Đo latency và ghi vào biên bản (hoặc dashboard).
- [ ] Fallback khi vector/embedding lỗi: UX rõ ràng, không crash.

---

## Next execution entry point

Sau khi chốt Phase 0: chạy `/create` theo Phase 1 → 2 → 3, hoặc tách spike backend-only trước khi sửa FE.

---

*Tạo theo lệnh `/plan SemanticSearch` — chỉ kế hoạch, không chứa mã triển khai.*
