using SolarGridLK.Application.DTOs;

namespace SolarGridLK.Application.Interfaces;

public interface IProsumerService
{
    // Register a prosumer when the NIC is not already in use.
    Task<ProsumerDto> RegisterAsync(CreateProsumerDto request);

    // Authenticate a prosumer by NIC and password. Returns null when the credentials do not match.
    Task<LoginResponseDto?> LoginAsync(ProsumerLoginRequestDto request);

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
