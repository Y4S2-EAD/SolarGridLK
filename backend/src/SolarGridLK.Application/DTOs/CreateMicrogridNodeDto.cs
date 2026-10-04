namespace SolarGridLK.Application.DTOs;

public class CreateMicrogridNodeDto
{
    public string NodeId { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public double CapacityKw { get; set; }

    public int AvailableBatterySlots { get; set; }

    public string AssignedGridOperatorId { get; set; } = string.Empty;

    public List<NodeScheduleSlotDto> Schedule { get; set; } = new();
}
