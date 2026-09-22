/*
 * File: IReservationService.cs
 * Project: SolarGridLK.Application
 * Description: Defines the business logic operations for managing energy reservations.
 * Author: Nipuni Bandara
 */

using SolarGridLK.Application.DTOs;

namespace SolarGridLK.Application.Interfaces;

public interface IReservationService
{
    Task<ReservationDto> CreateReservationAsync(CreateReservationDto request);

    Task<List<ReservationDto>> GetReservationAsync(
        string? prosumerNic,
        string? status,
        string? search);

    Task<ReservationDto?> GetReservationByIdAsync(string id);

    Task<ReservationDto?> UpdateReservationAsync(
        string id,
        UpdateReservationDto request);

    Task<ReservationDto?> CancelReservationAsync(string id);

    Task<ReservationDto?> ApproveReservationAsync(
        string id,
        string qrCode);

    Task<DashboardSummaryDto> GetDashboardSummaryAsync(string prosumerNic);
}