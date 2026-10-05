using MongoDB.Driver;
using SolarGridLK.Application.Interfaces;
using SolarGridLK.Domain.Entities;
using SolarGridLK.Infrastructure.MongoDB;

namespace SolarGridLK.Infrastructure.Repositories;

public class MicrogridNodeRepository : IMicrogridNodeRepository
{
    private readonly IMongoCollection<MicrogridNode> _nodes;

    public MicrogridNodeRepository(MongoDbContext mongoDbContext)
    {
        // Bind this repository to the shared MicrogridNodes collection.
        _nodes = mongoDbContext.GetCollection<MicrogridNode>(
            MongoCollectionNames.MicrogridNodes);

        // Keep the public node id unique even when two creates arrive together.
        var nodeIdIndex = new CreateIndexModel<MicrogridNode>(
            Builders<MicrogridNode>.IndexKeys.Ascending(node => node.NodeId),
            new CreateIndexOptions
            {
                Unique = true,
                Name = "UX_MicrogridNodes_NodeId"
            });

        _nodes.Indexes.CreateOne(nodeIdIndex);
    }

    public async Task<MicrogridNode?> GetByNodeIdAsync(string nodeId)
    {
        // Find a node whose public id matches the supplied value.
        return await _nodes
            .Find(node => node.NodeId == nodeId)
            .FirstOrDefaultAsync();
    }

    public async Task<List<MicrogridNode>> GetAllAsync()
    {
        // Retrieve every microgrid node from MongoDB.
        return await _nodes
            .Find(_ => true)
            .ToListAsync();
    }

    public async Task CreateAsync(MicrogridNode node)
    {
        // Insert a new microgrid node document.
        try
        {
            await _nodes.InsertOneAsync(node);
        }
        catch (MongoWriteException ex) when (
            ex.WriteError.Category == ServerErrorCategory.DuplicateKey)
        {
            throw new InvalidOperationException("Node ID already exists.");
        }
    }

    public async Task UpdateAsync(MicrogridNode node)
    {
        // Replace the existing microgrid node document with the updated document.
        await _nodes.ReplaceOneAsync(
            existing => existing.Id == node.Id,
            node);
    }
}
