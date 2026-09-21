/*
 * File: IReservationRepository.cs
 * Project: SolarGridLK.Application
 * Description: Data-access contract for energy reservation persistence.
 */

using SolarGridLK.Domain.Entities;

namespace SolarGridLK.Application.Interfaces;

public interface IReservationRepository
{
    Task<EnergyReservation?> GetByIdAsync(string id);

    Task<EnergyReservation?> GetByQrCodeAsync(string qrCode);

    Task CreateAsync(EnergyReservation reservation);

    Task UpdateAsync(EnergyReservation reservation);
}