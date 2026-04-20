# Prompt: Implement RAG Chatbox for VietTune Archive

## Bối cảnh dự án

VietTune Archive là hệ thống lưu trữ thông minh âm nhạc cổ truyền Việt Nam. Backend sử dụng **C# .NET (ASP.NET Core Web API)** theo kiến trúc **Repository-Service-Controller**. Dự án đã có sẵn:

- **ChatController** gọi Gemini AI API cho chức năng chat thông thường (KHÔNG sửa/xóa controller này)
- Database PostgreSQL với các bảng đã tồn tại (xem schema bên dưới)
- Kiến trúc repo-service-controller hoàn chỉnh cho các module khác

## Yêu cầu

Thêm một **Local RAG (Retrieval-Augmented Generation) Chatbox** hoạt động song song với chat Gemini hiện có. RAG chatbox này trả lời câu hỏi về âm nhạc cổ truyền Việt Nam dựa trên dữ liệu thực trong database (Recordings, KBEntries, Instruments, EthnicGroups, Ceremonies, v.v.).

---

## Database Schema liên quan (PostgreSQL - đã tồn tại, KHÔNG tạo migration mới trừ khi cần)

### Bảng đã có sẵn phục vụ RAG:

```
QAConversations (Id, UserId, Title, CreatedAt)
QAMessages (Id, ConversationId, Role, Content, SourceRecordingIdsJson, SourceKBEntryIdsJson, ConfidenceScore, FlaggedByExpert, CorrectedByExpertId, ExpertCorrection, CreatedAt)
VectorEmbeddings (Id, RecordingId, EmbeddingJson, ModelVersion, CreatedAt)
KBEntries (Id, Title, Slug, Content, Category, AuthorId, Status, CreatedAt, UpdatedAt)
KBCitations (Id, EntryId, Citation, Url)
Recordings (Id, Title, Description, AudioFileUrl, EthnicGroupId, CeremonyId, VocalStyleId, MusicalScaleId, PerformanceContext, LyricsOriginal, LyricsVietnamese, PerformerName, Status, ...)
Instruments (Id, Name, Category, Description, TuningSystem, ConstructionMethod, OriginEthnicGroupId)
EthnicGroups (Id, Name, Description, LanguageFamily, PrimaryRegion)
Ceremonies (Id, Name, Type, Description, Season)
VocalStyles (Id, Name, Description, EthnicGroupId)
MusicalScales (Id, Name, Description, NotePattern)
RecordingInstruments (RecordingId, InstrumentId, PlayingTechnique)
Annotations (Id, RecordingId, ExpertId, Content, Type, ResearchCitation, ...)
```

### Quan hệ chính:
- Recording → EthnicGroup, Ceremony, VocalStyle, MusicalScale, Commune (→ District → Province)
- Recording ↔ Instrument (many-to-many qua RecordingInstruments)
- Recording ↔ Tag (many-to-many qua RecordingTags)
- KBEntry → Author (User), có KBCitations và KBRevisions
- QAConversation → User, có nhiều QAMessages
- QAMessage có thể bị expert flag/correct

---

## Kiến trúc cần implement

### 1. Tổng quan flow RAG

```
User question
    ↓
RagChatController (POST /api/rag-chat/conversations/{id}/messages)
    ↓
RagChatService
    ↓
┌─────────────────────────────────────────┐
│  1. Embedding: chuyển câu hỏi → vector  │
│     (dùng Gemini Embedding API hoặc     │
│      local sentence-transformers)        │
│  2. Retrieval: tìm documents liên quan  │
│     - Semantic search trong VectorEmbeddings
│     - Full-text search trong KBEntries   │
│     - Structured query trong Recordings, │
│       Instruments, EthnicGroups, etc.    │
│  3. Augmented Generation: ghép context  │
│     + câu hỏi → gọi Gemini API sinh    │
│     câu trả lời có citations            │
└─────────────────────────────────────────┘
    ↓
Lưu QAMessage (với SourceRecordingIdsJson, SourceKBEntryIdsJson, ConfidenceScore)
    ↓
Response trả về client
```

