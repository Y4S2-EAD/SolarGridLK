/*
 * File: IReservationRepository.cs
 * Project: SolarGridLK.Application
 * Description: Defines the data access operations for energy reservations, including CRUD and status management.
 * Author: Nipuni Bandara
 */

using SolarGridLK.Domain.Entities;

namespace SolarGridLK.Application.Interfaces;

public interface IReservationRepository
{
    Task<Reservation?> GetByIdAsync(string id);

    Task<List<Reservation>> GetAllAsync();

    Task<List<Reservation>> GetByProsumerNicAsync(string prosumerNic);

    Task<Reservation?> GetByQrCodeAsync(string qrCode);

    Task<bool> HasActiveReservationsForNodeAsync (string nodeId);

    Task<List<Reservation>> GetByNodeIdAndDateAsync(string nodeId, DateTime date);

    Task CreateAsync(Reservation reservation);

    Task UpdateAsync(Reservation reservation);

    // Count reservations for a specific node and exact slot start (UTC)
    Task<int> CountReservationsForSlotAsync(string nodeId, DateTime slotStartUtc);

    // (Session-aware insert/update are implemented in the infrastructure repository when needed.)

    Task<List<Reservation>> GetByNodeIdAndDateExcludingAsync(string nodeId, DateTime date, string excludeReservationId);

}