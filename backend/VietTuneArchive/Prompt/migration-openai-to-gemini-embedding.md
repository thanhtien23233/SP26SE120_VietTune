# Migration Guide: OpenAI Embedding → Gemini Embedding

## Mục tiêu

Chuyển `IOpenAIEmbeddingService` từ OpenAI sang **Google Gemini Embedding API** (miễn phí, không cần thẻ tín dụng). Giữ nguyên interface `IOpenAIEmbeddingService` để không ảnh hưởng đến các service phụ thuộc (`VectorEmbeddingService`, `SemanticSearchService`).

---

## 1. Tổng quan thay đổi

### So sánh OpenAI vs Gemini Embedding

| | OpenAI text-embedding-3-small | Gemini gemini-embedding-001 |
|---|---|---|
| **Giá** | $0.02/1M tokens | **Miễn phí** (free tier) |
| **Dimensions** | 1536 | 3072 (mặc định), hỗ trợ 768/1536 custom |
| **Max input tokens** | 8191 | 8192 |
| **Free tier** | Không có | 10M tokens/phút |
| **API Key** | platform.openai.com | aistudio.google.com |
| **Hỗ trợ task_type** | Không | Có (RETRIEVAL_DOCUMENT, RETRIEVAL_QUERY...) |

### Chiến lược migration

- **Rename** `OpenAIOptions` → `EmbeddingOptions` (hoặc giữ tên cũ, đổi nội dung)
- **Tạo mới** `GeminiEmbeddingService` implement `IOpenAIEmbeddingService`
- **Swap DI** trong `Program.cs`
- **Xóa toàn bộ embedding cũ** và resync (vì dimensions khác nhau)

---

## 2. Lấy Gemini API Key (miễn phí)

1. Truy cập https://aistudio.google.com/apikey
2. Đăng nhập Google account
3. Click "Create API Key"
4. Copy key (dạng `AIza...`)
5. Không cần thẻ tín dụng, không cần billing

---

## 3. Cập nhật cấu hình

### 3.1. appsettings.json

**Trước (OpenAI):**
```json
{
  "OpenAI": {
    "ApiKey": "sk-...",
    "EmbeddingModel": "text-embedding-3-small",
    "EmbeddingDimensions": 1536,
    "MaxTokensPerRequest": 8191
  }
}
```

**Sau (Gemini):**
```json
{
  "Gemini": {
    "ApiKey": "AIza...",
    "EmbeddingModel": "gemini-embedding-001",
    "EmbeddingDimensions": 768,
    "MaxTokensPerRequest": 8192
  }
}
```

> **Lưu ý về dimensions:** Gemini mặc định output 3072 dimensions. Dùng `768` hoặc `1536` để giảm dung lượng storage và tăng tốc tính cosine similarity. Chất lượng search với 768 dimensions vẫn rất tốt cho project này.

### 3.2. Options class

**Tạo file mới `GeminiOptions.cs`** (hoặc đổi tên `OpenAIOptions.cs`):

```csharp
public class GeminiOptions
{
    public const string SectionName = "Gemini";
    public string ApiKey { get; set; } = string.Empty;
    public string EmbeddingModel { get; set; } = "gemini-embedding-001";
    public int EmbeddingDimensions { get; set; } = 768;
    public int MaxTokensPerRequest { get; set; } = 8192;
}
```

### 3.3. Đăng ký trong Program.cs

**Xóa:**
```csharp
builder.Services.Configure<OpenAIOptions>(
    builder.Configuration.GetSection(OpenAIOptions.SectionName));
```

**Thay bằng:**
```csharp
builder.Services.Configure<GeminiOptions>(
    builder.Configuration.GetSection(GeminiOptions.SectionName));
```

---

## 4. Tạo GeminiEmbeddingService

### 4.1. Gemini REST API format

**Endpoint:**
```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent
```

**Headers:**
```
Content-Type: application/json
x-goog-api-key: {API_KEY}
```

**Request body (single text):**
```json
{
  "model": "models/gemini-embedding-001",
  "content": {
    "parts": [
      { "text": "Your text here" }
    ]
  },
  "taskType": "RETRIEVAL_DOCUMENT",
  "outputDimensionality": 768
}
```

**Response:**
```json
{
  "embedding": {
    "values": [0.012, -0.034, 0.056, ...]
  }
}
```

**Batch endpoint:**
```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:batchEmbedContents
```

