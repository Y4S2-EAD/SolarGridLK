namespace SolarGridLK.Application.DTOs;

public class UpdateUserDto
{
    public string? Password { get; set; }

    public string? Role { get; set; }

    public string? FullName { get; set; }

    public bool? IsActive { get; set; }
}