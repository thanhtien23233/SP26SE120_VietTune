namespace VietTuneArchive.Application.Mapper.DTOs.Request
{
    public class UserRequest
    {
        public class UpdateUserRequest
        {
            public string FullName { get; set; } = default!;
            public string? Bio { get; set; }
            public string? Phone { get; set; }
        }

        public class ChangePasswordRequest
        {
            public string CurrentPassword { get; set; } = default!;
            public string NewPassword { get; set; } = default!;
            public string ConfirmPassword { get; set; } = default!;
        }

    }
}
