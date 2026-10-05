using SolarGridLK.Application.Interfaces;

namespace SolarGridLK.Infrastructure.Security;

public class PasswordHasher : IPasswordHasher
{
    public string HashPassword(string password)
    {
        // Hash the plain-text password before storing it.
        return BCrypt.Net.BCrypt.HashPassword(password);
    }

    public bool VerifyPassword(string password, string passwordHash)
    {
        // Verify the supplied password against the stored BCrypt hash.
        return BCrypt.Net.BCrypt.Verify(password, passwordHash);
    }
}