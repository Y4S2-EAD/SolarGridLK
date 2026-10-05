namespace SolarGridLK.Application.DTOs;

public class UpdateNodeScheduleDto
{
    public List<NodeScheduleSlotDto> Schedule { get; set; } = new();
}
