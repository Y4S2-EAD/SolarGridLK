/*
 * File: QrController.cs
 * Project: SolarGridLK.API
 * Description: Endpoints for QR generation on approval, QR image retrieval,
 *              and Grid Operator QR verification of energy transfers.
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

    [HttpPost("reservations/{reservationId}/generate")]
    [Authorize(Policy = "BackofficeOnly")]
    public async Task<IActionResult> GenerateQr(string reservationId)
    {
        // Generate a QR code for an approved reservation (Backoffice action).
        try
        {
            var result = await _qrService
                .GenerateForReservationAsync(reservationId);

            return Ok(ApiResponse<QrGenerationResultDto>.Ok(
                result,
                "QR code generated successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(
                ApiResponse<QrGenerationResultDto>.Fail(ex.Message));
        }
    }

    [HttpGet("reservations/{reservationId}/image")]
    [Authorize]
    public async Task<IActionResult> GetQrImage(string reservationId)
    {
        // Return the QR image for display on the prosumer/operator client.
        try
        {
            var image = await _qrService.GetQrImageAsync(reservationId);

            return Ok(ApiResponse<string>.Ok(
                image,
                "QR image retrieved successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<string>.Fail(ex.Message));
        }
    }

    [HttpPost("verify")]
    [Authorize(Policy = "GridOperatorOnly")]
    public async Task<IActionResult> Verify(
        [FromBody] QrVerifyRequestDto request)
    {
        // Verify a scanned QR token and finalize the energy transfer (Grid Operator).
        try
        {
            var result = await _qrService.VerifyAsync(request.Token);

            return Ok(ApiResponse<QrVerificationResultDto>.Ok(
                result,
                "Energy transfer verified and completed."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(
                ApiResponse<QrVerificationResultDto>.Fail(ex.Message));
        }
    }
}