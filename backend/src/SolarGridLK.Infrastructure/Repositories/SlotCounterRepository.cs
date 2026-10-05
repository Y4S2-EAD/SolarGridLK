using MongoDB.Bson;
using MongoDB.Driver;
using SolarGridLK.Infrastructure.MongoDB;

namespace SolarGridLK.Infrastructure.Repositories;

public class SlotCounterRepository
{
    private readonly IMongoCollection<BsonDocument> _collection;

    public SlotCounterRepository(MongoDbContext context)
    {
        _collection = context.GetCollection<BsonDocument>(MongoCollectionNames.SlotCounters);
    }

    // Try incrementing the reserved count for a slot if capacity allows. Returns true when incremented.
    public async Task<bool> TryReserveAsync(string nodeId, DateTime slotStartUtc, int capacity)
    {
        var filter = Builders<BsonDocument>.Filter.And(
            Builders<BsonDocument>.Filter.Eq("NodeId", nodeId),
            Builders<BsonDocument>.Filter.Eq("SlotStartUtc", slotStartUtc)
        );

        var update = Builders<BsonDocument>.Update.Inc("ReservedCount", 1)
            .SetOnInsert("TotalCapacity", capacity)
            .SetOnInsert("NodeId", nodeId)
            .SetOnInsert("SlotStartUtc", slotStartUtc);

        // Conditional update: only succeed when ReservedCount < TotalCapacity or document doesn't exist
        var options = new FindOneAndUpdateOptions<BsonDocument>
        {
            IsUpsert = true,
            ReturnDocument = ReturnDocument.After
        };

        var updated = await _collection.FindOneAndUpdateAsync(filter, update, options);

        if (updated == null) return false;

        var reserved = updated.GetValue("ReservedCount", 0).ToInt32();
        var total = updated.GetValue("TotalCapacity", capacity).ToInt32();

        if (reserved > total)
        {
            // Roll back the increment
            await _collection.UpdateOneAsync(Builders<BsonDocument>.Filter.Eq("_id", updated.GetValue("_id")), Builders<BsonDocument>.Update.Inc("ReservedCount", -1));
            return false;
        }

        return true;
    }

    public async Task DecrementAsync(string nodeId, DateTime slotStartUtc)
    {
        var filter = Builders<BsonDocument>.Filter.And(
            Builders<BsonDocument>.Filter.Eq("NodeId", nodeId),
            Builders<BsonDocument>.Filter.Eq("SlotStartUtc", slotStartUtc)
        );

        await _collection.UpdateOneAsync(filter, Builders<BsonDocument>.Update.Inc("ReservedCount", -1));
    }
}
