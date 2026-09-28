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
    [Authorize(Policy = "BackofficeOnly")]
    public async Task<IActionResult> GetProsumer(string nic)
    {
        // Return one prosumer profile to an authorized Backoffice user.
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
    [Authorize(Policy = "BackofficeOnly")]
    public async Task<IActionResult> UpdateProsumer(
        string nic,
        [FromBody] UpdateProsumerDto request)
    {
        // Update permitted profile fields. The route NIC is never replaced.
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
    public async Task<IActionResult> RequestDeactivation(
        string nic,
        [FromBody] ProsumerDeactivationRequestDto request)
    {
        // Accept a deactivation request after the current password is confirmed.
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
}
