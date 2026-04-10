namespace VietTuneArchive.Application.Mapper.DTOs
{
    public class UserDTO
    {
        public Guid UserId { get; set; }
        public string Email { get; set; }
        public string FullName { get; set; }
        public string PhoneNumber { get; set; }
        public int? RentalLocationId { get; set; }
        public string Role { get; set; } // 1. Customer, 2. Staff, 3. Admin
        public bool IsActive { get; set; }
        public int? Point { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdateAt { get; set; }
    }

    public class CreateExpertUserDTO
    {
        public string Email { get; set; }
        public string Password { get; set; }
        public string FullName { get; set; }
    }

    public class UpdateUserDTO
    {
        public Guid UserId { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public string FullName { get; set; }
    }
    public class UpdateNameDTO
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; }
    }
    public class UpdatePasswordDTO
    {
        public Guid UserId { get; set; }
        public string oldPassword { get; set; }
        public string newPassword { get; set; }
    }
    public class UpdateUserActiveStatusDTO
    {
        public Guid UserId { get; set; }
        public bool IsActive { get; set; }
    }
}