### 2. File structure cần tạo (theo convention hiện có)

```
Controllers/
    RagChatController.cs          # REST endpoints cho RAG chat

Services/
    Interfaces/
        IRagChatService.cs
        IEmbeddingService.cs
        IKnowledgeRetrievalService.cs
    Implementations/
        RagChatService.cs         # Orchestrator chính
        EmbeddingService.cs       # Tạo/so sánh embeddings
        KnowledgeRetrievalService.cs  # Truy vấn DB lấy context

Repositories/
    Interfaces/
        IRagChatRepository.cs
    Implementations/
        RagChatRepository.cs      # CRUD cho QAConversations, QAMessages

DTOs/
    RagChat/
        CreateConversationRequest.cs
        SendMessageRequest.cs
        RagChatMessageResponse.cs
        RagConversationResponse.cs
        RetrievedDocument.cs
```

### 3. Chi tiết từng layer

#### 3.1 Controller: `RagChatController.cs`

```
[Route("api/rag-chat")]
Endpoints:
- POST   /conversations                          → Tạo conversation mới
- GET    /conversations                          → List conversations của user hiện tại
- GET    /conversations/{conversationId}         → Lấy conversation với messages
- POST   /conversations/{conversationId}/messages → Gửi message, nhận RAG response
- DELETE /conversations/{conversationId}         → Xóa conversation
```

Authorize bằng JWT (đã có middleware). Lấy UserId từ claims.

#### 3.2 Service: `RagChatService.cs`

Khi nhận message từ user:

**Bước 1 - Phân tích intent:**
- Parse câu hỏi để xác định user hỏi về gì (instrument, ethnic group, ceremony, recording, general knowledge)
- Có thể dùng regex/keyword matching đơn giản hoặc gọi Gemini với prompt ngắn

**Bước 2 - Retrieval (lấy context từ DB):**

a) **Semantic search** (nếu có embeddings trong VectorEmbeddings):
   - Gọi `IEmbeddingService.GetEmbeddingAsync(question)` để lấy vector câu hỏi
   - So sánh cosine similarity với VectorEmbeddings trong DB
   - Lấy top-K recordings liên quan (K=5)

b) **Full-text search trong KBEntries:**
   - Dùng PostgreSQL full-text search (`to_tsvector`, `to_tsquery`) hoặc `ILIKE` đơn giản
   - Tìm trong KBEntries.Title, KBEntries.Content với Status = Published (1)

c) **Structured retrieval:**
   - Nếu câu hỏi nhắc đến tên nhạc cụ → query Instruments + RecordingInstruments
   - Nếu nhắc đến dân tộc → query EthnicGroups + related Recordings
   - Nếu nhắc đến lễ hội/nghi lễ → query Ceremonies + EthnicGroupCeremonies
   - Nếu nhắc đến phong cách hát → query VocalStyles
   - Nếu nhắc đến thang âm → query MusicalScales
   - Join với bảng Recordings để lấy thêm context

d) **Expert annotations:**
   - Lấy Annotations liên quan đến recordings đã tìm được

**Bước 3 - Build prompt cho Gemini:**
```
System prompt:
"Bạn là chuyên gia về âm nhạc cổ truyền Việt Nam. Trả lời câu hỏi DỰA TRÊN 
thông tin được cung cấp bên dưới. Nếu thông tin không đủ, hãy nói rõ. 
Trả lời bằng tiếng Việt. Trích dẫn nguồn bằng [Recording: <title>] hoặc 
[KB: <title>] khi sử dụng thông tin từ nguồn cụ thể."

Context:
"=== Bài viết từ Knowledge Base ===
{foreach KBEntry: Title + Content (truncate 500 chars each)}

=== Bản ghi âm liên quan ===
{foreach Recording: Title, Description, EthnicGroup.Name, Ceremony.Name, 
 Instruments (joined), PerformanceContext, LyricsVietnamese (truncate)}

=== Nhạc cụ liên quan ===
{foreach Instrument: Name, Category, Description, TuningSystem}

=== Chú thích chuyên gia ===
{foreach Annotation: Content, ResearchCitation}
"

User: "{câu hỏi của user}"
```

