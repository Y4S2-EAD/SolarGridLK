using SolarGridLK.Domain.Entities;

namespace SolarGridLK.Application.Interfaces;

public interface IProsumerRepository
{
    // Find a prosumer by the NIC primary key.
    Task<Prosumer?> GetByNicAsync(string nic);

    // Insert a new prosumer document.
    Task CreateAsync(Prosumer prosumer);

    // Replace an existing prosumer document.
    Task UpdateAsync(Prosumer prosumer);
}
