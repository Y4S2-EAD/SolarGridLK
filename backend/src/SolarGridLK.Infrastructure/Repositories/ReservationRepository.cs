/*
 * File: ReservationRepository.cs
 * Project: SolarGridLK.Infrastructure
 * Description: Implements the MongoDB data access for energy reservatios.
 * Author: Nipuni Bandara
 */

using MongoDB.Driver;
using SolarGridLK.Application.Interfaces;
using SolarGridLK.Domain.Entities;
using SolarGridLK.Domain.Enums;
using SolarGridLK.Infrastructure.MongoDB;

namespace SolarGridLK.Infrastructure.Repositories;

public class ReservationRepository : IReservationRepository
{
    private readonly IMongoCollection<Reservation> _reservations;

    public ReservationRepository(MongoDbContext mongoDBContext)
    {
        //Bind to the EnergyReservations collection for this repository's lifetime
        _reservations = mongoDBContext.GetCollection<Reservation>(MongoCollectionNames.EnergyReservations);
    }

    public async Task<Reservation?> GetByIdAsync(string id)
    {
        //Find a single reservation by its MongoDB identifier
        return await _reservations.Find(r => r.Id == id).FirstOrDefaultAsync();
    }
    public async Task<IEnumerable<Reservation>> GetAllAsync()
    {
        //Retrieve every reservation from the EnergyReservations collection
        return await _reservations.Find(_ => true).ToListAsync();
    }

    public asyncTask<List<Reservation>> GetByProcumerNicAsync(string procumerNic)
    {
        //Retrieve all reservations associated with a specific procumer's NIC
        return await _reservations.Find(r => r.ProcumerNic == procumerNic).ToListAsync();
    }

    public async Task<bool> HasActiveReservationsForNodeAsync(string nodeId)
    {
        //Check if there are any active reservations for a specific node
        return await _reservations.Find(r => r.NodeId == nodeId && (r.Status == ReservationStatus.Pending || r.Status == ReservationStatus.Approved)).AnyAsync();
    }

    public async Task<Reservation> CreateAsync(Reservation reservation)
    {
        //Insert a new reservation into the EnergyReservations collection
        await _reservations.InsertOneAsync(reservation);
        return reservation;
    }

    public async Task UpdateAsync(Reservation reservation)
    {
        //Replace an existing reservation document with the updated document
        await _reservations.ReplaceOneAsync(existing => existing.Id == reservation.Id, reservation);
    }
}