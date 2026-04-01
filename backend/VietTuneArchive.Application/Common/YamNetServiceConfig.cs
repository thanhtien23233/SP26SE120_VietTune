namespace VietTuneArchive.Application.Common
{
    public class YamNetServiceConfig
    {
        public string BaseUrl { get; set; } = "http://localhost:8000";
        public int TimeoutSeconds { get; set; } = 120;
    }
}
