using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using SolarGridLK.Application.Interfaces;
using SolarGridLK.Domain.Entities;

namespace SolarGridLK.Infrastructure.Security;

public class JwtService : IJwtService
{
    private readonly JwtSettings _jwtSettings;

    public JwtService(JwtSettings jwtSettings)
    {
        _jwtSettings = jwtSettings;
    }

    public string GenerateToken(User user)
    {
        // Create the claims that identify the authenticated staff user.
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(JwtRegisteredClaimNames.UniqueName, user.Username),
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.Role, user.Role.ToString()),
            new("fullName", user.FullName)
        };

        return CreateToken(claims);
    }

    public string GenerateProsumerToken(Prosumer prosumer)
    {
        // Create Prosumer claims without using the staff UserRole enum.
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, prosumer.Id),
            new(JwtRegisteredClaimNames.UniqueName, prosumer.Nic),
            new(ClaimTypes.Name, prosumer.Nic),
            new(ClaimTypes.Role, "Prosumer"),
            new("fullName", prosumer.FullName),
            new("nic", prosumer.Nic)
        };

        return CreateToken(claims);
    }

    private string CreateToken(IEnumerable<Claim> claims)
    {
        // Sign a JWT with the shared issuer, audience, key, and lifetime.
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_jwtSettings.Key));

        var credentials = new SigningCredentials(
            key,
            SecurityAlgorithms.HmacSha256);

        var expiration = DateTime.UtcNow.AddMinutes(
            _jwtSettings.ExpirationMinutes);

        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            expires: expiration,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler()
            .WriteToken(token);
    }

    public DateTime GetExpiration()
    {
        // Calculate the expiration time for a newly issued JWT.
        return DateTime.UtcNow.AddMinutes(
            _jwtSettings.ExpirationMinutes);
    }
}