**Bước 4 - Gọi Gemini API sinh response:**
- Dùng Gemini API (model gemini-2.0-flash hoặc gemini-1.5-pro)
- Parse response, trích xuất citations

**Bước 5 - Lưu vào DB:**
- Tạo QAMessage với Role = 0 (User) cho câu hỏi
- Tạo QAMessage với Role = 1 (Assistant) cho câu trả lời
- Lưu SourceRecordingIdsJson = JSON array các Recording.Id đã dùng làm context
- Lưu SourceKBEntryIdsJson = JSON array các KBEntry.Id đã dùng làm context  
- ConfidenceScore: có thể để null hoặc tính dựa trên số lượng sources tìm được
- FlaggedByExpert = false (default)

#### 3.3 Service: `EmbeddingService.cs`

```csharp
public interface IEmbeddingService
{
    Task<float[]> GetEmbeddingAsync(string text);
    Task<List<(Guid RecordingId, double Score)>> SearchSimilarAsync(float[] queryVector, int topK = 5);
    Task GenerateAndStoreEmbeddingAsync(Guid recordingId, string textContent);
}
```

**Option A - Gemini Embedding API:**
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent`
- Dimension: 768
- Lưu vào VectorEmbeddings.EmbeddingJson dạng JSON array of floats

**Option B - Local Python microservice (nếu muốn offline):**
- Tạo một Flask/FastAPI nhỏ chạy `sentence-transformers/all-MiniLM-L6-v2`
- C# gọi qua HttpClient
- Chỉ dùng option này nếu cần, ưu tiên Gemini Embedding

**Cosine similarity:** Tính trong C# hoặc dùng PostgreSQL extension `pgvector` (nếu đã cài). Nếu chưa có pgvector, tính trong C#:
```csharp
// Load tất cả embeddings vào memory (nếu dataset nhỏ < 50K)
// hoặc batch query rồi tính cosine similarity trong C#
double CosineSimilarity(float[] a, float[] b) { ... }
```

#### 3.4 Service: `KnowledgeRetrievalService.cs`

```csharp
public interface IKnowledgeRetrievalService
{
    Task<List<RetrievedDocument>> RetrieveAsync(string question, int maxResults = 10);
}
```

RetrievedDocument chứa: SourceType (Recording/KBEntry/Instrument/...), SourceId, Title, Content, RelevanceScore.

Logic retrieval:
1. Extract keywords từ câu hỏi (remove stopwords tiếng Việt)
2. Query song song:
   - `KBEntries` WHERE Content/Title ILIKE '%keyword%' AND Status = 1
   - `Recordings` JOIN EthnicGroups, Instruments, Ceremonies WHERE match
   - `Instruments` WHERE Name/Description ILIKE '%keyword%'
   - `EthnicGroups` WHERE Name/Description ILIKE '%keyword%'
   - `Ceremonies` WHERE Name/Description ILIKE '%keyword%'
3. Merge và rank theo relevance (số keyword match, source type priority)
4. Return top maxResults

#### 3.5 Repository: `RagChatRepository.cs`

```csharp
public interface IRagChatRepository
{
    // QAConversations
    Task<QAConversation> CreateConversationAsync(Guid userId, string? title);
    Task<List<QAConversation>> GetUserConversationsAsync(Guid userId);
    Task<QAConversation?> GetConversationWithMessagesAsync(Guid conversationId);
    Task DeleteConversationAsync(Guid conversationId);
    
    // QAMessages
    Task<QAMessage> AddMessageAsync(QAMessage message);
    Task<List<QAMessage>> GetConversationMessagesAsync(Guid conversationId, int limit = 50);
    
