using System.Threading.Tasks;
using global::MongoDB.Driver;

namespace SolarGridLK.Infrastructure.Transactions
{
    public class MongoTransactionRunner : IMongoTransactionRunner
    {
        private readonly IMongoClient _client;

        public MongoTransactionRunner(IMongoClient client)
        {
            _client = client;
        }

        public async Task<T> RunInTransactionAsync<T>(Func<IClientSessionHandle, Task<T>> operation)
        {
            using var session = await _client.StartSessionAsync();
            // Basic transaction options; could be extended for retry
            var options = new TransactionOptions(readConcern: ReadConcern.Local, writeConcern: WriteConcern.WMajority);
            return await session.WithTransactionAsync(async (s, ct) => await operation(s), options);
        }
    }
}
