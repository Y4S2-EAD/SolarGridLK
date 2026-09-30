/*
 * File: UpdateReservationDto.cs
 * Project: SolarGridLK.Application
 * Description: Data transfer object for updating an existing energy reservation.
 * Author: Nipuni Bandara
 */

namespace SolarGridLK.Application.DTOs;

public class UpdateReservationDto
{
    public string NodeId { get; set; } = string.Empty;
    public DateTime SlotDateTime { get; set; }
}