**Batch request body:**
```json
{
  "requests": [
    {
      "model": "models/gemini-embedding-001",
      "content": { "parts": [{ "text": "Text 1" }] },
      "taskType": "RETRIEVAL_DOCUMENT",
      "outputDimensionality": 768
    },
    {
      "model": "models/gemini-embedding-001",
      "content": { "parts": [{ "text": "Text 2" }] },
      "taskType": "RETRIEVAL_DOCUMENT",
      "outputDimensionality": 768
    }
  ]
}
```

**Batch response:**
```json
{
  "embeddings": [
    { "values": [0.012, -0.034, ...] },
    { "values": [0.045, -0.078, ...] }
  ]
}
```

### 4.2. TaskType values

Gemini hỗ trợ các task type giúp tối ưu embedding cho từng mục đích:

| TaskType | Khi nào dùng |
|---|---|
| `RETRIEVAL_DOCUMENT` | Khi embedding nội dung Recording (lưu vào DB) |
| `RETRIEVAL_QUERY` | Khi embedding câu query tìm kiếm của user |
| `SEMANTIC_SIMILARITY` | So sánh độ tương đồng giữa 2 text |
| `CLASSIFICATION` | Phân loại văn bản |
| `CLUSTERING` | Nhóm các văn bản tương tự |

**Quan trọng:** Dùng `RETRIEVAL_DOCUMENT` khi sinh embedding cho Recording và `RETRIEVAL_QUERY` khi embedding search query. Điều này giúp kết quả search chính xác hơn.

### 4.3. Implementation

**File:** `Services/GeminiEmbeddingService.cs`

```csharp
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

public class GeminiEmbeddingService : IOpenAIEmbeddingService
{
    private readonly HttpClient _httpClient;
    private readonly GeminiOptions _options;
    private readonly ILogger<GeminiEmbeddingService> _logger;

    private const string BaseUrl = "https://generativelanguage.googleapis.com/v1beta";

    public GeminiEmbeddingService(
        HttpClient httpClient,
        IOptions<GeminiOptions> options,
        ILogger<GeminiEmbeddingService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;

        _httpClient.BaseAddress = new Uri(BaseUrl + "/");
        _httpClient.DefaultRequestHeaders.Add("x-goog-api-key", _options.ApiKey);
    }

    /// <summary>
    /// Sinh embedding cho 1 text.
    /// Dùng RETRIEVAL_DOCUMENT mặc định (phù hợp cho lưu Recording).
    /// </summary>
    public async Task<float[]> GetEmbeddingAsync(
        string text,
        CancellationToken ct = default)
    {
        return await GetEmbeddingAsync(text, "RETRIEVAL_DOCUMENT", ct);
    }

    /// <summary>
    /// Sinh embedding với task type cụ thể.
    /// Dùng "RETRIEVAL_QUERY" khi embedding câu search query.
    /// </summary>
    public async Task<float[]> GetEmbeddingAsync(
        string text,
        string taskType,
        CancellationToken ct = default)
    {
        var modelId = _options.EmbeddingModel;
        var url = $"models/{modelId}:embedContent";

        var requestBody = new GeminiEmbedRequest
        {
            Model = $"models/{modelId}",
            Content = new GeminiContent
            {
                Parts = new List<GeminiPart>
                {
                    new() { Text = text }
                }
            },
            TaskType = taskType,
            OutputDimensionality = _options.EmbeddingDimensions
        };

        try
        {
            var response = await _httpClient.PostAsJsonAsync(url, requestBody, ct);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError(
                    "Gemini API error: {StatusCode} - {Body}",
                    response.StatusCode, errorBody);
                throw new HttpRequestException(
                    $"Gemini API returned {response.StatusCode}: {errorBody}");
            }

            var result = await response.Content
                .ReadFromJsonAsync<GeminiEmbedResponse>(cancellationToken: ct);

            if (result?.Embedding?.Values == null || result.Embedding.Values.Length == 0)
                throw new InvalidOperationException("Gemini returned empty embedding.");

            return result.Embedding.Values;
        }
        catch (Exception ex) when (ex is not HttpRequestException
                                   and not InvalidOperationException)
        {
            _logger.LogError(ex, "Failed to call Gemini Embedding API");
            throw;
        }
    }

    /// <summary>
    /// Sinh embedding cho nhiều text cùng lúc (batch).
    /// Gemini batch endpoint chấp nhận tối đa 100 requests/call.
    /// </summary>
    public async Task<List<float[]>> GetEmbeddingBatchAsync(
        List<string> texts,
        CancellationToken ct = default)
    {
        var modelId = _options.EmbeddingModel;
        var url = $"models/{modelId}:batchEmbedContents";

        var requests = texts.Select(text => new GeminiBatchEmbedRequestItem
        {
            Model = $"models/{modelId}",
            Content = new GeminiContent
            {
                Parts = new List<GeminiPart>
                {
                    new() { Text = text }
                }
            },
            TaskType = "RETRIEVAL_DOCUMENT",
            OutputDimensionality = _options.EmbeddingDimensions
        }).ToList();

        var requestBody = new GeminiBatchEmbedRequest
        {
            Requests = requests
        };

        try
        {
            var response = await _httpClient.PostAsJsonAsync(url, requestBody, ct);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError(
                    "Gemini batch API error: {StatusCode} - {Body}",
                    response.StatusCode, errorBody);
                throw new HttpRequestException(
                    $"Gemini API returned {response.StatusCode}: {errorBody}");
            }

            var result = await response.Content
                .ReadFromJsonAsync<GeminiBatchEmbedResponse>(cancellationToken: ct);

            if (result?.Embeddings == null)
                throw new InvalidOperationException(
                    "Gemini returned null batch embeddings.");

            return result.Embeddings
                .Select(e => e.Values)
                .ToList();
        }
        catch (Exception ex) when (ex is not HttpRequestException
                                   and not InvalidOperationException)
        {
            _logger.LogError(ex, "Failed to call Gemini batch Embedding API");
            throw;
        }
    }
}
```

