using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using VietTuneArchive.Application.Mapper.DTOs;
using VietTuneArchive.Tests.Integration.Fixtures;
using Xunit;
using static VietTuneArchive.Application.Mapper.DTOs.CommonDto;
using static VietTuneArchive.Application.Mapper.DTOs.MediaDto;

namespace VietTuneArchive.Tests.Integration.Controllers;

/// <summary>
/// Integration tests for MediaController.
/// IMPORTANT: MediaController currently uses STUB implementations (returns hardcoded data).
/// DB state assertions, streaming byte integrity, and specific file size/MIME rejections
/// are mocked/deferred until the controller connects to MediaService/StorageService.
/// 
/// Policy="Owner" is present on endpoints, so authentication is enforced,
/// but actual ownership validation requires service implementation.
/// </summary>
public class MediaControllerTests : ApiTestBase
{
    public MediaControllerTests(WebAppFactory factory) : base(factory) { }

    private MultipartFormDataContent CreateMockMultipart(string fileName, byte[] bytes, string contentType)
    {
        var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(bytes);
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
        content.Add(fileContent, "file", fileName);
        return content;
    }

    // ─── UploadFileTests ──────────────────────────────────────────────────────

    public class UploadFileTests : MediaControllerTests
    {
        public UploadFileTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task UploadFile_ValidFile_Authenticated_Returns201()
        {
            AuthenticateAs("Contributor");
            var bytes = new byte[] { 0xFF, 0xFB, 0x90, 0x00 }; // Fake MP3
            var content = CreateMockMultipart("test.mp3", bytes, "audio/mpeg");

            var response = await Client.PostAsync("/api/Media/submissions/sub-123/files", content);
            response.StatusCode.Should().Be(HttpStatusCode.Created);

            var body = await response.Content.ReadFromJsonAsync<MediaFileDetailDto>();
            body.Should().NotBeNull();
            body!.FileName.Should().Be("test.mp3");
            body.SubmissionId.Should().Be("sub-123");
        }

        [Fact]
        public async Task UploadFile_MissingFile_Returns400()
        {
            AuthenticateAs("Contributor");
            var content = new MultipartFormDataContent(); // empty

            var response = await Client.PostAsync("/api/Media/submissions/sub-123/files", content);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task UploadFile_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var bytes = new byte[] { 0xFF, 0xFB, 0x90, 0x00 };
            var content = CreateMockMultipart("test.mp3", bytes, "audio/mpeg");

            var response = await Client.PostAsync("/api/Media/submissions/sub-123/files", content);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ─── GetSubmissionFilesTests ──────────────────────────────────────────────

    public class GetSubmissionFilesTests : MediaControllerTests
    {
        public GetSubmissionFilesTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetSubmissionFiles_Authenticated_Returns200WithList()
        {
            AuthenticateAs("Contributor");
            var response = await GetAsync("/api/Media/submissions/sub-123/files");
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var body = await response.Content.ReadFromJsonAsync<List<MediaFileDto>>();
            body.Should().NotBeNull();
            body.Should().NotBeEmpty();
        }

        [Fact]
        public async Task GetSubmissionFiles_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Media/submissions/sub-123/files");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ─── GetMediaFileTests ────────────────────────────────────────────────────

    public class GetMediaFileTests : MediaControllerTests
    {
        public GetMediaFileTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetMediaFile_Anonymous_Returns200WithMetadata()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Media/media-001");
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var body = await response.Content.ReadFromJsonAsync<MediaFileDetailDto>();
            body.Should().NotBeNull();
            body!.Id.Should().Be("media-001");
            body.MimeType.Should().NotBeNullOrEmpty();
        }
    }

    // ─── DeleteMediaFileTests ─────────────────────────────────────────────────

    public class DeleteMediaFileTests : MediaControllerTests
    {
        public DeleteMediaFileTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task DeleteMediaFile_Authenticated_Returns200()
        {
            AuthenticateAs("Contributor");
            var response = await Client.DeleteAsync("/api/Media/media-001");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task DeleteMediaFile_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await Client.DeleteAsync("/api/Media/media-001");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ─── SetPrimaryTests ──────────────────────────────────────────────────────

    public class SetPrimaryTests : MediaControllerTests
    {
        public SetPrimaryTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task SetPrimary_Authenticated_Returns200()
        {
            AuthenticateAs("Contributor");
            var response = await Client.PutAsync("/api/Media/media-001/set-primary", null);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task SetPrimary_Unauthenticated_Returns401()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await Client.PutAsync("/api/Media/media-001/set-primary", null);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ─── StreamTests ──────────────────────────────────────────────────────────

    public class StreamTests : MediaControllerTests
    {
        public StreamTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task StreamMedia_Anonymous_ReturnsRedirect()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Media/media-001/stream");
            
            // Note: Stub redirects to https://storage.example.com/stream/{id}
            response.StatusCode.Should().Be(HttpStatusCode.Redirect);
            response.Headers.Location.Should().NotBeNull();
            response.Headers.Location!.ToString().Should().Contain("stream/media-001");
        }
    }

    // ─── DownloadTests ────────────────────────────────────────────────────────

    public class DownloadTests : MediaControllerTests
    {
        public DownloadTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task DownloadMedia_Anonymous_ReturnsRedirect()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Media/media-001/download");
            
            // Note: Stub redirects to https://storage.example.com/download/{id}
            response.StatusCode.Should().Be(HttpStatusCode.Redirect);
            response.Headers.Location.Should().NotBeNull();
            response.Headers.Location!.ToString().Should().Contain("download/media-001");
        }
    }

    // ─── ThumbnailTests ───────────────────────────────────────────────────────

    public class ThumbnailTests : MediaControllerTests
    {
        public ThumbnailTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task GetThumbnail_Anonymous_ReturnsRedirect()
        {
            Client.DefaultRequestHeaders.Authorization = null;
            var response = await GetAsync("/api/Media/media-001/thumbnail");
            
            // Note: Stub redirects to https://storage.example.com/thumbs/{id}.jpg
            response.StatusCode.Should().Be(HttpStatusCode.Redirect);
            response.Headers.Location.Should().NotBeNull();
            response.Headers.Location!.ToString().Should().Contain("thumbs/media-001.jpg");
        }
    }

    // ─── EdgeCaseTests ────────────────────────────────────────────────────────

    public class EdgeCaseTests : MediaControllerTests
    {
        public EdgeCaseTests(WebAppFactory factory) : base(factory) { }

        [Fact]
        public async Task UploadFile_EmptyFileBytes_Returns400()
        {
            AuthenticateAs("Contributor");
            var bytes = Array.Empty<byte>(); // 0 bytes
            var content = CreateMockMultipart("empty.mp3", bytes, "audio/mpeg");

            var response = await Client.PostAsync("/api/Media/submissions/sub-123/files", content);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }

    // ─── StreamingIntegrityTests ──────────────────────────────────────────────

    public class StreamingIntegrityTests : MediaControllerTests
    {
        public StreamingIntegrityTests(WebAppFactory factory) : base(factory) { }

        [Fact(Skip = "Deferred: Controller currently returns Redirect stub. Real byte streaming not implemented.")]
        public void StreamMedia_ReturnsExactBytesUploaded()
        {
            // Empty placeholder for deferred streaming integrity test
        }
    }
}
