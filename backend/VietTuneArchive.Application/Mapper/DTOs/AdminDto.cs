namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class AdminDto
    {
        public class UserAdminDto
        {
            public string Id { get; set; } = default!;
            public string Email { get; set; } = default!;
            public string FullName { get; set; } = default!;
            public string Role { get; set; } = default!;
            public string Status { get; set; } = default!;
            public DateTime CreatedAt { get; set; }
        }

        public class UserDetailAdminDto : UserAdminDto
        {
            public int SongsContributed { get; set; }
            public int ReviewsCompleted { get; set; }
            public DateTime? LastLogin { get; set; }
        }

        public class SubmissionAdminDto
        {
            public string Id { get; set; } = default!;
            public string Title { get; set; } = default!;
            public string Status { get; set; } = default!;
            public string? ReviewerId { get; set; }
            public string SubmittedBy { get; set; } = default!;
        }

        public class SystemHealthDto
        {
            public string Status { get; set; } = default!;
            public string Uptime { get; set; } = default!;
            public int DbConnections { get; set; }
            public int QueueLength { get; set; }
            public Dictionary<string, string> Services { get; set; } = new();
        }
    }
}
