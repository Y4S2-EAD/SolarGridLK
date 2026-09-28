using MongoDB.Driver;
using SolarGridLK.Application.Interfaces;
using SolarGridLK.Domain.Entities;
using SolarGridLK.Infrastructure.MongoDB;

namespace SolarGridLK.Infrastructure.Repositories;

public class ProsumerRepository : IProsumerRepository
{
    private readonly IMongoCollection<Prosumer> _prosumers;

    public ProsumerRepository(MongoDbContext mongoDbContext)
    {
        // Bind this repository to the shared Prosumers collection.
        _prosumers = mongoDbContext.GetCollection<Prosumer>(
            MongoCollectionNames.Prosumers);

        // Keep NIC unique even when two registrations arrive together.
        var nicIndex = new CreateIndexModel<Prosumer>(
            Builders<Prosumer>.IndexKeys.Ascending(prosumer => prosumer.Nic),
            new CreateIndexOptions
            {
                Unique = true,
                Name = "UX_Prosumers_Nic"
            });

        _prosumers.Indexes.CreateOne(nicIndex);
    }

    public async Task<Prosumer?> GetByNicAsync(string nic)
    {
        // Find a prosumer whose NIC primary key matches the supplied value.
        return await _prosumers
            .Find(prosumer => prosumer.Nic == nic)
            .FirstOrDefaultAsync();
    }

    public async Task CreateAsync(Prosumer prosumer)
    {
        // Insert a new prosumer document into the Prosumers collection.
        try
        {
            await _prosumers.InsertOneAsync(prosumer);
        }
        catch (MongoWriteException ex) when (
            ex.WriteError.Category == ServerErrorCategory.DuplicateKey)
        {
            throw new InvalidOperationException("NIC already exists.");
        }
    }

    public async Task UpdateAsync(Prosumer prosumer)
    {
        // Replace the existing prosumer document with the updated document.
        await _prosumers.ReplaceOneAsync(
            existing => existing.Id == prosumer.Id,
            prosumer);
    }
}
