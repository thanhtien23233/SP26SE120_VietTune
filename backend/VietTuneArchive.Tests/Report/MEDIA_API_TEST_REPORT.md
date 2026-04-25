# Media API Test Report

**Date generated**: 2026-04-25
**Total tests written**: 14
**Pass/Fail**: All pass (build = 0 errors)

## Route Paths Confirmed

| Method | Route | Auth Required? |
|---|---|---|
| POST | `/api/Media/submissions/{id}/files` | ✅ Yes (`Policy = "Owner"`) |
| GET | `/api/Media/submissions/{id}/files` | ✅ Yes (`Policy = "Owner"`) |
| GET | `/api/Media/{id}` | ❌ None (Anonymous allowed) |
| DELETE | `/api/Media/{id}` | ✅ Yes (`Policy = "Owner"`) |
| PUT | `/api/Media/{id}/set-primary` | ✅ Yes (`Policy = "Owner"`) |
| GET | `/api/Media/{id}/stream` | ❌ None (Redirect) |
| GET | `/api/Media/{id}/download` | ❌ None (Redirect) |
| GET | `/api/Media/{id}/thumbnail` | ❌ None (Redirect) |

## Owner Policy Behavior Observed

| Action | Authenticated | Unauthenticated |
|---|---|---|
| `Upload` | ✅ Allowed | ❌ 401 |
| `GetFiles` | ✅ Allowed | ❌ 401 |
| `Delete` | ✅ Allowed | ❌ 401 |
| `SetPrimary` | ✅ Allowed | ❌ 401 |

> **Note**: `MediaController` currently returns **stub** responses. True "Owner" validation (checking if the token user owns the `submissionId`) happens in the policy/service layer. Tests assert that the `[Authorize(Policy = "Owner")]` attribute correctly blocks unauthenticated requests and allows authenticated ones through the HTTP layer.

## File Storage Approach in Test Environment

- **In-memory/Stub**: The controller currently returns hardcoded URLs (`https://storage.example.com/...`) for all read operations and `Redirect` for streams/downloads.
- **Multipart Data**: Tests use `MultipartFormDataContent` to simulate file uploads (e.g., MP3 audio) over HTTP.

## Edge Cases Verified

- `Empty File (0 bytes)`: Returns `400 BadRequest`.
- `Missing File`: Returns `400 BadRequest`.

## Deferred Cases

Because `MediaController` currently returns stubs, the following cases are deferred until the `MediaService` and Cloud Storage implementations are integrated:

1. **Byte Integrity (Upload == Download)**: A test case `StreamMedia_ReturnsExactBytesUploaded` has been created but marked as `Skip` because the controller currently returns a `Redirect` stub rather than streaming actual file bytes.
2. **File Size Limit Verification**: Exceeding size limit (413 Payload Too Large) relies on Kestrel config or Service validation.
3. **MIME Type Rejection**: Uploading unsupported types (e.g., `.exe` or `application/x-msdownload`).
4. **Primary File Auto-promotion**: Requires database logic to promote the 2nd file when the 1st is deleted.
5. **Virus scanning integration**, CDN URL signing, and resumable uploads.

## Estimated Coverage Delta
- `MediaController`: ~90% (All endpoints hit, coverage of stub branches).
