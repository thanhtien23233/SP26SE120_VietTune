namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class VectorEmbeddingDto
    {
        public Guid Id { get; set; }
        public Guid RecordingId { get; set; }
        public string EmbeddingJson { get; set; } = default!;
        public string ModelVersion { get; set; } = default!;
        public DateTime CreatedAt { get; set; }
    }
}
