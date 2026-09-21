/*
 * File: EnergyReservation.cs
 * Project: SolarGridLK.Domain
 * Description: A prosumer's energy trading reservation slot, including its
 *              QR verification token and lifecycle status.
 */

using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using SolarGridLK.Domain.Enums;

namespace SolarGridLK.Domain.Entities;

public class EnergyReservation
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    // NIC of the prosumer who booked the slot (Prosumer primary key).
    public string ProsumerNic { get; set; } = string.Empty;

    // Identifier of the microgrid node the energy is drawn from.
    [BsonRepresentation(BsonType.ObjectId)]
    public string NodeId { get; set; } = string.Empty;

    // Scheduled date/time of the energy trading slot.
    public DateTime SlotDateTime { get; set; }

    // Current lifecycle state, stored as a readable string in Mongo.
    [BsonRepresentation(BsonType.String)]
    public ReservationStatus Status { get; set; } = ReservationStatus.Pending;

    // Cryptographic QR token, populated only after the booking is approved.
    public string QrCode { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime LastModifiedAt { get; set; } = DateTime.UtcNow;
}