### 4.4. DTO classes cho Gemini API

**File:** `Services/DTOs/GeminiEmbeddingDTOs.cs`

```csharp
using System.Text.Json.Serialization;

// ===== Single Embed Request =====

public class GeminiEmbedRequest
{
    [JsonPropertyName("model")]
    public string Model { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public GeminiContent Content { get; set; } = new();

    [JsonPropertyName("taskType")]
    public string TaskType { get; set; } = "RETRIEVAL_DOCUMENT";

    [JsonPropertyName("outputDimensionality")]
    public int? OutputDimensionality { get; set; }
}

public class GeminiContent
{
    [JsonPropertyName("parts")]
    public List<GeminiPart> Parts { get; set; } = new();
}

public class GeminiPart
{
    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;
}

// ===== Single Embed Response =====

public class GeminiEmbedResponse
{
    [JsonPropertyName("embedding")]
    public GeminiEmbeddingValues? Embedding { get; set; }
}

public class GeminiEmbeddingValues
{
    [JsonPropertyName("values")]
    public float[] Values { get; set; } = Array.Empty<float>();
}

// ===== Batch Embed Request =====

public class GeminiBatchEmbedRequest
{
    [JsonPropertyName("requests")]
    public List<GeminiBatchEmbedRequestItem> Requests { get; set; } = new();
}

public class GeminiBatchEmbedRequestItem
{
    [JsonPropertyName("model")]
    public string Model { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public GeminiContent Content { get; set; } = new();

    [JsonPropertyName("taskType")]
    public string TaskType { get; set; } = "RETRIEVAL_DOCUMENT";

    [JsonPropertyName("outputDimensionality")]
    public int? OutputDimensionality { get; set; }
}

// ===== Batch Embed Response =====

public class GeminiBatchEmbedResponse
{
    [JsonPropertyName("embeddings")]
    public List<GeminiEmbeddingValues> Embeddings { get; set; } = new();
}
```

---

## 5. Cập nhật SemanticSearchService

Gemini hỗ trợ `taskType` để phân biệt document vs query embedding. Cần cập nhật `SemanticSearchService` để dùng `RETRIEVAL_QUERY` khi embedding câu search.

### 5.1. Cập nhật interface (tùy chọn — nếu muốn hỗ trợ taskType)

**Thêm overload method vào `IOpenAIEmbeddingService`:**

```csharp
public interface IOpenAIEmbeddingService
{
    Task<float[]> GetEmbeddingAsync(string text, CancellationToken ct = default);

    // THÊM MỚI: overload với taskType
    Task<float[]> GetEmbeddingAsync(string text, string taskType,
        CancellationToken ct = default);

    Task<List<float[]>> GetEmbeddingBatchAsync(List<string> texts,
        CancellationToken ct = default);
}
```

### 5.2. Cập nhật SemanticSearchService.SearchAsync

Tìm dòng gọi `GetEmbeddingAsync` trong `SemanticSearchService`:

