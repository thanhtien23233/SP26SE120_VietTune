namespace VietTuneArchive.Application.Mapper.DTOs.Response
{
    public class AuthResponse : BaseResponse
    {
        public string AccessToken { get; set; } = default!;
        public string RefreshToken { get; set; } = default!;
    }

    public class TokenResponse
    {
        public string AccessToken { get; set; } = default!;
        public string RefreshToken { get; set; } = default!;
    }
}
