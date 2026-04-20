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
RagChatService (C# .NET — orchestrator)
    ↓
┌──────────────────────────────────────────────────────┐
│  1. Embedding: chuyển câu hỏi → vector               │
│     C# gọi Python microservice (FastAPI)             │
│     → sentence-transformers/all-MiniLM-L6-v2         │
│     → trả về vector 384 chiều                        │
│                                                      │
│  2. Retrieval: tìm documents liên quan               │
│     - Semantic search: cosine similarity với          │
│       VectorEmbeddings trong DB                      │
│     - Full-text search trong KBEntries               │
│     - Structured query: Recordings, Instruments, ... │
│                                                      │
│  3. Augmented Generation: ghép context + câu hỏi    │
│     C# gọi Python microservice (FastAPI)             │
│     → Ollama chạy local LLM (gemma3:4b hoặc         │
│       qwen2.5:7b hoặc mistral:7b)                   │
│     → sinh câu trả lời có citations                 │
└──────────────────────────────────────────────────────┘
    ↓
Lưu QAMessage (với SourceRecordingIdsJson, SourceKBEntryIdsJson, ConfidenceScore)
    ↓
Response trả về client
```

**Kiến trúc 2 thành phần:**
- **C# .NET (chính):** Controller, Service, Repository, orchestration logic, DB access
- **Python FastAPI (phụ):** Chỉ làm 2 việc — embedding và LLM generation. C# gọi qua HTTP. Python KHÔNG truy cập DB, KHÔNG có business logic

### 2. File structure cần tạo

**C# .NET (theo convention hiện có):**
```
Controllers/
    RagChatController.cs          # REST endpoints cho RAG chat

Services/
    Interfaces/
        IRagChatService.cs
        IEmbeddingService.cs
        ILocalLlmService.cs       # Gọi Python microservice cho LLM generation
        IKnowledgeRetrievalService.cs
    Implementations/
        RagChatService.cs         # Orchestrator chính
        EmbeddingService.cs       # Gọi Python microservice cho embedding
        LocalLlmService.cs        # Gọi Python microservice cho LLM generation
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

**Python FastAPI microservice (tạo folder riêng, ví dụ `ai-service/`):**
```
viettune-rag-service/
    main.py                       # FastAPI app — 2 endpoints: /embed và /generate
    requirements.txt              # sentence-transformers, fastapi, uvicorn, httpx
    Dockerfile                    # Optional — để deploy
    README.md                     # Hướng dẫn cài đặt Ollama + chạy service
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

**Bước 3 - Build prompt cho Local LLM:**
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

**Bước 4 - Gọi Local LLM sinh response:**
- C# `LocalLlmService` gọi HTTP POST đến Python microservice endpoint `/generate`
- Python microservice forward request đến Ollama API (`http://localhost:11434/api/chat`)
- Model khuyến nghị: `gemma3:4b` (nhẹ, hỗ trợ tiếng Việt tốt) hoặc `qwen2.5:7b` hoặc `mistral:7b`
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

**Implementation:** Gọi Python microservice qua HttpClient:

```csharp
public class EmbeddingService : IEmbeddingService
{
    private readonly HttpClient _httpClient;

    public EmbeddingService(IHttpClientFactory httpClientFactory)
    {
        _httpClient = httpClientFactory.CreateClient("AiService");
    }

    public async Task<float[]> GetEmbeddingAsync(string text)
    {
        var response = await _httpClient.PostAsJsonAsync("/embed", new { text });
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<EmbeddingResponse>();
        return result.Embedding;
    }
    // ...
}
```

- Model: `sentence-transformers/all-MiniLM-L6-v2` (chạy trong Python microservice)
- Dimension: 384
- Lưu vào VectorEmbeddings.EmbeddingJson dạng JSON array of floats
- Hoàn toàn offline, không cần API key, không cần internet

**Cosine similarity:** Tính trong C# hoặc dùng PostgreSQL extension `pgvector` (nếu đã cài). Nếu chưa có pgvector, tính trong C#:
```csharp
// Load tất cả embeddings vào memory (nếu dataset nhỏ < 50K)
// hoặc batch query rồi tính cosine similarity trong C#
double CosineSimilarity(float[] a, float[] b) { ... }
```

#### 3.4 Service: `LocalLlmService.cs`

```csharp
public interface ILocalLlmService
{
    Task<string> GenerateAsync(string systemPrompt, string userPrompt, List<ChatMessage>? history = null);
}
```

**Implementation:** Gọi Python microservice qua HttpClient:

```csharp
public class LocalLlmService : ILocalLlmService
{
    private readonly HttpClient _httpClient;

    public LocalLlmService(IHttpClientFactory httpClientFactory)
    {
        _httpClient = httpClientFactory.CreateClient("AiService");
    }

    public async Task<string> GenerateAsync(string systemPrompt, string userPrompt, List<ChatMessage>? history = null)
    {
        var request = new
        {
            system_prompt = systemPrompt,
            user_prompt = userPrompt,
            history = history?.Select(m => new { role = m.Role == 0 ? "user" : "assistant", content = m.Content })
        };
        var response = await _httpClient.PostAsJsonAsync("/generate", request);
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<GenerateResponse>();
        return result.Content;
    }
}
```

#### 3.5 Python microservice: `ai-service/main.py`

Đây là toàn bộ Python microservice — file duy nhất cần viết phía Python:

```python
from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import httpx

app = FastAPI()

# Load embedding model 1 lần khi startup (cache trong memory)
embed_model = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")

OLLAMA_URL = "http://localhost:11434"  # Ollama chạy local
LLM_MODEL = "gemma3:4b"               # Có thể đổi sang qwen2.5:7b, mistral:7b

# === Endpoint 1: Embedding ===
class EmbedRequest(BaseModel):
    text: str

class EmbedResponse(BaseModel):
    embedding: list[float]

@app.post("/embed", response_model=EmbedResponse)
async def embed(req: EmbedRequest):
    vector = embed_model.encode(req.text).tolist()
    return EmbedResponse(embedding=vector)

# === Endpoint 2: LLM Generation ===
class ChatMessage(BaseModel):
    role: str       # "user" hoặc "assistant"
    content: str

class GenerateRequest(BaseModel):
    system_prompt: str
    user_prompt: str
    history: list[ChatMessage] | None = None

class GenerateResponse(BaseModel):
    content: str

@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    messages = []
    
    # System prompt
    messages.append({"role": "system", "content": req.system_prompt})
    
    # Conversation history (nếu có)
    if req.history:
        for msg in req.history:
            messages.append({"role": msg.role, "content": msg.content})
    
    # User prompt hiện tại (đã ghép context + câu hỏi)
    messages.append({"role": "user", "content": req.user_prompt})
    
    # Gọi Ollama API
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": LLM_MODEL,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": 0.3,      # Thấp → trả lời chính xác hơn
                    "num_predict": 1024,      # Max tokens
                }
            }
        )
        response.raise_for_status()
        data = response.json()
        return GenerateResponse(content=data["message"]["content"])

# === Health check ===
@app.get("/health")
async def health():
    # Kiểm tra Ollama có đang chạy không
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{OLLAMA_URL}/api/tags")
            models = [m["name"] for m in r.json().get("models", [])]
            return {"status": "ok", "ollama": True, "models": models}
    except Exception:
        return {"status": "degraded", "ollama": False, "models": []}
```

**`ai-service/requirements.txt`:**
```
fastapi==0.115.*
uvicorn[standard]==0.34.*
sentence-transformers==3.4.*
httpx==0.28.*
```

**Cách chạy:**
```bash
# 1. Cài Ollama (https://ollama.com)
curl -fsSL https://ollama.com/install.sh | sh

# 2. Pull model LLM
ollama pull gemma3:4b

# 3. Chạy Python microservice
cd ai-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

#### 3.6 Service: `KnowledgeRetrievalService.cs`

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

#### 3.7 Repository: `RagChatRepository.cs`

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

#### 3.8 DTOs

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

## 4. Embedding Pipeline — Tự động trigger khi approve (QUAN TRỌNG)

Embedding KHÔNG được tạo bằng cách admin gọi tay API. Thay vào đó, embedding phải được **tự động generate** khi dữ liệu mới được approve/publish. Đây là phần cốt lõi để RAG luôn cập nhật.

### 4.1 Nguyên tắc

- Mỗi khi một Recording được approve (Published) → tự động tạo embedding cho recording đó
- Mỗi khi một KBEntry được publish → tự động tạo embedding cho bài viết đó
- Mỗi khi Recording/KBEntry bị update metadata sau khi đã published → tự động re-generate embedding
- Embedding generation là side-effect của business logic, KHÔNG phải endpoint riêng mà user/admin phải nhớ gọi

### 4.2 Hook vào ReviewService (đã có sẵn)

Tìm service xử lý logic approve submission trong codebase hiện tại (có thể là `ReviewService`, `SubmissionService`, hoặc tương tự). Tìm method thực hiện approve — nơi mà `Submission.Status` được set thành Approved và `Recording.Status` được set thành Published.

**Thêm vào cuối method approve đó:**

```csharp
// === TRONG ReviewService.cs (hoặc SubmissionService.cs) — method Approve ===
// Sau khi đã:
//   submission.Status = SubmissionStatus.Approved;
//   recording.Status = RecordingStatus.Published;
//   await _context.SaveChangesAsync();

// Thêm dòng này — gọi embedding service:
await _embeddingService.GenerateEmbeddingForRecordingAsync(recording.Id);
```

**Inject `IEmbeddingService` vào constructor của ReviewService:**

```csharp
public class ReviewService : IReviewService
{
    private readonly IReviewRepository _reviewRepository;
    private readonly IEmbeddingService _embeddingService; // ← THÊM
    // ... các dependency khác

    public ReviewService(
        IReviewRepository reviewRepository,
        IEmbeddingService embeddingService, // ← THÊM
        // ... 
    )
    {
        _reviewRepository = reviewRepository;
        _embeddingService = embeddingService; // ← THÊM
    }
}
```

### 4.3 Hook vào KBEntryService (đã có sẵn)

Tương tự, tìm method publish KBEntry (nơi `KBEntry.Status` được set thành Published).

```csharp
// === TRONG KBEntryService.cs — method Publish/Approve ===
// Sau khi:
//   kbEntry.Status = KBEntryStatus.Published;
//   await _context.SaveChangesAsync();

// Thêm:
await _embeddingService.GenerateEmbeddingForKBEntryAsync(kbEntry.Id);
```

**Inject `IEmbeddingService` vào constructor của KBEntryService** theo cách tương tự.

### 4.4 EmbeddingService — Interface đầy đủ

```csharp
public interface IEmbeddingService
{
    // === Được gọi TỰ ĐỘNG từ ReviewService/KBEntryService ===
    Task GenerateEmbeddingForRecordingAsync(Guid recordingId);
    Task GenerateEmbeddingForKBEntryAsync(Guid entryId);

    // === Được gọi từ RagChatService khi user hỏi ===
    Task<float[]> GetEmbeddingAsync(string text);
    Task<List<(Guid RecordingId, double Score)>> SearchSimilarRecordingsAsync(float[] queryVector, int topK = 5);
    Task<List<(Guid EntryId, double Score)>> SearchSimilarKBEntriesAsync(float[] queryVector, int topK = 5);

    // === Được gọi từ Admin endpoint — chỉ để backfill/re-generate ===
    Task<int> BackfillAllMissingEmbeddingsAsync();
    Task<EmbeddingStatsDto> GetStatsAsync();
}
```

### 4.5 Chi tiết GenerateEmbeddingForRecordingAsync

```csharp
public async Task GenerateEmbeddingForRecordingAsync(Guid recordingId)
{
    // 1. Load recording với tất cả related data
    var recording = await _context.Recordings
        .Include(r => r.EthnicGroup)
        .Include(r => r.Ceremony)
        .Include(r => r.VocalStyle)
        .Include(r => r.MusicalScale)
        .Include(r => r.RecordingInstruments)
            .ThenInclude(ri => ri.Instrument)
        .Include(r => r.Annotations)
        .FirstOrDefaultAsync(r => r.Id == recordingId);

    if (recording == null) return;

    // 2. Build text content — ghép TẤT CẢ metadata thành 1 chuỗi
    var textParts = new List<string>();

    if (!string.IsNullOrEmpty(recording.Title))
        textParts.Add($"Tên: {recording.Title}");

    if (!string.IsNullOrEmpty(recording.Description))
        textParts.Add($"Mô tả: {recording.Description}");

    if (recording.EthnicGroup != null)
        textParts.Add($"Dân tộc: {recording.EthnicGroup.Name}");

    if (recording.Ceremony != null)
        textParts.Add($"Nghi lễ: {recording.Ceremony.Name} ({recording.Ceremony.Type})");

    if (recording.VocalStyle != null)
        textParts.Add($"Phong cách hát: {recording.VocalStyle.Name}");

    if (recording.MusicalScale != null)
        textParts.Add($"Thang âm: {recording.MusicalScale.Name}");

    var instruments = recording.RecordingInstruments?
        .Select(ri => ri.Instrument?.Name)
        .Where(n => n != null);
    if (instruments?.Any() == true)
        textParts.Add($"Nhạc cụ: {string.Join(", ", instruments)}");

    if (!string.IsNullOrEmpty(recording.PerformanceContext))
        textParts.Add($"Bối cảnh trình diễn: {recording.PerformanceContext}");

    if (!string.IsNullOrEmpty(recording.LyricsVietnamese))
        textParts.Add($"Lời Việt: {recording.LyricsVietnamese.Substring(0, Math.Min(500, recording.LyricsVietnamese.Length))}");

    // Ghép annotations của expert (nếu có)
    var annotations = recording.Annotations?
        .Select(a => a.Content)
        .Where(c => !string.IsNullOrEmpty(c));
    if (annotations?.Any() == true)
        textParts.Add($"Chú thích chuyên gia: {string.Join(". ", annotations.Take(3))}");

    var fullText = string.Join(". ", textParts);

    // 3. Gọi Python microservice endpoint /embed
    float[] vector = await GetEmbeddingAsync(fullText);

    // 4. Upsert vào VectorEmbeddings
    //    (xóa embedding cũ nếu có — để handle re-generate khi metadata thay đổi)
    var existing = await _context.VectorEmbeddings
        .FirstOrDefaultAsync(v => v.RecordingId == recordingId);

    if (existing != null)
    {
        existing.EmbeddingJson = JsonSerializer.Serialize(vector);
        existing.ModelVersion = "all-MiniLM-L6-v2";
        existing.CreatedAt = DateTime.UtcNow;
    }
    else
    {
        _context.VectorEmbeddings.Add(new VectorEmbedding
        {
            Id = Guid.NewGuid(),
            RecordingId = recordingId,
            EmbeddingJson = JsonSerializer.Serialize(vector),
            ModelVersion = "all-MiniLM-L6-v2",
            CreatedAt = DateTime.UtcNow
        });
    }

    await _context.SaveChangesAsync();
}
```

### 4.6 Chi tiết GenerateEmbeddingForKBEntryAsync

```csharp
public async Task GenerateEmbeddingForKBEntryAsync(Guid entryId)
{
    var entry = await _context.KBEntries
        .Include(e => e.KBCitations)
        .FirstOrDefaultAsync(e => e.Id == entryId);

    if (entry == null) return;

    var textParts = new List<string>();
    textParts.Add($"Tiêu đề: {entry.Title}");
    textParts.Add($"Nội dung: {entry.Content.Substring(0, Math.Min(1500, entry.Content.Length))}");

    var citations = entry.KBCitations?.Select(c => c.Citation).Where(c => !string.IsNullOrEmpty(c));
    if (citations?.Any() == true)
        textParts.Add($"Trích dẫn: {string.Join("; ", citations.Take(5))}");

    var fullText = string.Join(". ", textParts);
    float[] vector = await GetEmbeddingAsync(fullText);

    // NOTE: Bảng VectorEmbeddings hiện chỉ có RecordingId, chưa có KBEntryId.
    // Có 2 cách xử lý:
    //
    // Cách 1 (KHUYẾN NGHỊ): Tạo migration thêm cột KBEntryId (nullable) vào VectorEmbeddings
    //   ALTER TABLE "VectorEmbeddings" ADD COLUMN "KBEntryId" uuid NULL 
    //     REFERENCES "KBEntries"("Id") ON DELETE CASCADE;
    //   Và thêm CHECK constraint: RecordingId IS NOT NULL OR KBEntryId IS NOT NULL
    //
    // Cách 2 (không cần migration): Tạo bảng riêng KBEmbeddings với cấu trúc tương tự
    //   CREATE TABLE "KBEmbeddings" (
    //     "Id" uuid PRIMARY KEY, "EntryId" uuid NOT NULL REFERENCES "KBEntries"("Id"),
    //     "EmbeddingJson" text NOT NULL, "ModelVersion" varchar(100), "CreatedAt" timestamp
    //   );

    // Implement theo cách đã chọn, upsert tương tự recording
}
```

### 4.7 Re-generate khi metadata thay đổi

Nếu expert sửa metadata recording sau khi đã published (ví dụ sửa tên nhạc cụ, thêm annotation, sửa mô tả), embedding cũ sẽ bị lỗi thời. Cần hook thêm:

```csharp
// Trong service xử lý update recording metadata:
public async Task UpdateRecordingMetadataAsync(Guid recordingId, UpdateRecordingDto dto)
{
    // ... update logic hiện có ...
    await _context.SaveChangesAsync();

    // Re-generate embedding nếu recording đã published
    var recording = await _context.Recordings.FindAsync(recordingId);
    if (recording?.Status == RecordingStatus.Published)
    {
        await _embeddingService.GenerateEmbeddingForRecordingAsync(recordingId);
    }
}
```

Tương tự cho Annotation — khi expert thêm/sửa annotation cho một recording đã published:

```csharp
// Trong AnnotationService, sau khi tạo/sửa annotation:
public async Task CreateAnnotationAsync(CreateAnnotationDto dto)
{
    // ... tạo annotation ...
    await _context.SaveChangesAsync();

    // Re-generate embedding cho recording liên quan
    var recording = await _context.Recordings.FindAsync(dto.RecordingId);
    if (recording?.Status == RecordingStatus.Published)
    {
        await _embeddingService.GenerateEmbeddingForRecordingAsync(dto.RecordingId);
    }
}
```

### 4.8 Error handling cho embedding generation

Embedding generation gọi external API (Gemini), có thể fail. KHÔNG được để lỗi embedding block luồng approve:

```csharp
// Trong ReviewService.Approve():
try
{
    await _embeddingService.GenerateEmbeddingForRecordingAsync(recording.Id);
}
catch (Exception ex)
{
    // Log lỗi nhưng KHÔNG throw — approve vẫn thành công
    _logger.LogError(ex, "Failed to generate embedding for recording {RecordingId}. " +
        "Recording đã published nhưng chưa có embedding. Kiểm tra Python AI service có đang chạy không. Cần re-generate sau.", recording.Id);
    // Recording vẫn searchable qua full-text/structured query, chỉ thiếu semantic search
}
```

### 4.9 Tóm tắt tất cả nơi cần hook IEmbeddingService

| Service hiện có | Method | Hook gì |
|---|---|---|
| ReviewService (hoặc SubmissionService) | Approve() | `GenerateEmbeddingForRecordingAsync` |
| KBEntryService | Publish() / Approve() | `GenerateEmbeddingForKBEntryAsync` |
| RecordingService (nếu có) | UpdateMetadata() | `GenerateEmbeddingForRecordingAsync` (re-gen) |
| AnnotationService | Create() / Update() | `GenerateEmbeddingForRecordingAsync` (re-gen) |
| KBEntryService | Update() (sau publish) | `GenerateEmbeddingForKBEntryAsync` (re-gen) |

---

## Cấu hình

Thêm vào `appsettings.json`:

```json
{
  "RagChat": {
    "AiServiceBaseUrl": "http://localhost:8000",
    "MaxContextTokens": 2000,
    "MaxRetrievedDocuments": 10,
    "SemanticSearchTopK": 5,
    "SystemPrompt": "Bạn là chuyên gia về âm nhạc cổ truyền Việt Nam thuộc hệ thống VietTune Archive. Trả lời câu hỏi dựa trên thông tin được cung cấp. Nếu không có đủ thông tin, hãy nói rõ. Luôn trích dẫn nguồn. Trả lời bằng tiếng Việt.",
    "RequestTimeoutSeconds": 120
  }
}
```

DI Registration trong `Program.cs`:
```csharp
builder.Services.AddScoped<IRagChatRepository, RagChatRepository>();
builder.Services.AddScoped<IRagChatService, RagChatService>();
builder.Services.AddScoped<IEmbeddingService, EmbeddingService>();
builder.Services.AddScoped<ILocalLlmService, LocalLlmService>();
builder.Services.AddScoped<IKnowledgeRetrievalService, KnowledgeRetrievalService>();

// HttpClient cho Python AI microservice
builder.Services.AddHttpClient("AiService", client =>
{
    var config = builder.Configuration.GetSection("RagChat");
    client.BaseAddress = new Uri(config["AiServiceBaseUrl"] ?? "http://localhost:8000");
    client.Timeout = TimeSpan.FromSeconds(int.Parse(config["RequestTimeoutSeconds"] ?? "120"));
});
```

---

## Lưu ý quan trọng

1. **KHÔNG sửa/xóa ChatController hiện có** — ChatController dùng Gemini API cho chat thông thường, giữ nguyên. RAG chat là module hoàn toàn mới, song song, dùng local model
2. **Embedding tự động — KHÔNG gọi tay:** Embedding được generate tự động khi Recording approve hoặc KBEntry publish (xem Section 4). KHÔNG bao giờ yêu cầu admin nhớ gọi API generate embedding
3. **Conversation history:** Khi gọi local LLM, gửi kèm N messages gần nhất (N=6) của conversation để LLM hiểu ngữ cảnh hội thoại
4. **Auto-title:** Sau message đầu tiên, tự động đặt title cho conversation bằng cách lấy 50 ký tự đầu câu hỏi hoặc gọi local LLM tóm tắt
5. **Rate limiting:** Giới hạn 20 messages/phút/user
6. **Error handling:** Nếu Python microservice lỗi khi generate embedding → log error, KHÔNG block luồng approve. Nếu LLM lỗi khi chat → trả message lỗi thân thiện, vẫn lưu user message
7. **Status filter:** Chỉ retrieve Recordings có Status = Published và KBEntries có Status = Published
8. Dùng Entity Framework Core (đã có DbContext) — thêm DbSet nếu chưa có cho QAConversation, QAMessage, VectorEmbedding
9. **KHÔNG dùng Gemini/OpenAI cho RAG chat** — toàn bộ dùng local model qua Python microservice. Gemini chỉ dùng ở ChatController cũ (giữ nguyên)
10. **Inject IEmbeddingService vào các service hiện có** (ReviewService, KBEntryService, AnnotationService, RecordingService) — đây là thay đổi DUY NHẤT cần làm trên code cũ, chỉ thêm 2-3 dòng mỗi service
11. **Yêu cầu phần cứng tối thiểu cho local LLM:** RAM 8GB+, model 4b cần ~3GB VRAM (hoặc chạy CPU). Nếu server yếu, dùng `gemma3:1b` thay `gemma3:4b`
12. **MaxContextTokens = 2000** (thấp hơn Gemini vì local model context window nhỏ hơn). Truncate context nếu vượt giới hạn

---

## Endpoint Admin cho embedding management (chỉ dùng để backfill/bảo trì)

Các endpoint này KHÔNG phải flow chính. Chỉ dùng khi:
- Dữ liệu cũ đã published trước khi có RAG, cần backfill embedding
- Đổi model embedding (ví dụ từ all-MiniLM-L6-v2 sang model mới), cần re-generate tất cả
- Debug/kiểm tra trạng thái embedding

```
POST /api/rag-chat/embeddings/backfill           → Generate embeddings cho TẤT CẢ recordings/KB đã published mà chưa có embedding
POST /api/rag-chat/embeddings/regenerate/{id}    → Re-generate cho 1 recording cụ thể (override cũ)
GET  /api/rag-chat/embeddings/stats              → Thống kê: tổng published, đã embed, chưa embed, model version
```

Chỉ Admin mới được gọi các endpoint này. Authorize bằng role check.