**Trước:**
```csharp
var queryVector = await _embeddingService.GetEmbeddingAsync(query, ct);
```

**Sau:**
```csharp
var queryVector = await _embeddingService.GetEmbeddingAsync(
    query, "RETRIEVAL_QUERY", ct);
```

---

## 6. Cập nhật DI Registration trong Program.cs

### 6.1. Xóa đăng ký OpenAI

**Xóa toàn bộ:**
```csharp
builder.Services.Configure<OpenAIOptions>(
    builder.Configuration.GetSection(OpenAIOptions.SectionName));
builder.Services.AddHttpClient<IOpenAIEmbeddingService, OpenAIEmbeddingService>();
```

### 6.2. Thêm đăng ký Gemini

**Thay bằng:**
```csharp
builder.Services.Configure<GeminiOptions>(
    builder.Configuration.GetSection(GeminiOptions.SectionName));
builder.Services.AddHttpClient<IOpenAIEmbeddingService, GeminiEmbeddingService>();
```

> **Lưu ý:** Interface vẫn là `IOpenAIEmbeddingService`, chỉ implementation đổi sang `GeminiEmbeddingService`. Tất cả service khác (`VectorEmbeddingService`, `SemanticSearchService`) không cần thay đổi gì.

---

## 7. Xóa embedding cũ và resync

**QUAN TRỌNG:** Vì dimensions thay đổi (1536 → 768), toàn bộ embedding cũ phải được xóa và sinh lại. Không thể mix embedding từ 2 model khác nhau.

### 7.1. Xóa bằng SQL

```sql
-- Xóa toàn bộ embedding cũ
DELETE FROM public."VectorEmbeddings";

-- Verify
SELECT COUNT(*) FROM public."VectorEmbeddings"; -- should be 0
```

### 7.2. Resync qua API

```bash
# Kiểm tra status
curl -X GET http://localhost:5000/api/vector-sync/status \
  -H "Authorization: Bearer {admin_token}"

# Sync toàn bộ
curl -X POST http://localhost:5000/api/vector-sync/all \
  -H "Authorization: Bearer {admin_token}"
```

### 7.3. Hoặc resync endpoint (nếu đã implement)

```bash
curl -X POST http://localhost:5000/api/vector-sync/resync \
  -H "Authorization: Bearer {admin_token}"
```

---

## 8. Cập nhật VectorEmbeddingService (nếu cần)

### 8.1. ModelVersion trong database

Khi lưu embedding, `ModelVersion` sẽ tự động lấy từ `GeminiOptions.EmbeddingModel`. Kiểm tra trong `VectorEmbeddingService.GenerateAndSaveAsync`:

**Trước:**
```csharp
ModelVersion = _options.EmbeddingModel,  // "text-embedding-3-small"
```

**Sau (tự động đúng nếu inject GeminiOptions):**
```csharp
ModelVersion = _options.EmbeddingModel,  // "gemini-embedding-001"
```

### 8.2. Kiểm tra inject Options

Nếu `VectorEmbeddingService` đang inject `IOptions<OpenAIOptions>`, cần đổi:

**Trước:**
```csharp
public VectorEmbeddingService(
    ...
    IOptions<OpenAIOptions> options,
    ...)
{
    _options = options.Value;
}
```

**Sau:**
```csharp
public VectorEmbeddingService(
    ...
    IOptions<GeminiOptions> options,
    ...)
{
    _options = options.Value;
}
```

---

## 9. File cần xóa/giữ

| File | Hành động |
|---|---|
| `OpenAIOptions.cs` | **Xóa** (hoặc giữ nếu dùng OpenAI cho tính năng khác như GPT-4 Q&A) |
| `OpenAIEmbeddingService.cs` | **Xóa** (hoặc giữ backup) |
| `OpenAIEmbeddingResponse` DTOs | **Xóa** |
| `GeminiOptions.cs` | **Tạo mới** |
| `GeminiEmbeddingService.cs` | **Tạo mới** |
| `GeminiEmbeddingDTOs.cs` | **Tạo mới** |
| `IOpenAIEmbeddingService.cs` | **Giữ nguyên** (đổi tên thành `IEmbeddingService` nếu muốn clean hơn) |
| `VectorEmbeddingService.cs` | **Sửa** inject Options |
| `SemanticSearchService.cs` | **Sửa** thêm taskType cho query |
| `Program.cs` | **Sửa** DI registration |
| `appsettings.json` | **Sửa** thay OpenAI section bằng Gemini |

---

## 10. Thứ tự thực hiện

