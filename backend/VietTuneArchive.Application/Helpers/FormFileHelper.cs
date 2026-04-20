using Microsoft.AspNetCore.Http;

namespace VietTuneArchive.Application.Helpers
{
    public static class FormFileHelper
    {
        public static IFormFile CreateFromBytes(byte[] bytes, string fileName, string contentType)
        {
            var stream = new MemoryStream(bytes);
            return new FormFile(stream, 0, bytes.Length, "file", fileName)
            {
                Headers = new HeaderDictionary(),
                ContentType = contentType
            };
        }
    }
}
