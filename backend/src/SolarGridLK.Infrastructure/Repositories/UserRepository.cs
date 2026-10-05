using MongoDB.Driver;
using SolarGridLK.Application.Interfaces;
using SolarGridLK.Domain.Entities;
using SolarGridLK.Infrastructure.MongoDB;

namespace SolarGridLK.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly IMongoCollection<User> _users;

    public UserRepository(MongoDbContext mongoDbContext)
    {
        _users = mongoDbContext.GetCollection<User>(
            MongoCollectionNames.Users);
    }

    public async Task<User?> GetByUsernameAsync(string username)
    {
        // Find a user by their unique username.
        return await _users
            .Find(user => user.Username == username)
            .FirstOrDefaultAsync();
    }

    public async Task<User?> GetByIdAsync(string id)
    {
        // Find a user by their MongoDB identifier.
        return await _users
            .Find(user => user.Id == id)
            .FirstOrDefaultAsync();
    }

    public async Task<List<User>> GetAllAsync()
    {
        // Retrieve all user accounts from MongoDB.
        return await _users
            .Find(_ => true)
            .ToListAsync();
    }

    public async Task CreateAsync(User user)
    {
        // Insert a new user account into MongoDB.
        await _users.InsertOneAsync(user);
    }

    public async Task UpdateAsync(User user)
    {
        // Replace the existing user document with the updated document.
        await _users.ReplaceOneAsync(
            existingUser => existingUser.Id == user.Id,
            user);
    }

    public async Task DeleteAsync(string id)
    {
        // Delete a user account using its MongoDB identifier.
        await _users.DeleteOneAsync(
            user => user.Id == id);
    }
}