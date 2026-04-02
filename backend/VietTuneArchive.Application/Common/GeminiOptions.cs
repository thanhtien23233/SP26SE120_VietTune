namespace VietTuneArchive.Application.Common
{
    public class GeminiOptions
    {
        public const string SectionName = "Gemini";
        public string ApiKey { get; set; } = string.Empty;
        public string Model { get; set; } = "gemini-flash-lite-latest";
        public string EmbeddingModel { get; set; } = "gemini-embedding-001";
        public int EmbeddingDimensions { get; set; } = 768;
        public int MaxTokensPerRequest { get; set; } = 8192;
    }
}
