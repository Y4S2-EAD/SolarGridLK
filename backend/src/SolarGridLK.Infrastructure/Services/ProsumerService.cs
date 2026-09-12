using SolarGridLK.Application.DTOs;
using SolarGridLK.Application.Interfaces;
using SolarGridLK.Domain.Entities;
using SolarGridLK.Domain.Enums;

namespace SolarGridLK.Infrastructure.Services;

public class ProsumerService : IProsumerService
{
    private readonly IProsumerRepository _prosumerRepository;
    private readonly IPasswordHasher _passwordHasher;

    public ProsumerService(
        IProsumerRepository prosumerRepository,
        IPasswordHasher passwordHasher)
    {
        // Store the repository and the shared password hasher.
        _prosumerRepository = prosumerRepository;
        _passwordHasher = passwordHasher;
    }

    public async Task<ProsumerDto> RegisterAsync(CreateProsumerDto request)
    {
        // Validate required registration fields and reject a duplicate NIC.
        var nic = NormalizeNic(request.Nic);

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            throw new InvalidOperationException("Password is required.");
        }

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            throw new InvalidOperationException("Full name is required.");
        }

        var existing = await _prosumerRepository.GetByNicAsync(nic);

        if (existing != null)
        {
            throw new InvalidOperationException("NIC already exists.");
        }

        var prosumer = new Prosumer
        {
            Nic = nic,
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            FullName = request.FullName.Trim(),
            Email = request.Email?.Trim() ?? string.Empty,
            PhoneNumber = request.PhoneNumber?.Trim() ?? string.Empty,
            Address = request.Address?.Trim() ?? string.Empty,
            Status = ProsumerStatus.Active,
            CreatedAt = DateTime.UtcNow
        };

        await _prosumerRepository.CreateAsync(prosumer);

        return MapToDto(prosumer);
    }

    public async Task<ProsumerDto?> GetByNicAsync(string nic)
    {
        // Return the prosumer profile for a NIC, or null when none exists.
        var prosumer = await _prosumerRepository.GetByNicAsync(
            NormalizeNic(nic));

        return prosumer == null ? null : MapToDto(prosumer);
    }

    public async Task<ProsumerDto?> UpdateAsync(
        string nic,
        UpdateProsumerDto request)
    {
        // Update permitted profile fields and leave the NIC unchanged.
        var prosumer = await _prosumerRepository.GetByNicAsync(
            NormalizeNic(nic));

        if (prosumer == null)
        {
            return null;
        }

        if (prosumer.Status == ProsumerStatus.Deactivated)
        {
            throw new InvalidOperationException(
                "Cannot update a deactivated prosumer account.");
        }

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            prosumer.PasswordHash = _passwordHasher
                .HashPassword(request.Password);
        }

        if (!string.IsNullOrWhiteSpace(request.FullName))
        {
            prosumer.FullName = request.FullName.Trim();
        }

        if (request.Email != null)
        {
            prosumer.Email = request.Email.Trim();
        }

        if (request.PhoneNumber != null)
        {
            prosumer.PhoneNumber = request.PhoneNumber.Trim();
        }

        if (request.Address != null)
        {
            prosumer.Address = request.Address.Trim();
        }

        await _prosumerRepository.UpdateAsync(prosumer);

        return MapToDto(prosumer);
    }

    public async Task<ProsumerDto?> RequestDeactivationAsync(
        string nic,
        ProsumerDeactivationRequestDto request)
    {
        // Deactivate the account after the prosumer confirms the current password.
        var prosumer = await _prosumerRepository.GetByNicAsync(
            NormalizeNic(nic));

        if (prosumer == null)
        {
            return null;
        }

        if (prosumer.Status == ProsumerStatus.Deactivated)
        {
            throw new InvalidOperationException(
                "Prosumer account is already deactivated.");
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            throw new InvalidOperationException("Password is required.");
        }

        var passwordValid = _passwordHasher.VerifyPassword(
            request.Password,
            prosumer.PasswordHash);

        if (!passwordValid)
        {
            throw new InvalidOperationException("Invalid password.");
        }

        prosumer.Status = ProsumerStatus.Deactivated;

        await _prosumerRepository.UpdateAsync(prosumer);

        return MapToDto(prosumer);
    }

    public async Task<ProsumerDto?> ReactivateAsync(string nic)
    {
        // Restore a deactivated prosumer account to active.
        var prosumer = await _prosumerRepository.GetByNicAsync(
            NormalizeNic(nic));

        if (prosumer == null)
        {
            return null;
        }

        if (prosumer.Status == ProsumerStatus.Active)
        {
            throw new InvalidOperationException(
                "Prosumer account is already active.");
        }

        prosumer.Status = ProsumerStatus.Active;

        await _prosumerRepository.UpdateAsync(prosumer);

        return MapToDto(prosumer);
    }

    private static string NormalizeNic(string? nic)
    {
        // Reject a missing NIC and store it in a stable uppercase form.
        if (string.IsNullOrWhiteSpace(nic))
        {
            throw new InvalidOperationException("NIC is required.");
        }

        return nic.Trim().ToUpperInvariant();
    }

    private static ProsumerDto MapToDto(Prosumer prosumer)
    {
        // Convert a prosumer entity into a client-safe DTO.
        return new ProsumerDto
        {
            Nic = prosumer.Nic,
            FullName = prosumer.FullName,
            Email = prosumer.Email,
            PhoneNumber = prosumer.PhoneNumber,
            Address = prosumer.Address,
            Status = prosumer.Status.ToString(),
            CreatedAt = prosumer.CreatedAt
        };
    }
}