| Bước | Task | Ghi chú |
|------|------|---------|
| 1 | Lấy Gemini API Key từ AI Studio | https://aistudio.google.com/apikey |
| 2 | Tạo `GeminiOptions.cs` | Copy từ OpenAIOptions, đổi section name |
| 3 | Tạo `GeminiEmbeddingDTOs.cs` | Request/Response DTOs cho Gemini API |
| 4 | Tạo `GeminiEmbeddingService.cs` | Implement `IOpenAIEmbeddingService` |
| 5 | Cập nhật `appsettings.json` | Thay OpenAI section bằng Gemini |
| 6 | Cập nhật `Program.cs` DI | Swap implementation |
| 7 | Cập nhật `VectorEmbeddingService.cs` | Đổi inject Options |
| 8 | Cập nhật `SemanticSearchService.cs` | Dùng RETRIEVAL_QUERY cho search |
| 9 | Xóa toàn bộ VectorEmbeddings trong DB | DELETE FROM "VectorEmbeddings" |
| 10 | Build + test | Gọi API sync 1 recording trước |
| 11 | Resync toàn bộ | Gọi POST /api/vector-sync/all |
| 12 | Xóa file OpenAI cũ (tùy chọn) | Cleanup code |

---

## 11. Test nhanh sau migration

### 11.1. Test embedding 1 recording

```bash
curl -X POST http://localhost:5000/api/vector-sync/{recordingId} \
  -H "Authorization: Bearer {admin_token}"
```

**Expected response:**
```json
{
  "recordingId": "...",
  "modelVersion": "gemini-embedding-001",
  "createdAt": "2026-04-02T..."
}
```

### 11.2. Test semantic search

```bash
curl "http://localhost:5000/api/search/semantic?q=bài%20hát%20mùa%20gặt%20đàn%20bầu"
```

### 11.3. Kiểm tra embedding dimensions trong DB

```sql
SELECT
    "Id",
    "ModelVersion",
    LENGTH("EmbeddingJson") as json_length,
    "CreatedAt"
FROM public."VectorEmbeddings"
LIMIT 5;
```

---

## 12. Xử lý lỗi thường gặp

### API Key không hợp lệ
```json
{
  "error": {
    "code": 400,
    "message": "API key not valid. Please pass a valid API key."
  }
}
```
→ Kiểm tra lại API key trong `appsettings.json`. Đảm bảo không có khoảng trắng thừa.

### Rate limit (429)
```json
{
  "error": {
    "code": 429,
    "message": "Resource has been exhausted"
  }
}
```
→ Free tier embedding có limit ~10M tokens/phút. Nếu bulk sync nhiều recording, tăng delay giữa các request từ 200ms lên 500ms-1000ms.

### Model không tồn tại
```json
{
  "error": {
    "code": 404,
    "message": "models/xxx is not found"
  }
}
```
→ Kiểm tra model name: phải là `gemini-embedding-001` (text-only, GA) hoặc `gemini-embedding-2-preview` (multimodal, preview).

### Empty embedding response
→ Input text có thể rỗng hoặc quá ngắn. Kiểm tra `EmbeddingTextBuilder.BuildSearchableText()` trả về text có nội dung.

---

## 13. Lưu ý quan trọng

### Dimensions phải thống nhất
Tất cả embedding trong DB phải cùng dimensions. Nếu đổi từ 768 sang 1536 sau này, phải resync toàn bộ.

### Gemini Embedding 2 Preview (tùy chọn nâng cấp sau)
Nếu muốn dùng model mới nhất: đổi `EmbeddingModel` thành `gemini-embedding-2-preview`. Model này hỗ trợ cả multimodal (ảnh, audio) — hữu ích nếu sau này muốn embedding cả ảnh nhạc cụ hoặc audio recording. Tuy nhiên hiện đang ở preview, nên dùng `gemini-embedding-001` (GA) cho ổn định.

### Normalization
Gemini embedding ở 3072 dimensions đã được pre-normalized. Khi dùng custom dimensions (768, 1536), cần normalize vector trước khi tính cosine similarity. Tuy nhiên, hàm `CosineSimilarity` hiện tại trong `SemanticSearchService` đã tự normalize (chia cho magnitude), nên **không cần thay đổi gì thêm**.

### Giữ OpenAI cho tính năng khác
Nếu project vẫn dùng OpenAI cho GPT-4 (Q&A chatbot, RAG), chỉ xóa phần embedding, giữ lại `OpenAIOptions` cho Q&A service.
