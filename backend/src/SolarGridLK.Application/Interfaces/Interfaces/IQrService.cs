/*
 * File: IQrService.cs
 * Project: SolarGridLK.Application
 * Description: Business operations for QR generation on approval and QR
 *              verification during an energy transfer.
 */

using SolarGridLK.Application.DTOs;

namespace SolarGridLK.Application.Interfaces;

public interface IQrService
{
    Task<QrGenerationResultDto> GenerateForReservationAsync(string reservationId);

    Task<string> GetQrImageAsync(string reservationId);

    Task<QrVerificationResultDto> VerifyAsync(string token);
}