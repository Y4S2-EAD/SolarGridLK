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

    Task<bool> HasActiveReservationForNodeAsync (string nodeId);

    Task CreateAsync(Reservation reservation);

    Task UpdateAsync(Reservation reservation);

}