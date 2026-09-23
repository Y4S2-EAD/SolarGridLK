/*
 * File: IQrService.cs
 * Project: SolarGridLK.Application
 * Description: QR token/image generation and QR verification for energy transfers.
 * Author: Buwaneka Vishwajith
 */

using SolarGridLK.Application.DTOs;

namespace SolarGridLK.Application.Interfaces;

public interface IQrService
{
    string GenerateToken();

    string BuildQrImage(string token);

    Task<string> GetQrImageAsync(string reservationId);

    Task<QrVerificationResultDto> VerifyAsync(string token);
}