namespace SolarGridLK.Application.DTOs;

public class UpdateMicrogridNodeDto
{
    public string? Name { get; set; }

    public string? Location { get; set; }

    public double? Latitude { get; set; }

    public double? Longitude { get; set; }

    public double? CapacityKw { get; set; }

    public int? AvailableBatterySlots { get; set; }

    public string? AssignedGridOperatorId { get; set; }
}
