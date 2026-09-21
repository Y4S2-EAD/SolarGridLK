/*
 * File: ReservationRepository.cs
 * Project: SolarGridLK.Infrastructure
 * Description: MongoDB persistence for energy reservations.
 */

using MongoDB.Driver;
using SolarGridLK.Application.Interfaces;
using SolarGridLK.Domain.Entities;
using SolarGridLK.Infrastructure.MongoDB;

namespace SolarGridLK.Infrastructure.Repositories;

public class ReservationRepository : IReservationRepository
{
    private readonly IMongoCollection<EnergyReservation> _reservations;

    public ReservationRepository(MongoDbContext mongoDbContext)
    {
        _reservations = mongoDbContext.GetCollection<EnergyReservation>(
            MongoCollectionNames.EnergyReservations);
    }

    public async Task<EnergyReservation?> GetByIdAsync(string id)
    {
        // Find a single reservation by its MongoDB identifier.
        return await _reservations
            .Find(reservation => reservation.Id == id)
            .FirstOrDefaultAsync();
    }

    public async Task<EnergyReservation?> GetByQrCodeAsync(string qrCode)
    {
        // Find the reservation that owns the supplied QR token.
        return await _reservations
            .Find(reservation => reservation.QrCode == qrCode)
            .FirstOrDefaultAsync();
    }

    public async Task CreateAsync(EnergyReservation reservation)
    {
        // Insert a new reservation document.
        await _reservations.InsertOneAsync(reservation);
    }

    public async Task UpdateAsync(EnergyReservation reservation)
    {
        // Replace the stored reservation with the updated document.
        await _reservations.ReplaceOneAsync(
            existing => existing.Id == reservation.Id,
            reservation);
    }
}