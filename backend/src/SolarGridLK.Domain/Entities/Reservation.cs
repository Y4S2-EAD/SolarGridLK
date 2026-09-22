using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using SolarGridLK.Domain.Enums;

namespace SolarGridLK.Domain.Entities;

public class Reservation
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;
    public string ProcumerNic { get; set; } = string.Empty;
    public DateTime NodeId { get; set; } = string.Empty;
    public DateTime SlotDateTime { get; set; }
    public ReservationStatus Status { get; set; } = ReservationStatus.Pending;
    public string? QrCode { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastModifiedAt { get; set; } = DateTime.UtcNow;
}