/* 
 * File: CreateReservationDto.cs
 * Project: SolarGridLK.Application
 * Description: Data transfer object for creating a new energy reservation.
 * Author: Nipuni Bandara
 */

namespace SolarGridLK.Application.DTOs;

public class CreateReservationDto
{
    public string ProsumerNic { get; set; } = string.Empty;
    public string NodeId { get; set; } = string.Empty;
    public DateTime SlotDateTime { get; set; }
}