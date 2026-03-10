using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using Service.EmailConfirmation;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
//using System.Net.Mail;
using MailKit.Net.Smtp;
using System.Text;
using System.Threading.Tasks;

namespace VietTuneArchive.Application.Common.Email
{
    public class EmailService
    {
        private readonly SmtpSettings _smtpSettings;

        public EmailService(IOptions<SmtpSettings> smtpSettings)
        {
            _smtpSettings = smtpSettings.Value;
        }

        //        public async Task SendConfirmationEmail(string email, string token)
        //        {
        //            if (string.IsNullOrWhiteSpace(email) || !new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(email))
        //            {
        //                throw new ArgumentException("Địa chỉ email không hợp lệ.", nameof(email));
        //            }
        //            // Tạo nội dung email với mã xác nhận (token) thay vì đường link
        //            var emailSubject = "[VietTuneArchive] Mã xác nhận email của bạn!";
        //            var emailBody = $@"
        //<div style='font-family: Arial, sans-serif; line-height: 1.6;'>
        //    <h2 style='color: #0066cc;'>Xác minh địa chỉ email</h2>
        //    <p>Xin chào!</p>
        //    <p>Dưới đây là mã xác nhận tài khoản của bạn:</p>
        //    <div style='background-color: #f5f5f5; padding: 10px; border-radius: 5px; font-size: 18px; font-weight: bold;'>
        //        {token}
        //    </div>
        //    <p>Vui lòng nhập mã này vào trang xác nhận để hoàn tất quá trình.</p>
        //    <p>Mã có hiệu lực trong 15 phút.</p>
        //    <p>Trân trọng,<br/>Đội ngũ hỗ trợ VietTuneArchive!</p>
        //</div>";

        //            using var smtpClient = new SmtpClient(_smtpSettings.Server)
        //            {
        //                Port = _smtpSettings.Port,
        //                Credentials = new NetworkCredential(_smtpSettings.Username, _smtpSettings.Password),
        //                EnableSsl = true,
        //            };

        //            var mailMessage = new MailMessage
        //            {
        //                From = new MailAddress(_smtpSettings.Username),
        //                Subject = emailSubject,
        //                Body = emailBody,
        //                IsBodyHtml = true,
        //            };

        //            mailMessage.To.Add(email);

        //            try
        //            {
        //                await smtpClient.SendMailAsync(mailMessage);
        //            }
        //            catch (SmtpException ex)
        //            {
        //                Console.WriteLine($"Lỗi khi gửi email: {ex.Message}");
        //            }
        //        }
        public async Task SendConfirmationEmail(string email, string token)
        {
            if (string.IsNullOrWhiteSpace(email) || !new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(email))
            {
                throw new ArgumentException("Địa chỉ email không hợp lệ.", nameof(email));
            }

            // 1. Tạo nội dung Email bằng MimeMessage (MimeKit)
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("VietTuneArchive", _smtpSettings.Username));
            message.To.Add(new MailboxAddress("", email));
            message.Subject = "[VietTuneArchive] Mã xác nhận email của bạn!";

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = $@"
            <div style='font-family: Arial, sans-serif; line-height: 1.6;'>
                <h2 style='color: #0066cc;'>Xác minh địa chỉ email</h2>
                <p>Xin chào!</p>
                <p>Dưới đây là mã xác nhận tài khoản của bạn:</p>
                <div style='background-color: #f5f5f5; padding: 10px; border-radius: 5px; font-size: 18px; font-weight: bold;'>
                    {token}
                </div>
                <p>Vui lòng nhập mã này vào trang xác nhận để hoàn tất quá trình.</p>
                <p>Mã có hiệu lực trong 15 phút.</p>
                <p>Trân trọng,<br/>Đội ngũ hỗ trợ VietTuneArchive!</p>
            </div>"
            };
            message.Body = bodyBuilder.ToMessageBody();

