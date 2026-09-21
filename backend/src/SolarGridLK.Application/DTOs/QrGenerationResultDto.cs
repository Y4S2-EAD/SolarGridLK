/*
 * File: QrGenerationResultDto.cs
 * Project: SolarGridLK.Application
 * Description: Response returned after a QR code is generated for a reservation.
 */

namespace SolarGridLK.Application.DTOs;

public class QrGenerationResultDto
{
    public string ReservationId { get; set; } = string.Empty;

    // The opaque token embedded inside the QR image.
    public string Token { get; set; } = string.Empty;

    // PNG QR image as a base64 data URI, ready for a client to display.
    public string QrImageBase64 { get; set; } = string.Empty;
}