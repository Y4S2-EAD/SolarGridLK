/*
 * File: SlotCounterRepository.cs
 * Project: SolarGridLK.Infrastructure
 * Description: Implements MongoDB data access for the EnergyBookingSlots collection, which tracks how many reservations are held against each node time slot.
 * Author: Nipuni Bandara
 */

using MongoDB.Bson;
using MongoDB.Driver;
using SolarGridLK.Infrastructure.MongoDB;

namespace SolarGridLK.Infrastructure.Repositories;

public class SlotCounterRepository
{
    private readonly IMongoCollection<BsonDocument> _collection;

    public SlotCounterRepository(MongoDbContext context)
    {
        // Bind to the EnergyBookingSlots collection for this repository's lifetime
        _collection = context.GetCollection<BsonDocument>(MongoCollectionNames.EnergyBookingSlots);
    }

    public async Task<bool> TryReserveAsync(IClientSessionHandle session, string nodeId, DateTime slotStartUtc, int capacity)
    {
        // Atomically add one to this slot's counter (creating it on first use);
        // if that pushes it past capacity, undo the increment and report failure
        var filter = Builders<BsonDocument>.Filter.And(
            Builders<BsonDocument>.Filter.Eq("NodeId", nodeId),
            Builders<BsonDocument>.Filter.Eq("SlotStartUtc", slotStartUtc)
        );

        // NodeId and SlotStartUtc are filled in automatically from the filter when the document is created
        var update = Builders<BsonDocument>.Update
            .Inc("ReservedCount", 1)
            .Set("TotalCapacity", capacity);

        var options = new FindOneAndUpdateOptions<BsonDocument>
        {
            IsUpsert = true,
            ReturnDocument = ReturnDocument.After
        };

        var updated = await _collection.FindOneAndUpdateAsync(session, filter, update, options);

        if (updated == null) return false;

        var reserved = updated.GetValue("ReservedCount", 0).ToInt32();

        if (reserved > capacity)
        {
            // Over capacity: undo the increment inside the same session
            await _collection.UpdateOneAsync(
                session,
                Builders<BsonDocument>.Filter.Eq("_id", updated.GetValue("_id")),
                Builders<BsonDocument>.Update.Inc("ReservedCount", -1));
            return false;
        }

        return true;
    }

    public async Task DecrementAsync(IClientSessionHandle session, string nodeId, DateTime slotStartUtc)
    {
        // Free one reservation from this slot's counter, never letting it drop below zero
        var filter = Builders<BsonDocument>.Filter.And(
            Builders<BsonDocument>.Filter.Eq("NodeId", nodeId),
            Builders<BsonDocument>.Filter.Eq("SlotStartUtc", slotStartUtc),
            Builders<BsonDocument>.Filter.Gt("ReservedCount", 0)
        );

        await _collection.UpdateOneAsync(session, filter, Builders<BsonDocument>.Update.Inc("ReservedCount", -1));
    }

    public async Task<Dictionary<DateTime, int>> GetReservedCountsAsync(string nodeId)
    {
        // Return the reserved count for every slot of a node, keyed by slot start time (UTC)
        var filter = Builders<BsonDocument>.Filter.Eq("NodeId", nodeId);
        var documents = await _collection.Find(filter).ToListAsync();

        var reservedCounts = new Dictionary<DateTime, int>();
        foreach (var doc in documents)
        {
            var slotStartUtc = doc.GetValue("SlotStartUtc").ToUniversalTime();
            reservedCounts[slotStartUtc] = doc.GetValue("ReservedCount", 0).ToInt32();
        }

        return reservedCounts;
    }
}