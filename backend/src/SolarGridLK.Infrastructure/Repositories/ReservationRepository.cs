/*
 * File: ReservationRepository.cs
 * Project: SolarGridLK.Infrastructure
 * Description: Implements the MongoDB data access for energy reservations.
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

    public async Task<List<Reservation>> GetAllAsync()
    {
        //Retrieve every reservation from the EnergyReservations collection
        return await _reservations.Find(_ => true).ToListAsync();
    }

    public async Task<List<Reservation>> GetByProsumerNicAsync(string prosumerNic)
    {
        //Retrieve all reservations associated with a specific prosumer's NIC
        return await _reservations.Find(r => r.ProsumerNic == prosumerNic).ToListAsync();
    }

    public async Task<bool> HasActiveReservationsForNodeAsync(string nodeId)
    {
        //Check whether a node has any reservation that is not yet finished
        return await _reservations.Find(r => r.NodeId == nodeId && (r.Status == ReservationStatus.Pending || r.Status == ReservationStatus.Approved)).AnyAsync();
    }

    public async Task CreateAsync(Reservation reservation)
    {
        //Insert a new reservation into the EnergyReservations collection
        await _reservations.InsertOneAsync(reservation);
    }

    public async Task UpdateAsync(Reservation reservation)
    {
        //Replace an existing reservation document with the updated document
        await _reservations.ReplaceOneAsync(existing => existing.Id == reservation.Id, reservation);
    }
}