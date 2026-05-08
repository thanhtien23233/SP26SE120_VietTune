using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using VietTuneArchive.Application.IServices;

namespace VietTuneArchive.Application.Services
{
    /// <summary>
    /// Upload file lên Supabase Storage qua REST API — pattern giống
    /// <c>UploadToGeminiAsync</c> trong AudioProcessingService:
    ///   đọc bytes → set Authorization header → PUT lên endpoint storage.
    /// </summary>
    public class SupabaseStorageService : ISupabaseStorageService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<SupabaseStorageService> _logger;
        private readonly HttpClient _httpClient;

        // ---- Config shortcuts ----
        private string SupabaseUrl => _config["Supabase:Url"]
            ?? throw new InvalidOperationException("Supabase:Url is not configured.");
        private string ServiceKey  => _config["Supabase:ServiceRoleKey"]
            ?? throw new InvalidOperationException("Supabase:ServiceRoleKey is not configured.");
        private string ImageBucket => _config["Supabase:ImageBucketName"] ?? "recording-images";

        public SupabaseStorageService(
            IConfiguration config,
            ILogger<SupabaseStorageService> logger,
            IHttpClientFactory httpClientFactory)
        {
            _config     = config;
            _logger     = logger;
            _httpClient = httpClientFactory.CreateClient("SupabaseStorage");
        }

        // =================================================================
        // PUBLIC
        // =================================================================

        /// <inheritdoc/>
        public async Task<string> UploadImageAsync(IFormFile file, string folder = "")
        {
            ValidateImageFile(file);
            return await UploadAsync(file, ImageBucket, folder);
        }

        /// <inheritdoc/>
        public async Task<string> UploadAsync(IFormFile file, string bucketName, string folder = "")
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("File cannot be null or empty.", nameof(file));

            var mimeType   = DetectMimeType(file);
            var extension  = GetExtension(file.FileName, mimeType);
            var uniqueName = $"{Guid.NewGuid()}{extension}";
            var objectPath = string.IsNullOrWhiteSpace(folder)
                ? uniqueName
                : $"{folder.TrimEnd('/')}/{uniqueName}";

            _logger.LogInformation(
                "SupabaseStorage: uploading '{FileName}' → bucket={Bucket} path={Path} mime={Mime}",
                file.FileName, bucketName, objectPath, mimeType);

            var bytes = await ReadToBytesAsync(file);
            await PutObjectAsync(bucketName, objectPath, bytes, mimeType);

