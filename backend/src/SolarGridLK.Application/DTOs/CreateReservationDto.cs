namespace SolarGridLK.Application.DTOs;

public class CreateReservationDto
{
    public string ProsumerNic { get; set; } = string.Empty;
    public string NodeId { get; set; } = string.Empty;
    public DateTime SlotDateTime { get; set; }
}