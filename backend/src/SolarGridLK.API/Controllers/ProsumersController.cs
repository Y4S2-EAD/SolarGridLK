using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolarGridLK.Application.DTOs;
using SolarGridLK.Application.Interfaces;

namespace SolarGridLK.API.Controllers;

[ApiController]
[Route("api/prosumers")]
public class ProsumersController : ControllerBase
{
    private readonly IProsumerService _prosumerService;

    public ProsumersController(IProsumerService prosumerService)
    {
        // Store the prosumer service used by every action.
        _prosumerService = prosumerService;
    }

    [HttpPost]
    public async Task<IActionResult> Register(
        [FromBody] CreateProsumerDto request)
    {
        // Register a new prosumer account.
        try
        {
            var prosumer = await _prosumerService.RegisterAsync(request);

            return CreatedAtAction(
                nameof(GetProsumer),
                new { nic = prosumer.Nic },
                ApiResponse<ProsumerDto>.Ok(
                    prosumer,
                    "Prosumer registered successfully."));
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

    [HttpGet("{nic}")]
    [Authorize]
    public async Task<IActionResult> GetProsumer(string nic)
    {
        // Return a profile to Backoffice, or to the Prosumer who owns this NIC.
        var denied = DenyUnlessBackofficeOrOwner(nic);
        if (denied != null)
        {
            return denied;
        }

        try
        {
            var prosumer = await _prosumerService.GetByNicAsync(nic);

            if (prosumer == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Prosumer not found."
                });
            }

            return Ok(ApiResponse<ProsumerDto>.Ok(
                prosumer,
                "Prosumer retrieved successfully."));
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

    [HttpPut("{nic}")]
    [Authorize]
    public async Task<IActionResult> UpdateProsumer(
        string nic,
        [FromBody] UpdateProsumerDto request)
    {
        // Update permitted profile fields. The route NIC is never replaced.
        var denied = DenyUnlessBackofficeOrOwner(nic);
        if (denied != null)
        {
            return denied;
        }

        try
        {
            var prosumer = await _prosumerService.UpdateAsync(nic, request);

            if (prosumer == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Prosumer not found."
                });
            }

            return Ok(ApiResponse<ProsumerDto>.Ok(
                prosumer,
                "Prosumer updated successfully."));
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

    [HttpPost("{nic}/deactivation-request")]
    [Authorize]
    public async Task<IActionResult> RequestDeactivation(
        string nic,
        [FromBody] ProsumerDeactivationRequestDto request)
    {
        // Accept a deactivation request after the current password is confirmed.
        var denied = DenyUnlessBackofficeOrOwner(nic);
        if (denied != null)
        {
            return denied;
        }

        try
        {
            var prosumer = await _prosumerService
                .RequestDeactivationAsync(nic, request);

            if (prosumer == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Prosumer not found."
                });
            }

            return Ok(ApiResponse<ProsumerDto>.Ok(
                prosumer,
                "Deactivation request submitted successfully."));
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

    [HttpPost("{nic}/reactivate")]
    [Authorize(Policy = "BackofficeOnly")]
    public async Task<IActionResult> Reactivate(string nic)
    {
        // Reactivate a deactivated prosumer account for a Backoffice officer.
        try
        {
            var prosumer = await _prosumerService.ReactivateAsync(nic);

            if (prosumer == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Prosumer not found."
                });
            }

            return Ok(ApiResponse<ProsumerDto>.Ok(
                prosumer,
                "Prosumer reactivated successfully."));
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

    private IActionResult? DenyUnlessBackofficeOrOwner(string nic)
    {
        // Backoffice may use any NIC. A Prosumer may use only the NIC in the JWT.
        if (User.IsInRole("Backoffice"))
        {
            return null;
        }

        if (User.IsInRole("Prosumer"))
        {
            var callerNic = GetAuthenticatedNic();
            var routeNic = nic?.Trim().ToUpperInvariant();

            if (!string.IsNullOrWhiteSpace(callerNic) &&
                string.Equals(callerNic, routeNic, StringComparison.Ordinal))
            {
                return null;
            }

            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                success = false,
                message = "You can only access your own prosumer account."
            });
        }

        return StatusCode(StatusCodes.Status403Forbidden, new
        {
            success = false,
            message = "You are not allowed to access this prosumer account."
        });
    }

    private string? GetAuthenticatedNic()
    {
        // Read the Prosumer NIC from the existing JWT claims.
        var nic = User.FindFirst("nic")?.Value
            ?? User.FindFirst(ClaimTypes.Name)?.Value
            ?? User.Identity?.Name;

        return string.IsNullOrWhiteSpace(nic)
            ? null
            : nic.Trim().ToUpperInvariant();
    }
}