            var publicUrl = BuildPublicUrl(bucketName, objectPath);
            _logger.LogInformation("SupabaseStorage: upload OK → {Url}", publicUrl);
            return publicUrl;
        }

        /// <inheritdoc/>
        public async Task DeleteAsync(string bucketName, string filePath)
        {
            // DELETE /storage/v1/object/{bucket}/{path}
            var url = $"{SupabaseUrl}/storage/v1/object/{bucketName}/{filePath}";

            using var request = new HttpRequestMessage(HttpMethod.Delete, url);
            SetAuthHeaders(request);

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                _logger.LogWarning(
                    "SupabaseStorage: delete failed {Status} for {Path} — {Body}",
                    response.StatusCode, filePath, body);
            }
        }

        /// <inheritdoc/>
        public async Task DeleteByUrlAsync(string publicUrl)
        {
            if (string.IsNullOrWhiteSpace(publicUrl))
                return;

            // Chỉ xử lý URL thuộc Supabase project này
            if (!publicUrl.StartsWith(SupabaseUrl, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogDebug(
                    "SupabaseStorage: DeleteByUrlAsync skipped — URL không thuộc Supabase: {Url}", publicUrl);
                return;
            }

            // Parse: {supabaseUrl}/storage/v1/object/public/{bucket}/{objectPath}
            const string marker = "/storage/v1/object/public/";
            var markerIndex = publicUrl.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
            if (markerIndex < 0)
            {
                _logger.LogWarning(
                    "SupabaseStorage: DeleteByUrlAsync — không parse được URL: {Url}", publicUrl);
                return;
            }

            var afterMarker = publicUrl[(markerIndex + marker.Length)..];
            // afterMarker = "{bucket}/{objectPath}"
            var slashIndex = afterMarker.IndexOf('/');
            if (slashIndex < 0)
            {
                _logger.LogWarning(
                    "SupabaseStorage: DeleteByUrlAsync — URL thiếu objectPath: {Url}", publicUrl);
                return;
            }

            var bucket     = afterMarker[..slashIndex];
            var objectPath = afterMarker[(slashIndex + 1)..];

            _logger.LogInformation(
                "SupabaseStorage: DeleteByUrlAsync bucket={Bucket} path={Path}", bucket, objectPath);

            await DeleteAsync(bucket, objectPath);
        }

        // =================================================================
        // PRIVATE — Core HTTP
        // =================================================================

        /// <summary>
        /// PUT object lên Supabase Storage.
        /// Dùng <c>x-upsert: true</c> để overwrite nếu cùng path (tránh conflict UUID).
        /// </summary>
        private async Task PutObjectAsync(string bucket, string objectPath, byte[] bytes, string mimeType)
        {
            // PUT /storage/v1/object/{bucket}/{path}
            var url = $"{SupabaseUrl}/storage/v1/object/{bucket}/{objectPath}";

            using var request = new HttpRequestMessage(HttpMethod.Put, url);
            SetAuthHeaders(request);
            request.Headers.Add("x-upsert", "true");

            var content = new ByteArrayContent(bytes);
            content.Headers.ContentType =
                new System.Net.Http.Headers.MediaTypeHeaderValue(mimeType);
            request.Content = content;

            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                _logger.LogError(
                    "SupabaseStorage: PUT failed {Status} → {Url} — {Body}",
                    response.StatusCode, url, body);
                throw new HttpRequestException(
                    $"Supabase Storage upload failed ({response.StatusCode}): {body}");
            }
        }

        private void SetAuthHeaders(HttpRequestMessage request)
        {
            request.Headers.Add("Authorization", $"Bearer {ServiceKey}");
            request.Headers.Add("apikey", ServiceKey);
        }

        // =================================================================
        // PRIVATE — Helpers
        // =================================================================

        /// <summary>Public URL format của Supabase Storage.</summary>
        private string BuildPublicUrl(string bucket, string objectPath)
            => $"{SupabaseUrl}/storage/v1/object/public/{bucket}/{objectPath}";

        private static async Task<byte[]> ReadToBytesAsync(IFormFile file)
        {
            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            return ms.ToArray();
        }

        private static string DetectMimeType(IFormFile file)
        {
            var ct = file.ContentType?.ToLowerInvariant() ?? string.Empty;

            if (ct.Contains("jpeg") || ct.Contains("jpg")) return "image/jpeg";
            if (ct.Contains("png"))                        return "image/png";
            if (ct.Contains("gif"))                        return "image/gif";
            if (ct.Contains("webp"))                       return "image/webp";
            if (ct.Contains("bmp"))                        return "image/bmp";
            if (ct.Contains("tiff"))                       return "image/tiff";
            if (ct.Contains("svg"))                        return "image/svg+xml";

            // Fallback theo extension
            var ext = Path.GetExtension(file.FileName ?? "").ToLowerInvariant();
            return ext switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png"            => "image/png",
                ".gif"            => "image/gif",
                ".webp"           => "image/webp",
                ".bmp"            => "image/bmp",
                ".tiff" or ".tif" => "image/tiff",
                ".svg"            => "image/svg+xml",
                _                 => "application/octet-stream"
            };
        }

        private static string GetExtension(string? fileName, string mimeType)
        {
            var fromName = Path.GetExtension(fileName ?? "").ToLowerInvariant();
            if (!string.IsNullOrEmpty(fromName)) return fromName;

            return mimeType switch
            {
                "image/jpeg"    => ".jpg",
                "image/png"     => ".png",
                "image/gif"     => ".gif",
                "image/webp"    => ".webp",
                "image/bmp"     => ".bmp",
                "image/tiff"    => ".tiff",
                "image/svg+xml" => ".svg",
                _               => ".bin"
            };
        }

        /// <summary>Chỉ nhận ảnh, kích thước ≤ 10 MB.</summary>
        private static void ValidateImageFile(IFormFile file)
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("Image file cannot be null or empty.");

            const long MaxBytes = 10L * 1024 * 1024; // 10 MB
            if (file.Length > MaxBytes)
                throw new ArgumentException(
                    $"Image file exceeds 10 MB limit (received {file.Length / 1024} KB).");

            var allowedExtensions = new[]
                { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff", ".tif", ".svg" };

            var ext = Path.GetExtension(file.FileName ?? "").ToLowerInvariant();
            var ct  = file.ContentType?.ToLowerInvariant() ?? "";

            bool validExt  = allowedExtensions.Contains(ext);
            bool validMime = ct.StartsWith("image/");

            if (!validExt && !validMime)
                throw new ArgumentException(
                    $"Unsupported file type. Got content-type='{ct}', extension='{ext}'.");
        }
    }
}
