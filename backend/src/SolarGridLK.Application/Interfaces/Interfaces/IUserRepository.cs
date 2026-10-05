using SolarGridLK.Domain.Entities;

namespace SolarGridLK.Application.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByUsernameAsync(string username);

    Task<User?> GetByIdAsync(string id);

    Task<List<User>> GetAllAsync();

    Task CreateAsync(User user);

    Task UpdateAsync(User user);

    Task DeleteAsync(string id);
}