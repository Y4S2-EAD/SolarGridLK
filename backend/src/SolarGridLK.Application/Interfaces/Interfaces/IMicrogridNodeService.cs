using SolarGridLK.Application.DTOs;

namespace SolarGridLK.Application.Interfaces;

public interface IMicrogridNodeService
{
    // Create a microgrid node when the node id is not already in use.
    Task<MicrogridNodeDto> CreateAsync(CreateMicrogridNodeDto request);

    // Return every microgrid node.
    Task<List<MicrogridNodeDto>> GetAllAsync();

    // Return one microgrid node by its public node id.
    Task<MicrogridNodeDto?> GetByNodeIdAsync(string nodeId);

    // Update node details without changing the node id or schedule.
    Task<MicrogridNodeDto?> UpdateAsync(
        string nodeId,
        UpdateMicrogridNodeDto request);

    // Replace the node's operating schedule.
    Task<MicrogridNodeDto?> UpdateScheduleAsync(
        string nodeId,
        UpdateNodeScheduleDto request);

    // Deactivate a node when it has no active reservations.
    Task<MicrogridNodeDto?> DeactivateAsync(string nodeId);

    // Return the available battery slots for a node on a specific date, divided into time slots of a given duration.
    Task<List<AvailableSlotDto>> GetAvailableSlotsAsync(string nodeId, DateTime date, int slotMinutes = 30);

    // Update only the available battery slot count of an active node.
    Task<MicrogridNodeDto?> UpdateBatterySlotsAsync(
        string nodeId,
        UpdateBatterySlotsDto request);

    // Return the available battery slots for a node on a specific date, excluding a specific reservation, divided into time slots of a given duration.
    Task<List<AvailableSlotDto>> GetAvailableSlotsExcludingReservationAsync(string nodeId, DateTime date, string excludeReservationId, int slotMinutes = 30);
}
