/*
 * File: QrVerificationResultDto.cs
 * Project: SolarGridLK.Application
 * Description: Result of a successful QR verification and transfer finalization.
 * Author: Buwaneka Vishwajith
 * Date: 2026-09-21
 */

namespace SolarGridLK.Application.DTOs;

public class QrVerificationResultDto
{
    public string ReservationId { get; set; } = string.Empty;

    public string ProsumerNic { get; set; } = string.Empty;

    public string NodeId { get; set; } = string.Empty;

    public DateTime SlotDateTime { get; set; }

    public string Status { get; set; } = string.Empty;
}