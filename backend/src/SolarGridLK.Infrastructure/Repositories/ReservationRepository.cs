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

    public async Task<List<Reservation>> GetByNodeIdAndDateAsync(string nodeId, DateTime date)
    {
        //Return every reservation for this node on the given day, for slot availability checks
        var start = date.Date;
        var end = start.AddDays(1);
        return await _reservations.Find(r => r.NodeId == nodeId && r.SlotDateTime >= start && r.SlotDateTime < end).ToListAsync();
    }

    public async Task CreateAsync(Reservation reservation)
    {
        //Insert a new reservation into the EnergyReservations collection
        await _reservations.InsertOneAsync(reservation);
    }

    internal async Task CreateAsync(global::MongoDB.Driver.IClientSessionHandle session, Reservation reservation)
    {
        await _reservations.InsertOneAsync(session, reservation);
    }

    // Count reservations for a specific node and exact slot start (UTC)
    // Count reservations for a specific node and exact slot start (UTC)
    public async Task<int> CountReservationsForSlotAsync(string nodeId, DateTime slotStartUtc)
    {
        return (int)await _reservations.CountDocumentsAsync(r => r.NodeId == nodeId && r.SlotDateTime == slotStartUtc && (r.Status == ReservationStatus.Pending || r.Status == ReservationStatus.Approved));
    }

    // Session-aware count to be used inside transactions to ensure consistent reads
    internal async Task<int> CountReservationsForSlotAsync(global::MongoDB.Driver.IClientSessionHandle session, string nodeId, DateTime slotStartUtc)
    {
        return (int)await _reservations.CountDocumentsAsync(session, r => r.NodeId == nodeId && r.SlotDateTime == slotStartUtc && (r.Status == ReservationStatus.Pending || r.Status == ReservationStatus.Approved));
    }

    // Session-aware count excluding a specific reservation id (used when updating a reservation)
    internal async Task<int> CountReservationsForSlotExcludingAsync(global::MongoDB.Driver.IClientSessionHandle session, string nodeId, DateTime slotStartUtc, string excludeReservationId)
    {
        return (int)await _reservations.CountDocumentsAsync(session, r => r.NodeId == nodeId && r.SlotDateTime == slotStartUtc && r.Id != excludeReservationId && (r.Status == ReservationStatus.Pending || r.Status == ReservationStatus.Approved));
    }

    // Atomic reservation creation using a SlotCounters collection is handled elsewhere; provide helpers as needed.

    public async Task UpdateAsync(Reservation reservation)
    {
        //Replace an existing reservation document with the updated document
        await _reservations.ReplaceOneAsync(existing => existing.Id == reservation.Id, reservation);
    }

    internal async Task UpdateAsync(global::MongoDB.Driver.IClientSessionHandle session, Reservation reservation)
    {
        await _reservations.ReplaceOneAsync(session, existing => existing.Id == reservation.Id, reservation);
    }

    public async Task<Reservation?> GetByQrCodeAsync(string qrCode)
    {
        //Find a single reservation by its QR code
        return await _reservations.Find(r => r.QrCode == qrCode).FirstOrDefaultAsync();
    }

    public async Task<List<Reservation>> GetByNodeIdAndDateExcludingAsync(string nodeId, DateTime date, string excludeReservationId)
    {
        //Return reservations for this node/day, excluding one reservation (used when checking a slot during its own update)
        var start = date.Date;
        var end = start.AddDays(1);
        return await _reservations.Find(r => r.NodeId == nodeId && r.SlotDateTime >= start && r.SlotDateTime < end && r.Id != excludeReservationId).ToListAsync();
    }



}