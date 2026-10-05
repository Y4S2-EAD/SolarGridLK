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
    // Capacity information for the slot (simultaneous reservations allowed)
    public int Capacity { get; set; }
    // Number of currently reserved (Pending or Approved) entries for this slot
    public int ReservedCount { get; set; }
    // Remaining available slots = Capacity - ReservedCount
    public int Available { get; set; }
    // When a reservation exists for this slot, include minimal details so clients can mark it pending/reserved
    public string? ReservationId { get; set; }
    public string? ReservationStatus { get; set; }
    public string? ReservedBy { get; set; }
}