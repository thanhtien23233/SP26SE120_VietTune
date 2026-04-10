using VietTuneArchive.Application.Common;
using VietTuneArchive.Application.Mapper.DTOs;

namespace VietTuneArchive.Application.IServices
{
    public interface IUserService
    {
        Task<Result<IEnumerable<UserDTO>>> GetAllAsync();
        Task<Result<UserDTO>> GetByIdAsync(Guid id);
        Task<Result<CreateExpertUserDTO>> AddAsync(CreateExpertUserDTO userDTO);
        Task<Result<UpdateUserDTO>> UpdateAsync(UpdateUserDTO updateUserDTO);
        Task<Result<UpdateNameDTO>> UpdateNameAsync(UpdateNameDTO updateUserDTO);
        Task<Result<UpdatePasswordDTO>> UpdatePasswordAsync(UpdatePasswordDTO updateUserDTO);
        Task<Result<UpdateUserActiveStatusDTO>> UpdateUserActiveStatusAsync(UpdateUserActiveStatusDTO updateUserActiveStatusDTO);
        Task DeleteAsync(Guid id);
    }
}