            // 2. Gửi Email bằng SmtpClient của MailKit (KHÔNG phải System.Net.Mail)
            using var client = new SmtpClient();
            try
            {
                // Kết nối với chế độ STARTTLS (Port 587)
                await client.ConnectAsync(_smtpSettings.Server, _smtpSettings.Port, SecureSocketOptions.StartTls);

                // Xác thực bằng App Password
                await client.AuthenticateAsync(_smtpSettings.Username, _smtpSettings.Password);

                await client.SendAsync(message);
                await client.DisconnectAsync(true);
            }
            catch (Exception ex)
            {
                // Log lỗi chi tiết để kiểm tra trên Render Logs
                Console.Error.WriteLine($"[Email Error] Lỗi khi gửi email: {ex.Message}");
                throw; // Nên throw để lớp gọi Service này biết là gửi thất bại
            }
        }
        //        public async Task SendResetPasswordEmailAsync(string email, string fullName, string otp)
        //        {
        //            if (string.IsNullOrWhiteSpace(email) || !new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(email))
        //            {
        //                throw new ArgumentException("Địa chỉ email không hợp lệ.", nameof(email));
        //            }

        //            var emailSubject = "[VietTuneArchive] Mã reset mật khẩu của bạn";
        //            var emailBody = $@"
        //<div style='font-family: Arial, sans-serif; line-height: 1.6;'>
        //    <h2 style='color: #0066cc;'>Reset mật khẩu</h2>
        //    <p>Xin chào {fullName},</p>
        //    <p>Bạn đã yêu cầu reset mật khẩu. Dưới đây là mã xác nhận:</p>
        //    <div style='background-color: #f5f5f5; padding: 10px; border-radius: 5px; font-size: 18px; font-weight: bold;'>
        //        {otp}
        //    </div>
        //    <p>Vui lòng nhập mã này vào form reset để đặt mật khẩu mới. Mã hết hạn sau 15 phút.</p>
        //    <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
        //    <p>Trân trọng,<br/>Đội ngũ hỗ trợ VietTuneArchive!</p>
        //</div>";

        //            using var smtpClient = new SmtpClient(_smtpSettings.Server)
        //            {
        //                Port = _smtpSettings.Port,
        //                Credentials = new NetworkCredential(_smtpSettings.Username, _smtpSettings.Password),
        //                EnableSsl = true,
        //            };

        //            var mailMessage = new MailMessage
        //            {
        //                From = new MailAddress(_smtpSettings.Username),
        //                Subject = emailSubject,
        //                Body = emailBody,
        //                IsBodyHtml = true,
        //            };

        //            mailMessage.To.Add(email);

        //            try
        //            {
        //                await smtpClient.SendMailAsync(mailMessage);
        //            }
        //            catch (SmtpException ex)
        //            {
        //                Console.WriteLine($"Lỗi khi gửi email reset: {ex.Message}");
        //                throw;
        //            }
        //        }
        public async Task SendResetPasswordEmailAsync(string email, string fullName, string otp)
        {
            // 1. Kiểm tra Email hợp lệ
            if (string.IsNullOrWhiteSpace(email) || !new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(email))
            {
                throw new ArgumentException("Địa chỉ email không hợp lệ.", nameof(email));
            }

            // 2. Tạo nội dung Email bằng MimeMessage
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("VietTuneArchive", _smtpSettings.Username));
            message.To.Add(new MailboxAddress(fullName, email));
            message.Subject = "[VietTuneArchive] Mã reset mật khẩu của bạn";

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = $@"
        <div style='font-family: Arial, sans-serif; line-height: 1.6;'>
            <h2 style='color: #0066cc;'>Reset mật khẩu</h2>
            <p>Xin chào {fullName},</p>
            <p>Bạn đã yêu cầu reset mật khẩu. Dưới đây là mã xác nhận:</p>
            <div style='background-color: #f5f5f5; padding: 10px; border-radius: 5px; font-size: 18px; font-weight: bold;'>
                {otp}
            </div>
            <p>Vui lòng nhập mã này vào form reset để đặt mật khẩu mới. Mã hết hạn sau 15 phút.</p>
            <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
            <p>Trân trọng,<br/>Đội ngũ hỗ trợ VietTuneArchive!</p>
        </div>"
            };
            message.Body = bodyBuilder.ToMessageBody();

            // 3. Gửi Email
            using var client = new SmtpClient(); // Đây là MailKit.Net.Smtp.SmtpClient
            try
            {
                // Render/Linux hoạt động tốt nhất với SecureSocketOptions.StartTls trên Port 587
                await client.ConnectAsync(_smtpSettings.Server, _smtpSettings.Port, SecureSocketOptions.StartTls);

                // Sử dụng App Password (mật khẩu ứng dụng 16 ký tự)
                await client.AuthenticateAsync(_smtpSettings.Username, _smtpSettings.Password);

                await client.SendAsync(message);
                await client.DisconnectAsync(true);
            }
            catch (Exception ex)
            {
                // Log lỗi chi tiết để bạn xem trên Render Dashboard -> Logs
                Console.WriteLine($"[Email Service Error]: {ex.Message}");
                if (ex.InnerException != null)
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");

                throw; // Ném lỗi để Controller xử lý (trả về 500 hoặc thông báo lỗi)
            }
        }
    }
}
