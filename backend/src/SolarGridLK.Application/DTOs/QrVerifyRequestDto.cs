/*
 * File: QrVerifyRequestDto.cs
 * Project: SolarGridLK.Application
 * Description: Request body carrying the scanned QR token for verification.
 * Author: Buwaneka Vishwajith
 * Date: 2026-09-21
 */

namespace SolarGridLK.Application.DTOs;

public class QrVerifyRequestDto
{
    public string Token { get; set; } = string.Empty;
}