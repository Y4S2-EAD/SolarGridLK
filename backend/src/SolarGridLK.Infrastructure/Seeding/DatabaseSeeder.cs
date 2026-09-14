/*
 * File: DatabaseSeeder.cs
 * Project: SolarGridLK.Infrastructure
 * Description: Seeds initial system users into MongoDB.
 * Author: Sasin Ransara
 * Date: 2026-09-20
 */

using MongoDB.Driver;
using SolarGridLK.Application.Interfaces;
using SolarGridLK.Domain.Entities;
using SolarGridLK.Domain.Enums;
using SolarGridLK.Infrastructure.MongoDB;

namespace SolarGridLK.Infrastructure.Seeding;

public class DatabaseSeeder
{
    private readonly MongoDbContext _mongoDbContext;
    private readonly IPasswordHasher _passwordHasher;

    public DatabaseSeeder(
        MongoDbContext mongoDbContext,
        IPasswordHasher passwordHasher)
    {
        _mongoDbContext = mongoDbContext;
        _passwordHasher = passwordHasher;
    }

    public async Task SeedAsync()
    {
        // Create the Users collection reference.
        var users = _mongoDbContext.GetCollection<User>(
            MongoCollectionNames.Users);

        await SeedBackofficeUserAsync(users);

        await SeedGridOperatorUserAsync(users);
    }

    private async Task SeedBackofficeUserAsync(
        IMongoCollection<User> users)
    {
        // Create the initial Backoffice account if it does not exist.
        var existingUser = await users
            .Find(user => user.Username == "admin")
            .FirstOrDefaultAsync();

        if (existingUser != null)
        {
            return;
        }

        var adminUser = new User
        {
            Username = "admin",
            PasswordHash = _passwordHasher
                .HashPassword("Admin@12345"),
            Role = UserRole.Backoffice,
            FullName = "System Administrator",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await users.InsertOneAsync(adminUser);
    }

    private async Task SeedGridOperatorUserAsync(
        IMongoCollection<User> users)
    {
        // Create the initial Grid Operator account if it does not exist.
        var existingUser = await users
            .Find(user => user.Username == "operator")
            .FirstOrDefaultAsync();

        if (existingUser != null)
        {
            return;
        }

        var operatorUser = new User
        {
            Username = "operator",
            PasswordHash = _passwordHasher
                .HashPassword("Operator@12345"),
            Role = UserRole.GridOperator,
            FullName = "Grid Operator",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await users.InsertOneAsync(operatorUser);
    }
}