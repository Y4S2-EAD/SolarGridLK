namespace SolarGridLK.Application.DTOs;

public class ReservationDto
{
    public string Id { get; set; } = string.Empty;
    public string ProsumerNic { get; set; } = string.Empty;
    public string NodeId { get; set; } = string.Empty;
    public DateTime SlotDateTime { get; set; }
    public string Status { get; set; } = string.Empty;
    public string QrCode { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastModifiedAt { get; set; }
}