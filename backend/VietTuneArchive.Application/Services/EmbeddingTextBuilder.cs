using VietTuneArchive.Application.IServices;
using VietTuneArchive.Domain.Entities;

namespace VietTuneArchive.Application.Services
{
    public class EmbeddingTextBuilder : IEmbeddingTextBuilder
    {
        public string BuildSearchableText(Recording recording)
        {
            var parts = new List<string>();

            // Tiêu đề và mô tả
            if (!string.IsNullOrWhiteSpace(recording.Title))
                parts.Add($"Title: {recording.Title}");

            if (!string.IsNullOrWhiteSpace(recording.Description))
                parts.Add($"Description: {recording.Description}");

            // Dân tộc
            if (recording.EthnicGroup != null)
                parts.Add($"Ethnic group: {recording.EthnicGroup.Name}");

            // Nghi lễ / bối cảnh
            if (recording.Ceremony != null)
                parts.Add($"Ceremony: {recording.Ceremony.Name}");

            if (!string.IsNullOrWhiteSpace(recording.PerformanceContext))
                parts.Add($"Performance context: {recording.PerformanceContext}");

            // Nhạc cụ
            var instruments = recording.RecordingInstruments?
                .Select(ri => ri.Instrument?.Name)
                .Where(n => !string.IsNullOrWhiteSpace(n))
                .ToList();
            if (instruments?.Any() == true)
                parts.Add($"Instruments: {string.Join(", ", instruments)}");

            // Phong cách hát
            if (recording.VocalStyle != null)
                parts.Add($"Vocal style: {recording.VocalStyle.Name}");

            // Thang âm
            if (recording.MusicalScale != null)
                parts.Add($"Musical scale: {recording.MusicalScale.Name}");

            // Địa lý
            var location = BuildLocationString(recording);
            if (!string.IsNullOrWhiteSpace(location))
                parts.Add($"Location: {location}");

            // Người biểu diễn
            if (!string.IsNullOrWhiteSpace(recording.PerformerName))
                parts.Add($"Performer: {recording.PerformerName}");

            // Lời bài hát (tiếng Việt — giới hạn 500 ký tự để không vượt token limit)
            if (!string.IsNullOrWhiteSpace(recording.LyricsVietnamese))
            {
                var lyrics = recording.LyricsVietnamese.Length > 500
                    ? recording.LyricsVietnamese[..500]
                    : recording.LyricsVietnamese;
                parts.Add($"Lyrics: {lyrics}");
            }

            // Tags
            var tags = recording.RecordingTags?
                .Select(rt => rt.Tag?.Name)
                .Where(n => !string.IsNullOrWhiteSpace(n))
                .ToList();
            if (tags?.Any() == true)
                parts.Add($"Tags: {string.Join(", ", tags)}");

            return string.Join(". ", parts);
        }

        private string BuildLocationString(Recording recording)
        {
            var locationParts = new List<string>();

            if (recording.Commune != null)
            {
                locationParts.Add(recording.Commune.Name);

                if (recording.Commune.District != null)
                {
                    locationParts.Add(recording.Commune.District.Name);

                    if (recording.Commune.District.Province != null)
                        locationParts.Add(recording.Commune.District.Province.Name);
                }
            }

            return string.Join(", ", locationParts);
        }
    }
}
