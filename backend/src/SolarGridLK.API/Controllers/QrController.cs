/*
 * File: QrController.cs
 * Project: SolarGridLK.API
 * Description: QR image retrieval and Grid Operator QR verification endpoints.
 * Author: Buwaneka Vishwajith
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolarGridLK.Application.DTOs;
using SolarGridLK.Application.Interfaces;

namespace SolarGridLK.API.Controllers;

[ApiController]
[Route("api/qr")]
public class QrController : ControllerBase
{
    private readonly IQrService _qrService;

    public QrController(IQrService qrService)
    {
        _qrService = qrService;
    }

    [HttpGet("reservations/{reservationId}/image")]
    [Authorize]
    public async Task<IActionResult> GetQrImage(string reservationId)
    {
        // Return the QR image for the prosumer/operator client to display.
        try
        {
            var image = await _qrService.GetQrImageAsync(reservationId);
            return Ok(ApiResponse<string>.Ok(image, "QR image retrieved successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<string>.Fail(ex.Message));
        }
    }

    [HttpPost("verify")]
    [Authorize(Policy = "GridOperatorOnly")]
    public async Task<IActionResult> Verify([FromBody] QrVerifyRequestDto request)
    {
        // Verify a scanned QR token and finalize the transfer (Grid Operator).
        try
        {
            var result = await _qrService.VerifyAsync(request.Token);
            return Ok(ApiResponse<QrVerificationResultDto>.Ok(
                result, "Energy transfer verified and completed."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<QrVerificationResultDto>.Fail(ex.Message));
        }
    }
}