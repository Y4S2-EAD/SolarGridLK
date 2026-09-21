/*
 * File: QrService.cs
 * Project: SolarGridLK.Infrastructure
 * Description: Generates QR tokens/images on reservation approval and verifies
 *              scanned QR codes to finalize energy transfers.
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

    public QrService(IReservationRepository reservationRepository)
    {
        _reservationRepository = reservationRepository;
    }

    public async Task<QrGenerationResultDto> GenerateForReservationAsync(
        string reservationId)
    {
        // Generate and persist a QR token for an approved reservation.
        var reservation = await _reservationRepository
            .GetByIdAsync(reservationId);

        if (reservation == null)
        {
            throw new InvalidOperationException("Reservation not found.");
        }

        if (reservation.Status != ReservationStatus.Approved)
        {
            throw new InvalidOperationException(
                "A QR code can only be generated for an approved reservation.");
        }

        // 256-bit cryptographically-random, unforgeable token.
        var token = GenerateSecureToken();

        reservation.QrCode = token;
        reservation.LastModifiedAt = DateTime.UtcNow;

        await _reservationRepository.UpdateAsync(reservation);

        return new QrGenerationResultDto
        {
            ReservationId = reservation.Id,
            Token = token,
            QrImageBase64 = BuildQrImage(token)
        };
    }

    public async Task<string> GetQrImageAsync(string reservationId)
    {
        // Rebuild the QR image for an already-generated reservation token.
        var reservation = await _reservationRepository
            .GetByIdAsync(reservationId);

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

        var reservation = await _reservationRepository
            .GetByQrCodeAsync(token);

        if (reservation == null)
        {
            throw new InvalidOperationException(
                "Invalid or unrecognized QR code.");
        }

        if (reservation.Status == ReservationStatus.Completed)
        {
            throw new InvalidOperationException(
                "This energy transfer has already been completed.");
        }

        if (reservation.Status == ReservationStatus.Cancelled)
        {
            throw new InvalidOperationException(
                "This reservation was cancelled.");
        }

        if (reservation.Status != ReservationStatus.Approved)
        {
            throw new InvalidOperationException(
                "This reservation has not been approved.");
        }

        // Mark the transfer as completed.
        reservation.Status = ReservationStatus.Completed;
        reservation.LastModifiedAt = DateTime.UtcNow;

        await _reservationRepository.UpdateAsync(reservation);

        return new QrVerificationResultDto
        {
            ReservationId = reservation.Id,
            ProsumerNic = reservation.ProsumerNic,
            NodeId = reservation.NodeId,
            SlotDateTime = reservation.SlotDateTime,
            Status = reservation.Status.ToString()
        };
    }

    private static string GenerateSecureToken()
    {
        // Produce a URL-safe 256-bit random token.
        var bytes = RandomNumberGenerator.GetBytes(32);

        return Convert.ToBase64String(bytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .Replace("=", string.Empty);
    }

    private static string BuildQrImage(string payload)
    {
        // Encode the payload into a PNG QR image (cross-platform, no System.Drawing).
        using var generator = new QRCodeGenerator();

        using var data = generator.CreateQrCode(
            payload,
            QRCodeGenerator.ECCLevel.Q);

        var pngQr = new PngByteQRCode(data);

        var pngBytes = pngQr.GetGraphic(20);

        return "data:image/png;base64," + Convert.ToBase64String(pngBytes);
    }
}