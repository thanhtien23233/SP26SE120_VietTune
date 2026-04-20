using System.Net.Http.Json;
using System.Text.Json;
using VietTuneArchive.Application.IServices;

namespace VietTuneArchive.Application.Services
{
    public class LocalLlmService : ILocalLlmService
    {
        private readonly HttpClient _httpClient;

        public LocalLlmService(IHttpClientFactory httpClientFactory)
        {
            _httpClient = httpClientFactory.CreateClient("AiService");
        }

        public class GenerateResponse
        {
            public string content { get; set; }
        }

        public async Task<string> GenerateAsync(string systemPrompt, string userPrompt, List<ChatMessageDto>? history = null)
        {
            var request = new
            {
                system_prompt = systemPrompt,
                user_prompt = userPrompt,
                history = history?.Select(m => new { role = m.Role == 0 ? "user" : "assistant", content = m.Content })
            };

            var response = await _httpClient.PostAsJsonAsync("/generate", request);
            response.EnsureSuccessStatusCode();

            // Read string first to help debug if needed, or just deserialize directly
            var result = await response.Content.ReadFromJsonAsync<GenerateResponse>(new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            return result?.content ?? string.Empty;
        }
    }
}
