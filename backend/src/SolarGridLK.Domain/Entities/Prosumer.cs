using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using SolarGridLK.Domain.Enums;

namespace SolarGridLK.Domain.Entities;

public class Prosumer
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    public string Nic { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    public ProsumerStatus Status { get; set; } = ProsumerStatus.Active;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
