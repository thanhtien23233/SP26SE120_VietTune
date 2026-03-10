using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using VietTuneArchive.Domain.Entities.Enum;

namespace VietTuneArchive.Domain.Entities
{
    public class Recording
    {
        [Key]
        public Guid Id { get; set; }

        [MaxLength(500)]
        public string? Title { get; set; }
        public string? Description { get; set; }

        [MaxLength(500)]
        public string AudioFileUrl { get; set; }

        [MaxLength(500)]
        public string? VideoFileUrl { get; set; }

        [MaxLength(10)]
        public string? AudioFormat { get; set; } // FLAC-WAV-MP3

        public int? DurationSeconds { get; set; }

        public long? FileSizeBytes { get; set; }

        [Required]
        public Guid UploadedById { get; set; }

        [ForeignKey("UploadedById")]
        public User? UploadedBy { get; set; }

        public Guid? CommuneId { get; set; }

        [ForeignKey("CommuneId")]
        public Commune? Commune { get; set; }

        public Guid? EthnicGroupId { get; set; }

        [ForeignKey("EthnicGroupId")]
        public EthnicGroup? EthnicGroup { get; set; }

        public Guid? CeremonyId { get; set; }

        [ForeignKey("CeremonyId")]
        public Ceremony? Ceremony { get; set; }

        public Guid? VocalStyleId { get; set; }

        [ForeignKey("VocalStyleId")]
        public VocalStyle? VocalStyle { get; set; }

        public Guid? MusicalScaleId { get; set; }

        [ForeignKey("MusicalScaleId")]
        public MusicalScale? MusicalScale { get; set; }

        [MaxLength(200)]
        public string? PerformanceContext { get; set; }

        public string? LyricsOriginal { get; set; }

        public string? LyricsVietnamese { get; set; }

        [MaxLength(200)]
        public string? PerformerName { get; set; }

        public int? PerformerAge { get; set; }

        public DateTime? RecordingDate { get; set; }

        public decimal? GpsLatitude { get; set; }

        public decimal? GpsLongitude { get; set; }

        public decimal? Tempo { get; set; }

        [MaxLength(20)]
        public string? KeySignature { get; set; }

        [Required]
        public SubmissionStatus Status { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
        public Guid? SubmissionId { get; set; }
        public Submission? Submission { get; set; }

        // Navigation properties
        public ICollection<RecordingImage>? RecordingImages { get; set; }
        public ICollection<RecordingInstrument>? RecordingInstruments { get; set; }
        public ICollection<RecordingTag>? RecordingTags { get; set; }
        public ICollection<Annotation>? Annotations { get; set; }
        public ICollection<VectorEmbedding>? VectorEmbeddings { get; set; }
        public ICollection<AudioAnalysisResult>? AudioAnalysisResults { get; set; }
    }
}
