/*
 * File: AvailableSlotDto.cs
 * Project: SolarGridLK.Application
 * Description: Represents one bookable time slot at a node, with its availability.
 * Author: Nipuni Bandara
 */

namespace SolarGridLK.Application.DTOs;

public class AvailableSlotDto
{
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
    public bool IsAvailable { get; set; }
}