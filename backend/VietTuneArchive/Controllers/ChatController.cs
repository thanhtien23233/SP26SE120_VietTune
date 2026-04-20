using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ChatController : ControllerBase
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly string _model;
        private readonly string _systemInstruction;

        private const string GeminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/{0}:generateContent?key={1}";

        public ChatController(IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            _httpClient = httpClientFactory.CreateClient();
            _apiKey = configuration["Gemini:ApiKey"] ?? throw new ArgumentNullException("Gemini:ApiKey");
            _model = configuration["Gemini:Model"] ?? "gemini-2.0-flash-lite-preview-09-2025";

            // Đọc System Instruction từ file txt
            var rootPath = AppContext.BaseDirectory;
            var promptPath = Path.Combine(rootPath, "Assets", "MusicBotPrompt.txt");

            if (!System.IO.File.Exists(promptPath))
            {
                throw new FileNotFoundException($"Không tìm thấy file prompt tại: {promptPath}");
            }

            _systemInstruction = System.IO.File.ReadAllText(promptPath);
        }

        #region API Models (DTOs)

        public class ChatRequest
        {
            public string Message { get; set; } = string.Empty;
        }

        public class GeminiTextPart
        {
            [JsonPropertyName("text")]
            public string Text { get; set; } = string.Empty;
        }

        public class GeminiSystemInstruction
        {
            [JsonPropertyName("parts")]
            public List<GeminiTextPart> Parts { get; set; } = new();
        }

        public class GeminiContent
        {
            [JsonPropertyName("role")]
            public string Role { get; set; } = "user";

            [JsonPropertyName("parts")]
            public List<GeminiTextPart> Parts { get; set; } = new();
        }

        public class GenerationConfig
        {
            [JsonPropertyName("temperature")]
            public double Temperature { get; set; } = 0.1; // Thấp để bot tuân thủ kỷ luật

            [JsonPropertyName("maxOutputTokens")]
            public int MaxOutputTokens { get; set; } = 250;

            [JsonPropertyName("topP")]
            public double TopP { get; set; } = 0.8;
        }

        public class GeminiRequestBody
        {
            [JsonPropertyName("system_instruction")]
            public GeminiSystemInstruction SystemInstruction { get; set; } = new();

            [JsonPropertyName("contents")]
            public List<GeminiContent> Contents { get; set; } = new();

            [JsonPropertyName("generationConfig")]
            public GenerationConfig GenerationConfig { get; set; } = new();
        }

        #endregion

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] ChatRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Message))
            {
                return BadRequest("Tin nhắn không được để trống.");
            }

            // Xây dựng body theo đúng chuẩn của Gemini API
            var body = new GeminiRequestBody
            {
                // 1. Đưa instruction vào vùng riêng biệt của hệ thống
                SystemInstruction = new GeminiSystemInstruction
                {
                    Parts = new List<GeminiTextPart>
                    {
                        new GeminiTextPart { Text = _systemInstruction }
                    }
                },
                // 2. Chỉ đưa tin nhắn của người dùng vào phần hội thoại
                Contents = new List<GeminiContent>
                {
                    new GeminiContent
                    {
                        Role = "user",
                        Parts = new List<GeminiTextPart>
                        {
                            new GeminiTextPart { Text = request.Message }
                        }
                    }
                },
                GenerationConfig = new GenerationConfig
                {
                    Temperature = 0.1, // Ép bot đi vào khuôn khổ, không sáng tạo ngoài lề
                    MaxOutputTokens = 300
                }
            };

            var jsonOptions = new JsonSerializerOptions
            {
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
            };
            var json = JsonSerializer.Serialize(body, jsonOptions);
            var endpoint = string.Format(GeminiEndpoint, _model, _apiKey);

            try
            {
                var httpRequest = new HttpRequestMessage(HttpMethod.Post, endpoint)
                {
                    Content = new StringContent(json, Encoding.UTF8, "application/json")
                };

                var response = await _httpClient.SendAsync(httpRequest);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    return StatusCode((int)response.StatusCode, $"Gemini API Error: {responseContent}");
                }

                // Trả về JSON thô từ Gemini hoặc bạn có thể bóc tách chỉ lấy phần text
                return Ok(responseContent);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal Server Error: {ex.Message}");
            }
        }
    }
}
