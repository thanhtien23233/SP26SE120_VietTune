using System;
using System.Collections.Generic;
using VietTuneArchive.Domain.Entities.Enum;

namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class RecordingDto
    {
        public string Title { get; set; }
        public string? Description { get; set; }
        public string AudioFileUrl { get; set; }
        public string? VideoFileUrl { get; set; }
        public string? AudioFormat { get; set; }
        public int? DurationSeconds { get; set; }
        public long? FileSizeBytes { get; set; }
        public Guid UploadedById { get; set; }
        public Guid? CommuneId { get; set; }
        public Guid? EthnicGroupId { get; set; }
        public Guid? CeremonyId { get; set; }
        public Guid? VocalStyleId { get; set; }
        public Guid? MusicalScaleId { get; set; }
        public string? PerformanceContext { get; set; }
        public string? LyricsOriginal { get; set; }
        public string? LyricsVietnamese { get; set; }
        public string? PerformerName { get; set; }
        public int? PerformerAge { get; set; }
        public DateTime? RecordingDate { get; set; }
        public decimal? GpsLatitude { get; set; }
        public decimal? GpsLongitude { get; set; }
        public decimal? Tempo { get; set; }
        public string? KeySignature { get; set; }
        public SubmissionStatus Status { get; set; }
        public List<Guid> InstrumentIds { get; set; } = new List<Guid>();
    }
    public class GetRecordingDto
    {
        public string Title { get; set; }
        public string? Description { get; set; }
        public string AudioFileUrl { get; set; }
        public string? VideoFileUrl { get; set; }
        public string? AudioFormat { get; set; }
        public int? DurationSeconds { get; set; }
        public long? FileSizeBytes { get; set; }
        public Guid UploadedById { get; set; }
        public Guid? CommuneId { get; set; }
        public Guid? EthnicGroupId { get; set; }
        public Guid? CeremonyId { get; set; }
        public Guid? VocalStyleId { get; set; }
        public Guid? MusicalScaleId { get; set; }
        public string? PerformanceContext { get; set; }
        public string? LyricsOriginal { get; set; }
        public string? LyricsVietnamese { get; set; }
        public string? PerformerName { get; set; }
        public int? PerformerAge { get; set; }
        public DateTime? RecordingDate { get; set; }
        public decimal? GpsLatitude { get; set; }
        public decimal? GpsLongitude { get; set; }
        public decimal? Tempo { get; set; }
        public string? KeySignature { get; set; }
        public SubmissionStatus Status { get; set; }
        public List<GetInstrumentDto> Instruments { get; set; } = new List<GetInstrumentDto>();
    }
}
