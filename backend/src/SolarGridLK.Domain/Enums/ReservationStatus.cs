/*
 * File: ReservationStatus.cs
 * Project: SolarGridLK.Domain
 * Description: Defines the lifecycle states of an energy reservation in the SolarGridLK system.
 * Author: Nipuni Bandara
*/

namespace SolarGridLK.Domain.Enums;

public enum ReservationStatus
{
    Pending,
    Approved
    Confirmed,
    Cancelled
}