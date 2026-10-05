using MongoDB.Driver;
using MongoDB.Bson;

namespace SolarGridLK.Infrastructure.MongoDB;

public class MongoDbContext
{
    private readonly IMongoDatabase _database;

    public MongoDbContext(MongoDbSettings settings)
    {
        var client = new MongoClient(settings.ConnectionString);

        _database = client.GetDatabase(settings.DatabaseName);
    }

    public IMongoDatabase Database => _database;

    public IMongoCollection<T> GetCollection<T>(string name)
    {
        // Ensure known indexes are created when first requesting certain collections
        var collection = _database.GetCollection<T>(name);

        if (name == MongoCollectionNames.EnergyReservations)
        {
            // Create indexes used by reservations: NodeId + SlotDateTime for fast lookup
            var indexKeys = Builders<BsonDocument>.IndexKeys
                .Ascending("NodeId")
                .Ascending("SlotDateTime");

            var indexModel = new CreateIndexModel<BsonDocument>(indexKeys);
            _database.GetCollection<BsonDocument>(name).Indexes.CreateOne(indexModel);
        }

        if (name == MongoCollectionNames.SlotCounters)
        {
            // Ensure unique slot counter index on NodeId + SlotStartUtc
            var indexKeys = Builders<BsonDocument>.IndexKeys
                .Ascending("NodeId")
                .Ascending("SlotStartUtc");

            var indexModel = new CreateIndexModel<BsonDocument>(indexKeys, new CreateIndexOptions { Unique = true });
            _database.GetCollection<BsonDocument>(name).Indexes.CreateOne(indexModel);
        }

        return collection;
    }
}