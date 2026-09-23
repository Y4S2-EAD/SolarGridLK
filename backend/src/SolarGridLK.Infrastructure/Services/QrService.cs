/*
 * File: QrService.cs
 * Project: SolarGridLK.Infrastructure
 * Description: Generates QR tokens/images for approved reservations and verifies scanned
 *              QR codes, delegating the Approved->Completed transition to the reservation service.
 * Author: Buwaneka Vishwajith
 */

using System.Security.Cryptography;
using QRCoder;
using SolarGridLK.Application.DTOs;
using SolarGridLK.Application.Interfaces;
using SolarGridLK.Domain.Enums;

namespace SolarGridLK.Infrastructure.Services;

public class QrService : IQrService
{
    private readonly IReservationRepository _reservationRepository;
    private readonly IReservationService _reservationService;

    public QrService(
        IReservationRepository reservationRepository,
        IReservationService reservationService)
    {
        _reservationRepository = reservationRepository;
        _reservationService = reservationService;
    }

    public string GenerateToken()
    {
        // Produce a URL-safe 256-bit cryptographically-random token.
        var bytes = RandomNumberGenerator.GetBytes(32);

        return Convert.ToBase64String(bytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .Replace("=", string.Empty);
    }

    public string BuildQrImage(string token)
    {
        // Encode a token into a PNG QR image (cross-platform, no System.Drawing).
        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(token, QRCodeGenerator.ECCLevel.Q);
        var pngQr = new PngByteQRCode(data);
        var pngBytes = pngQr.GetGraphic(20);
        return "data:image/png;base64," + Convert.ToBase64String(pngBytes);
    }

    public async Task<string> GetQrImageAsync(string reservationId)
    {
        // Rebuild the QR image from an already-approved reservation's stored token.
        var reservation = await _reservationRepository.GetByIdAsync(reservationId);

        if (reservation == null)
        {
            throw new InvalidOperationException("Reservation not found.");
        }

        if (string.IsNullOrWhiteSpace(reservation.QrCode))
        {
            throw new InvalidOperationException(
                "No QR code has been generated for this reservation yet.");
        }

        return BuildQrImage(reservation.QrCode);
    }

    public async Task<QrVerificationResultDto> VerifyAsync(string token)
    {
        // Validate a scanned token and finalize the energy transfer.
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new InvalidOperationException("QR token is required.");
        }

        var reservation = await _reservationRepository.GetByQrCodeAsync(token);

        if (reservation == null)
        {
            throw new InvalidOperationException("Invalid or unrecognized QR code.");
        }

        // Friendly messages for the common invalid states (replay protection).
        if (reservation.Status == ReservationStatus.Completed)
        {
            throw new InvalidOperationException("This energy transfer has already been completed.");
        }

        if (reservation.Status == ReservationStatus.Cancelled)
        {
            throw new InvalidOperationException("This reservation was cancelled.");
        }

        // Delegate the Approved -> Completed transition to her service (single source of lifecycle truth).
        var completed = await _reservationService.CompleteReservationAsync(reservation.Id);

        if (completed == null)
        {
            throw new InvalidOperationException("Reservation not found.");
        }

        return new QrVerificationResultDto
        {
            ReservationId = completed.Id,
            ProsumerNic = completed.ProsumerNic,
            NodeId = completed.NodeId,
            SlotDateTime = completed.SlotDateTime,
            Status = completed.Status
        };
    }
}