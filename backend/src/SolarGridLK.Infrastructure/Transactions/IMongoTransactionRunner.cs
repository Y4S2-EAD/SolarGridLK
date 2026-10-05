using System.Threading.Tasks;

namespace SolarGridLK.Infrastructure.Transactions
{
    // Infrastructure-only transaction runner to encapsulate MongoDB sessions and transactions
    public interface IMongoTransactionRunner
    {
        // Runs the provided function inside a MongoDB transaction and returns its result.
        Task<T> RunInTransactionAsync<T>(Func<global::MongoDB.Driver.IClientSessionHandle, Task<T>> operation);
    }
}