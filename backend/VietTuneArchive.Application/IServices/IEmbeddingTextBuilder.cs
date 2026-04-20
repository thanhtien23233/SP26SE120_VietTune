using VietTuneArchive.Domain.Entities;

namespace VietTuneArchive.Application.IServices
{
    public interface IEmbeddingTextBuilder
    {
        /// <summary>
        /// Ghép metadata của Recording thành một chuỗi text tối ưu cho embedding.
        /// Recording phải được Include đầy đủ các navigation properties.
        /// </summary>
        string BuildSearchableText(Recording recording);
    }
}