    // Vector search
    Task<List<VectorEmbedding>> GetAllEmbeddingsAsync();
    Task SaveEmbeddingAsync(VectorEmbedding embedding);
}
```

#### 3.6 DTOs

```csharp
public class SendMessageRequest
{
    public string Content { get; set; }  // Câu hỏi của user
}

public class RagChatMessageResponse
{
    public Guid Id { get; set; }
    public int Role { get; set; }  // 0=User, 1=Assistant
    public string Content { get; set; }
    public List<SourceReference>? Sources { get; set; }
    public decimal? ConfidenceScore { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SourceReference
{
    public string Type { get; set; }  // "Recording", "KBEntry", "Instrument"
    public Guid Id { get; set; }
    public string Title { get; set; }
}

public class RagConversationResponse
{
    public Guid Id { get; set; }
    public string? Title { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<RagChatMessageResponse> Messages { get; set; }
}
```

---

## Cấu hình

Thêm vào `appsettings.json`:

```json
{
  "RagChat": {
    "GeminiApiKey": "<key>",
    "GeminiModel": "gemini-2.0-flash",
    "EmbeddingModel": "text-embedding-004",
    "MaxContextTokens": 4000,
    "MaxRetrievedDocuments": 10,
    "SemanticSearchTopK": 5,
    "SystemPrompt": "Bạn là chuyên gia về âm nhạc cổ truyền Việt Nam thuộc hệ thống VietTune Archive. Trả lời câu hỏi dựa trên thông tin được cung cấp. Nếu không có đủ thông tin, hãy nói rõ. Luôn trích dẫn nguồn. Trả lời bằng tiếng Việt."
  }
}
```

DI Registration trong `Program.cs`:
```csharp
builder.Services.AddScoped<IRagChatRepository, RagChatRepository>();
builder.Services.AddScoped<IRagChatService, RagChatService>();
builder.Services.AddScoped<IEmbeddingService, EmbeddingService>();
builder.Services.AddScoped<IKnowledgeRetrievalService, KnowledgeRetrievalService>();
builder.Services.AddHttpClient("GeminiApi");
```

---

## Lưu ý quan trọng

1. **KHÔNG sửa/xóa ChatController hiện có** — RAG chat là module hoàn toàn mới, song song
2. **Conversation history:** Khi gọi Gemini, gửi kèm N messages gần nhất (N=6) của conversation để Gemini hiểu ngữ cảnh hội thoại
3. **Auto-title:** Sau message đầu tiên, tự động đặt title cho conversation bằng cách lấy 50 ký tự đầu câu hỏi hoặc gọi Gemini tóm tắt
4. **Rate limiting:** Giới hạn 20 messages/phút/user
5. **Error handling:** Nếu Gemini API lỗi, trả message lỗi thân thiện, vẫn lưu user message
6. **Embedding generation:** Tạo endpoint hoặc background job để generate embeddings cho Recordings và KBEntries hiện có (dùng Title + Description + related metadata ghép thành text rồi embed)
7. **Status filter:** Chỉ retrieve Recordings có Status = Published và KBEntries có Status = Published
8. Dùng Entity Framework Core (đã có DbContext) — thêm DbSet nếu chưa có cho QAConversation, QAMessage, VectorEmbedding
9. Gemini API gọi qua REST (`HttpClient`), KHÔNG cần SDK riêng — hoặc dùng `Google.GenerativeAI` NuGet nếu tiện

---

## Endpoint tổng hợp cho embedding management (optional nhưng nên có)

```
POST /api/rag-chat/embeddings/generate          → Generate embeddings cho tất cả recordings/KB chưa có
POST /api/rag-chat/embeddings/generate/{recordingId} → Generate cho 1 recording
GET  /api/rag-chat/embeddings/stats              → Thống kê: bao nhiêu đã embed, bao nhiêu chưa
```

Chỉ Admin mới được gọi các endpoint này.
