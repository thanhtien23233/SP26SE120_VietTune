using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VietTuneArchive.Application.IServices;
using VietTuneArchive.Application.Mapper.DTOs;

namespace VietTuneArchive.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;
        public UserController(IUserService userService)
        {
            _userService = userService;
        }
        [HttpGet("GetAll")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllUser()
        {
            var Users = await _userService.GetAllAsync();
            return Ok(Users);
        }

        [HttpGet("GetById")]
        [Authorize(Roles = "Admin,Contributor,Researcher,Expert")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var user = await _userService.GetByIdAsync(id);
            if (user == null)
                return NotFound();

            return Ok(user);
        }

        [HttpPut("update-password")]
        [Authorize(Roles = "Admin,Contributor,Researcher,Expert")]
        public async Task<IActionResult> UpdatePassword([FromBody] UpdatePasswordDTO updatePasswordDTO)
        {
            if (updatePasswordDTO == null)
                return BadRequest("Invalid data.");
            var result = await _userService.UpdatePasswordAsync(updatePasswordDTO);
            if (result.IsSuccess)
            {
                return Ok(result);
            }
            return BadRequest(result);
        }

        [HttpPut("update-profile")]
        [Authorize(Roles = "Admin,Contributor,Researcher,Expert")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateInfoDTO updateProfileDTO)
        {
            if (updateProfileDTO == null)
                return BadRequest("Invalid data.");
            var result = await _userService.UpdateInfoAsync(updateProfileDTO);
            if (result.IsSuccess)
            {
                return Ok(result);
            }
            return BadRequest(result);
        }

        [HttpPut]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update([FromBody] UpdateUserDTO updateUserDTO)
        {
            if (updateUserDTO == null)
                return BadRequest("Invalid data.");

            var result = await _userService.UpdateAsync(updateUserDTO);
            return Ok(result);
        }

        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _userService.DeleteAsync(id);
            return Ok("User deleted successfully.");
        }
    }
}
