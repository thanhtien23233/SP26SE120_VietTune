# Kế hoạch và Quy trình Chi tiết (Detailed Flow) của Researcher

Tài liệu này cung cấp **luồng hoạt động chi tiết (Step-by-step Detailed Flow)** về cách toàn bộ phân hệ **Researcher Intelligence Suite** hoạt động, bao gồm các lời gọi API, thuật toán xử lý dữ liệu ở Client, và mã nguồn (Code snippets) cho quá trình Review. Khác với bản tóm tắt, tài liệu này đi sâu vào logic kỹ thuật của từng tương tác sau khi hệ thống được tái cấu trúc (Refactored).

---

## 1. Khởi tạo Không gian Nghiên cứu (Initialization & Role Control)

**Điều kiện tiên quyết:** Chỉ người dùng có `UserRole.RESEARCHER` hoặc `UserRole.EXPERT` mới được truy cập `/researcher`.

Ngay khi load trang `ResearcherPortalPage.tsx`, hệ thống gọi Custom Hook `useResearcherData()`. Hook này đóng vai trò là "Bộ não" quản lý trạng thái, đã được tối ưu hóa để loại bỏ hiện tượng "God Object".

### 1.1 Khởi tạo Dữ liệu Tham chiếu (Reference Data)
Hệ thống gọi đồng thời (parallel) 4 APIs để lấy danh mục Metadata, dùng cho bộ lọc và Knowledge Graph.

```typescript
// Trong useResearcherData.ts
const settled = await Promise.allSettled([
  referenceDataService.getEthnicGroups(),
  referenceDataService.getCeremonies(),
  referenceDataService.getInstruments(),
  referenceDataService.getCommunes(),
]);
// Cập nhật state cho ethnicRefData, ceremonyRefData, instrumentRefData, communeRefData
```

### 1.2 Truy vấn Bản thu (Search Query Builder) & Data Separation
Hệ thống xử lý Filter dựa trên **ID-based matching** để đảm bảo tính an toàn thay vì matching bằng String như trước kia. 

Dữ liệu được chia làm 3 phân vùng (Data Separation):
1. `searchResults`: Dữ liệu thô (Raw Data) nguyên bản từ API Backend trả về.
2. `analysisDataset`: Dữ liệu đã đi qua Mapping chuẩn hóa (`mapRecordingToAnalysisRecord`), dùng làm Input cho Graph, Compare và Q&A.
3. `uiDerivedData`: Dữ liệu chuyên biệt phục vụ render Filter/List Component trên giao diện (`mapRecordingToUiRecord`).

```typescript
const buildRecordingSearchQuery = useCallback((): RecordingSearchByFilterQuery => {
  return {
    page: 1,
    pageSize: 500,
    q: searchQuery.trim() || undefined,
    ethnicGroupId: filters.ethnicGroupId, // Trực tiếp sử dụng ID thay vì normalize text
    instrumentId: filters.instrumentId,
    ceremonyId: filters.ceremonyId,
    regionCode: filters.regionCode,
    communeId: filters.communeId,
  };
}, [filters, searchQuery]);
```

---

## 2. Luồng Hỏi đáp Thông minh (AI Q&A Flow)

Hệ thống Q&A sử dụng **Server-side RAG** để quyết định trích dẫn học thuật, gỡ bỏ trách nhiệm Client-side Mocking.

1. **Gửi câu hỏi:** Đẩy tin nhắn User vào DB và Box Chat.
2. **Gọi AI API:** Gọi `sendResearcherChatMessage(text)`. Hàm này trả về Object chuẩn `ResearcherChatResponse` `{ answer: string, citations?: [] }`.
3. **Fallback Adapter:** `normalizeResearcherChatResponse` sẽ cover trường hợp API cũ trả về string thuần hoặc khi Network có lỗi.
4. **Hiển thị & Lưu DB:** Trích dẫn (`citations`) do AI chỉ định được map sang UUID của bản thu. Lưu lại `sourceRecordingIdsJson` vào Cơ sở dữ liệu để làm bằng chứng (Audit trail).

```typescript
// Trong ResearcherPortalPage.tsx -> sendQaQuestion
const reply = await sendResearcherChatMessage(text);
const content = reply?.answer ?? CHAT_API_FALLBACK;

let citations = (reply?.citations ?? []).map((c) => ({
  recordingId: c.recordingId,
  label: c.title || `Bản thu ${c.recordingId.split('-')[0]}`,
}));

setChatMessages((prev) => [...prev, { role: 'assistant', content, citations }]);

await createQAMessage({
  // ...
  content,
  sourceRecordingIdsJson: JSON.stringify(citations.map(c => c.recordingId)),
  role: 1 // Assistant
});
```

---

## 3. Luồng So sánh Phân tích (Comparative Analysis Flow)

Tab **Compare** tối ưu hóa hiệu suất chống hiện tượng Race Condition và Spam API ML thông qua 3 cơ chế: Debounce, Sequence Guard, và Local Cache.

