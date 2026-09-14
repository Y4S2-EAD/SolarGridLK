using SolarGridLK.Domain.Entities;

namespace SolarGridLK.Application.Interfaces;

public interface IMicrogridNodeRepository
{
    // Find a node by the NodeId stored on reservations.
    Task<MicrogridNode?> GetByNodeIdAsync(string nodeId);

    // Retrieve every microgrid node.
    Task<List<MicrogridNode>> GetAllAsync();

    // Insert a new microgrid node document.
    Task CreateAsync(MicrogridNode node);

    // Replace an existing microgrid node document.
    Task UpdateAsync(MicrogridNode node);
}
