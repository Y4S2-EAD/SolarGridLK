/*
 * File: ReservationStatus.cs
 * Project: SolarGridLK.Domain
 * Description: Lifecycle states for an energy reservation booking.
 * Author: Buwaneka Vishwajith
 * Date: 2026-09-21
 */

namespace SolarGridLK.Domain.Enums;

public enum ReservationStatus
{
    Pending,
    Approved,
    Completed,
    Cancelled
}