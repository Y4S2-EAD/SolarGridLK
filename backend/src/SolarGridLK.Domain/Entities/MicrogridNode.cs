using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using SolarGridLK.Domain.Enums;

namespace SolarGridLK.Domain.Entities;

public class MicrogridNode
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    public string NodeId { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public double CapacityKw { get; set; }

    public int AvailableBatterySlots { get; set; }

    public List<NodeOperatingWindow> Schedule { get; set; } = new();

    public NodeStatus Status { get; set; } = NodeStatus.Active;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime LastModifiedAt { get; set; } = DateTime.UtcNow;
}

public class NodeOperatingWindow
{
    public string DayOfWeek { get; set; } = string.Empty;

    public string StartTime { get; set; } = string.Empty;

    public string EndTime { get; set; } = string.Empty;
}
