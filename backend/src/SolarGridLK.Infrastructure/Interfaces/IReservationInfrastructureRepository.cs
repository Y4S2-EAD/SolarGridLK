using System.Threading.Tasks;

namespace SolarGridLK.Infrastructure.Interfaces
{
    // Infrastructure-only reservation repository exposing session-aware operations
    public interface IReservationInfrastructureRepository
    {
        Task<int> CountReservationsForSlotAsync(global::MongoDB.Driver.IClientSessionHandle session, string nodeId, DateTime slotStartUtc);
        Task<int> CountReservationsForSlotExcludingAsync(global::MongoDB.Driver.IClientSessionHandle session, string nodeId, DateTime slotStartUtc, string excludeReservationId);
        Task CreateAsync(global::MongoDB.Driver.IClientSessionHandle session, SolarGridLK.Domain.Entities.Reservation reservation);
        Task UpdateAsync(global::MongoDB.Driver.IClientSessionHandle session, SolarGridLK.Domain.Entities.Reservation reservation);
    }
}