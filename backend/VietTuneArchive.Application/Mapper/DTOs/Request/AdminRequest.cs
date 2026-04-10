namespace VietTuneArchive.Application.Mapper.DTOs.Request
{
    public class AdminRequest
    {
        public class UpdateRoleRequest
        {
            public string Role { get; set; } = default!;  // User, Expert, Admin
        }

        public class UpdateStatusRequest
        {
            public string Status { get; set; } = default!;  // Active, Inactive, Banned
        }

        public class AssignReviewerRequest
        {
            public string ReviewerId { get; set; } = default!;
        }

        public class ReferenceDataRequest
        {
            public string Name { get; set; } = default!;
            public string Code { get; set; } = default!;
            // type-specific fields
        }
    }
}
