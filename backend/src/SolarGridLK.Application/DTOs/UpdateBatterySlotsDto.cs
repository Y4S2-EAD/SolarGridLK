/* Description: Carries a battery-slot availability change without other node fields. */

namespace SolarGridLK.Application.DTOs;

public class UpdateBatterySlotsDto
{
    public int? AvailableBatterySlots { get; set; }
}
