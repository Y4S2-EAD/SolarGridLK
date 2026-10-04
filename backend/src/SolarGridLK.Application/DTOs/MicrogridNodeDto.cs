namespace SolarGridLK.Application.DTOs;

public class MicrogridNodeDto
{
    public string NodeId { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public double CapacityKw { get; set; }

    public int AvailableBatterySlots { get; set; }

    public List<NodeScheduleSlotDto> Schedule { get; set; } = new();

    public string Status { get; set; } = string.Empty;

    public string? AssignedGridOperatorId { get; set; }

    public string? AssignedGridOperatorName { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime LastModifiedAt { get; set; }
}
