/*
 * File: IJwtService.cs
 * Project: SolarGridLK.Application
 * Description: Defines JWT token generation operations.
 * Author: Sasin Ransara
 * Date: 2026-09-19
 */

using SolarGridLK.Domain.Entities;

namespace SolarGridLK.Application.Interfaces;

public interface IJwtService
{
    string GenerateToken(User user);

    DateTime GetExpiration();
}