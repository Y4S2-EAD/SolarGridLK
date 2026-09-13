using Microsoft.AspNetCore.Mvc;
using SolarGridLK.Application.DTOs;
using SolarGridLK.Application.Interfaces;

namespace SolarGridLK.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IUserService _userService;

    public AuthController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequestDto request)
    {
        // Authenticate a Backoffice or Grid Operator account.
        var result = await _userService.LoginAsync(request);

        if (result == null)
        {
            return Unauthorized(new
            {
                success = false,
                message = "Invalid username or password."
            });
        }

        return Ok(ApiResponse<LoginResponseDto>.Ok(
            result,
            "Login successful."));
    }

    [HttpPost("prosumer-login")]
    public IActionResult ProsumerLogin()
    {
        // Keep prosumer authentication reserved for the prosumer module.
        return StatusCode(
            StatusCodes.Status501NotImplemented,
            new
            {
                success = false,
                message = "Prosumer login will be implemented by the prosumer module."
            });
    }
}