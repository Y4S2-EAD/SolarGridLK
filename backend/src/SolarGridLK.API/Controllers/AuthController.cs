using Microsoft.AspNetCore.Mvc;
using SolarGridLK.Application.DTOs;
using SolarGridLK.Application.Interfaces;

namespace SolarGridLK.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IProsumerService _prosumerService;

    public AuthController(
        IUserService userService,
        IProsumerService prosumerService)
    {
        _userService = userService;
        _prosumerService = prosumerService;
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
    public async Task<IActionResult> ProsumerLogin(
        [FromBody] ProsumerLoginRequestDto request)
    {
        // Authenticate a prosumer account. Staff login is unchanged.
        try
        {
            var result = await _prosumerService.LoginAsync(request);

            if (result == null)
            {
                return Unauthorized(new
                {
                    success = false,
                    message = "Invalid NIC or password."
                });
            }

            return Ok(ApiResponse<LoginResponseDto>.Ok(
                result,
                "Login successful."));
        }
        catch (InvalidOperationException ex)
            when (ex.Message == "Prosumer account is deactivated.")
        {
            return Unauthorized(new
            {
                success = false,
                message = ex.Message
            });
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
}