using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace VietTuneArchive.Application.Common.Email
{
    public class GmailApiSettings
    {
        public string ClientId { get; set; }
        public string ClientSecret { get; set; }
        public string RefreshToken { get; set; }
        public string SenderEmail { get; set; }
    }

    public class EmailService
    {
        private readonly GmailApiSettings _settings;
        private readonly HttpClient _httpClient;

        public EmailService(IOptions<GmailApiSettings> options, HttpClient httpClient)
        {
            _settings = options.Value;
            _httpClient = httpClient;
        }

        public async Task SendConfirmationEmail(string email, string token)
        {
            var htmlContent = $@"
            <div style='background-color: #f4f7f6; padding: 50px 0; font-family: Arial, sans-serif;'>
                <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);'>
                    <div style='background-color: #0066cc; padding: 30px; text-align: center;'>
                        <h1 style='color: #ffffff; margin: 0; font-size: 24px;'>VIETTUNE ARCHIVE</h1>
                    </div>
                    <div style='padding: 40px; color: #333333; line-height: 1.6;'>
                        <h2 style='font-size: 20px;'>Xác minh địa chỉ Email</h2>
                        <p>Cảm ơn bạn đã tham gia cộng đồng VietTune. Mã xác nhận của bạn là:</p>
                        <div style='margin: 30px 0; text-align: center;'>
                            <div style='display: inline-block; background-color: #f0f4f8; padding: 15px 40px; border-radius: 4px; border: 1px dashed #0066cc;'>
                                <span style='font-size: 32px; font-weight: bold; color: #0066cc; letter-spacing: 5px;'>{token}</span>
                            </div>
                        </div>
                        <p style='font-size: 14px; color: #666666;'>Mã hết hạn trong 15 phút.</p>
                    </div>
                </div>
            </div>";

            await SendGmailApi(email, "[VietTuneArchive] Mã xác nhận email của bạn", htmlContent);
        }

        public async Task SendResetPasswordEmailAsync(string email, string fullName, string otp)
        {
            var htmlContent = $@"
            <div style='background-color: #f9fafb; padding: 50px 0; font-family: Arial, sans-serif;'>
                <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;'>
                    <div style='background-color: #1f2937; padding: 25px; text-align: center;'>
                        <span style='color: #ffffff; font-size: 20px; font-weight: bold;'>VIETTUNE ARCHIVE</span>
                    </div>
                    <div style='padding: 40px;'>
                        <h2 style='color: #111827;'>Yêu cầu đặt lại mật khẩu</h2>
                        <p>Xin chào <strong>{fullName}</strong>,</p>
                        <p>Bạn đã yêu cầu reset mật khẩu. Vui lòng sử dụng mã dưới đây:</p>
                        <div style='text-align: center; margin: 30px 0;'>
                            <div style='background-color: #f3f4f6; padding: 20px; border-radius: 8px; display: inline-block;'>
                                <span style='font-size: 36px; font-weight: 800; color: #ef4444; letter-spacing: 8px;'>{otp}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>";

            await SendGmailApi(email, "[VietTuneArchive] Mã reset mật khẩu của bạn", htmlContent);
        }

        private async Task SendGmailApi(string toEmail, string subject, string htmlContent)
        {
            var accessToken = await GetAccessTokenAsync();

            // 1. Mã hóa tiêu đề UTF-8 chuẩn RFC 2047
            var encodedSubject = $"=?utf-8?B?{Convert.ToBase64String(Encoding.UTF8.GetBytes(subject))}?=";

            // 2. Xây dựng gói tin MIME thủ công để ép chuẩn UTF-8
            var sb = new StringBuilder();
            sb.AppendLine($"To: {toEmail}");
            sb.AppendLine($"From: {_settings.SenderEmail}");
            sb.AppendLine($"Subject: {encodedSubject}");
            sb.AppendLine("MIME-Version: 1.0");
            sb.AppendLine("Content-Type: text/html; charset=utf-8");
            sb.AppendLine("Content-Transfer-Encoding: base64");
            sb.AppendLine(""); // Dòng trống ngăn cách Header và Body

            // Mã hóa Body sang Base64
            var base64Body = Convert.ToBase64String(Encoding.UTF8.GetBytes(htmlContent));
            sb.AppendLine(base64Body);

            // 3. Chuyển toàn bộ sang Base64Url (thay thế ký tự đặc biệt)
            var base64Message = Convert.ToBase64String(Encoding.UTF8.GetBytes(sb.ToString()))
                .Replace("+", "-")
                .Replace("/", "_")
                .Replace("=", "");

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await _httpClient.PostAsJsonAsync("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", new { raw = base64Message });

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                throw new Exception($"Gmail API Error: {error}");
            }
        }

        private async Task<string> GetAccessTokenAsync()
        {
            var content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("client_id", _settings.ClientId),
                new KeyValuePair<string, string>("client_secret", _settings.ClientSecret),
                new KeyValuePair<string, string>("refresh_token", _settings.RefreshToken),
                new KeyValuePair<string, string>("grant_type", "refresh_token")
            });

            var response = await _httpClient.PostAsync("https://oauth2.googleapis.com/token", content);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"[GOOGLE API ERROR]: {errorBody}");
                throw new Exception($"Không thể lấy Access Token từ Google. Chi tiết: {errorBody}");
            }
            var data = await response.Content.ReadFromJsonAsync<JsonElement>();
            return data.GetProperty("access_token").GetString();
        }
    }
}