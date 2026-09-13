using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolarGridLK.Application.DTOs;
using SolarGridLK.Application.Interfaces;

namespace SolarGridLK.API.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "Backoffice")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        // Return all system users to an authorized Backoffice user.
        var users = await _userService.GetAllUsersAsync();

        return Ok(ApiResponse<List<UserDto>>.Ok(
            users,
            "Users retrieved successfully."));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUser(string id)
    {
        // Return one system user using the supplied identifier.
        var user = await _userService.GetUserByIdAsync(id);

        if (user == null)
        {
            return NotFound(new
            {
                success = false,
                message = "User not found."
            });
        }

        return Ok(ApiResponse<UserDto>.Ok(
            user,
            "User retrieved successfully."));
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser(
        [FromBody] CreateUserDto request)
    {
        // Create a new Backoffice or Grid Operator account.
        try
        {
            var user = await _userService
                .CreateUserAsync(request);

            return CreatedAtAction(
                nameof(GetUser),
                new { id = user.Id },
                ApiResponse<UserDto>.Ok(
                    user,
                    "User created successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                success = false,
                message = ex.Message
            });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(
        string id,
        [FromBody] UpdateUserDto request)
    {
        // Update an existing Backoffice or Grid Operator account.
        try
        {
            var user = await _userService
                .UpdateUserAsync(id, request);

            if (user == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "User not found."
                });
            }

            return Ok(ApiResponse<UserDto>.Ok(
                user,
                "User updated successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                success = false,
                message = ex.Message
            });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        // Delete an existing system user account.
        var deleted = await _userService
            .DeleteUserAsync(id);

        if (!deleted)
        {
            return NotFound(new
            {
                success = false,
                message = "User not found."
            });
        }

        return Ok(new
        {
            success = true,
            message = "User deleted successfully."
        });
    }
}