### 3.1 Chống Race Condition (Sequence Guard) & Local Cache
Do `leftId` và `rightId` thay đổi liên tục, hệ thống tách Loading thành `leftAiLoading` và `rightAiLoading`.

```typescript
// Trong ResearcherPortalCompareTab.tsx
const isCached = fetchedAiIds.current.has(leftId);
leftRequestRef.current += 1;
const seq = leftRequestRef.current; // Snapshot Sequence hiện hành

const runFetch = () => {
  instrumentDetectionService.analyzeRecording(leftId)
    .then((result) => {
      fetchedAiIds.current.add(leftId);
      // Chỉ set nếu người dùng CHƯA bấm sang bản thu khác (sequence vẫn khớp)
      if (leftRequestRef.current === seq) setLeftAi(result); 
    })
};

// Skip debounce nếu đã Cache
if (isCached) runFetch(); 
else setTimeout(runFetch, 400); // Debounce 400ms chống spam click
```

### 3.2 Nhận diện sự tương đồng (Base Song Identification)
Kiểm tra xem 2 bản ghi có chung gốc bài hát không thông qua việc Normalize Title để gợi ý phân tích dị bản nhạc cụ.
### 3.3 Đồng bộ Audio (Dual Audio Player)
Phát đồng thời cả 2 bản ghi (Rhythm sync) thông qua Component `<DualAudioComparePlayer>`.

---

## 4. Luồng Biểu đồ Tri thức (Knowledge Graph Flow)

Biểu đồ tri thức (Graph) lấy dữ liệu ưu tiên từ mảng `analysisDataset` (đã chuẩn hóa). Logic tách biệt hoàn toàn vào một Pure Function để chống sập UI (Harden).

1. **Chuẩn hóa ID Node (ID-based Entity Resolution):** Dùng UUID của `referenceData` (nếu có) để tạo khóa (Key Node). Fallback xuống text không dấu. Tránh tình trạng đẻ ra Duplicate Nodes (VD: "Đàn Bầu", "đàn bầu").
2. **Empty Guard:** `if (!node.id || !node.name) return;` chống Crash nếu BE trả về Dataset lỗi (Null, Malformed).
3. **Xây dựng Liên kết (Edges):** Trọng số của 1 Node tăng lên thông qua biến `val` khi có nhiều bản thu liên quan trỏ về nó.

*(TODO: Di dời khối tính toán Graph Computation này lên Server/Neo4j khi số lượng Node đạt tới ngưỡng vài chục nghìn)*

---

## 5. Luồng Xuất dữ liệu học thuật (Dataset Export Flow)

Chuyển đổi dữ liệu từ Portal sang File phục vụ nghiên cứu thực tế (Academic Research Grade).

1. **Data Source ưu tiên:** Truyền `analysisDataset` vào thay vì raw data. Truyền kèm cấu hình bộ lọc (`filtersSummary`) để User ghi nhớ tham số Query.
2. **Metadata Manifest JSON:**
   - Phiên bản Schema: `schemaVersion: '1.1'`
   - Bổ sung `generatedBy: "VietTune Researcher Portal"`, `exportedAt`, `totalRecords`.
3. **An toàn Format (Safe CSV Parsing):** `quoteCsvCell` tự động wrap `JSON.stringify` trong hàm `try-catch` nếu giá trị đầu vào là Arrays / Nested Objects (tránh hiện chữ `[object Object]` làm vỡ CSV).
4. **Audit Log Tolerant:** Tiến trình đẩy Log về Server được bọc riêng biệt. Export vẫn thành công trọn vẹn (Tải file về bình thường) ngay cả khi Audit Server bị Timeout/Fail.

```typescript
try {
  blob = format === 'json' ? toJson(rows, meta) : toCsv(rows, selectedColumns, meta);
} catch (e) {
  uiToast.error('Không thể tạo file');
  return;
}
triggerDownload(blob, buildFilename(format));

try {
  // Lỗi Audit sẽ KHÔNG làm văng (crash) tiến trình báo thành công
  await auditLogService.logExport(...);
} catch (auditErr) {
  console.warn('Audit log failed, but export succeeded', auditErr);
}
```

---

## KẾT LUẬN VỀ THIẾT KẾ KỸ THUẬT ĐƯỢC TÁI CẤU TRÚC
- **One-way Data Flow & Separation of Concerns**: Mảng dữ liệu bị tách lớp nghiêm ngặt ở Hook.
- **Micro-services in UI (Graceful Degradation)**: Tab Compare (ML Service), Tab QA (RAG Backend), Tab Export (CSV Engine, Audit Log) hoạt động biệt lập. Lỗi ở một Service không kéo sập phân hệ.
- **ID-driven Architecture**: Chuyển toàn bộ các matching chuỗi/String text lỗi thời thành UUID matching (Từ Filter Bar, Node Graph cho đến Citation API).

*Cập nhật: Đã khắc phục hoàn toàn các lỗi TypeScript gây ra bởi sự thay đổi của OpenAPI DTOs.*
