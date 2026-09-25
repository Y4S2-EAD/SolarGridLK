/*
 * File: ReservationsController.cs
 * Project: SolarGridLK.API
 * Description: Exposes HTTP endpoints for managing energy reservations.
 * Author: Nipuni Bandara
 */

using Microsoft.AspNetCore.Mvc;
using SolarGridLK.Application.DTOs;
using SolarGridLK.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;

namespace SolarGridLK.API.Controllers;

[ApiController]
[Route("api/reservations")]
[Authorize]
public class ReservationsController : ControllerBase
{
    private readonly IReservationService _reservationService;
    private readonly IQrService _qrService;

    public ReservationsController(IReservationService reservationService, IQrService qrService)
    {
        _reservationService = reservationService;
        _qrService = qrService;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReservationDto request)
    {
        // Create a new reservation, rejecting requests outside the 7-day window.
        try
        {
            var reservation = await _reservationService.CreateReservationAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = reservation.Id },
                ApiResponse<ReservationDto>.Ok(reservation, "Reservation created successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? prosumerNic,
        [FromQuery] string? status,
        [FromQuery] string? search)
    {
        // Return reservations, optionally filtered by prosumer, status, or search term.
        var reservations = await _reservationService.GetReservationAsync(prosumerNic, status, search);
        return Ok(ApiResponse<List<ReservationDto>>.Ok(reservations, "Reservations retrieved successfully."));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        // Return a single reservation by its identifier.
        var reservation = await _reservationService.GetReservationByIdAsync(id);
        if (reservation == null)
            return NotFound(new { success = false, message = "Reservation not found." });

        return Ok(ApiResponse<ReservationDto>.Ok(reservation, "Reservation retrieved successfully."));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateReservationDto request)
    {
        // Modify an existing reservation's slot time, enforcing the 12-hour notice rule.
        try
        {
            var reservation = await _reservationService.UpdateReservationAsync(id, request);
            if (reservation == null)
                return NotFound(new { success = false, message = "Reservation not found." });

            return Ok(ApiResponse<ReservationDto>.Ok(reservation, "Reservation updated successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("{id}/approve")]
    [Authorize(Policy = "GridOperatorOnly")]
    public async Task<IActionResult> Approve(string id)
    {
        // Approve a pending reservation and attach the generated QR code.
        try
        {
            var token = _qrService.GenerateToken();
            var reservation = await _reservationService.ApproveReservationAsync(id, token);
            if (reservation == null)
                return NotFound(new { success = false, message = "Reservation not found." });

            return Ok(ApiResponse<ReservationDto>.Ok(reservation, "Reservation approved successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("{id}/complete")]
    [Authorize(Policy = "GridOperatorOnly")]
    public async Task<IActionResult> Complete(string id)
    {
        // Mark an approved reservation as completed once the energy transfer is finalized.
        try
        {
            var reservation = await _reservationService.CompleteReservationAsync(id);
            if (reservation == null)
                return NotFound(new { success = false, message = "Reservation not found." });

            return Ok(ApiResponse<ReservationDto>.Ok(reservation, "Reservation marked as completed."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Cancel(string id)
    {
        // Cancel an existing reservation, enforcing the 12-hour notice rule.
        try
        {
            var reservation = await _reservationService.CancelReservationAsync(id);
            if (reservation == null)
                return NotFound(new { success = false, message = "Reservation not found." });

            return Ok(ApiResponse<ReservationDto>.Ok(reservation, "Reservation cancelled successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard([FromQuery] string prosumerNic)
    {
        // Return active, pending, and approved-future reservation counts for a prosumer.
        var summary = await _reservationService.GetDashboardSummaryAsync(prosumerNic);
        return Ok(ApiResponse<DashboardSummaryDto>.Ok(summary, "Dashboard summary retrieved successfully."));
    }
}