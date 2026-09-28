using SolarGridLK.Application.DTOs;

namespace SolarGridLK.Application.Interfaces;

public interface IProsumerService
{
    // Register a prosumer when the NIC is not already in use.
    Task<ProsumerDto> RegisterAsync(CreateProsumerDto request);

    // Retrieve one prosumer profile by NIC.
    Task<ProsumerDto?> GetByNicAsync(string nic);

    // Update profile fields without changing the NIC.
    Task<ProsumerDto?> UpdateAsync(string nic, UpdateProsumerDto request);

    // Record a prosumer deactivation request after the password is confirmed.
    Task<ProsumerDto?> RequestDeactivationAsync(
        string nic,
        ProsumerDeactivationRequestDto request);

    // Restore a deactivated prosumer account to active.
    Task<ProsumerDto?> ReactivateAsync(string nic);
}
