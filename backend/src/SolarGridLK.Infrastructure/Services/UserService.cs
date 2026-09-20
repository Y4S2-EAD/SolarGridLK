using SolarGridLK.Application.DTOs;
using SolarGridLK.Application.Interfaces;
using SolarGridLK.Domain.Entities;
using SolarGridLK.Domain.Enums;

namespace SolarGridLK.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtService _jwtService;

    public UserService(
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        IJwtService jwtService)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _jwtService = jwtService;
    }

    public async Task<LoginResponseDto?> LoginAsync(
        LoginRequestDto request)
    {
        // Authenticate the supplied username and password.
        var user = await _userRepository
            .GetByUsernameAsync(request.Username);

        if (user == null)
        {
            return null;
        }

        if (!user.IsActive)
        {
            return null;
        }

        var passwordValid = _passwordHasher
            .VerifyPassword(
                request.Password,
                user.PasswordHash);

        if (!passwordValid)
        {
            return null;
        }

        var token = _jwtService.GenerateToken(user);

        return new LoginResponseDto
        {
            Token = token,
            Username = user.Username,
            Role = user.Role.ToString(),
            FullName = user.FullName,
            ExpiresAt = _jwtService.GetExpiration()
        };
    }

    public async Task<List<UserDto>> GetAllUsersAsync()
    {
        // Retrieve all users and convert them to safe response DTOs.
        var users = await _userRepository.GetAllAsync();

        return users.Select(MapToDto).ToList();
    }

    public async Task<UserDto?> GetUserByIdAsync(string id)
    {
        // Retrieve a single user by MongoDB identifier.
        var user = await _userRepository.GetByIdAsync(id);

        return user == null ? null : MapToDto(user);
    }

    public async Task<UserDto> CreateUserAsync(
        CreateUserDto request)
    {
        // Validate and create a new system user account.
        var existingUser = await _userRepository
            .GetByUsernameAsync(request.Username);

        if (existingUser != null)
        {
            throw new InvalidOperationException(
                "Username already exists.");
        }

        if (!Enum.TryParse<UserRole>(
                request.Role,
                true,
                out var role))
        {
            throw new InvalidOperationException(
                "Invalid user role.");
        }

        var user = new User
        {
            Username = request.Username.Trim(),
            PasswordHash = _passwordHasher
                .HashPassword(request.Password),
            Role = role,
            FullName = request.FullName.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _userRepository.CreateAsync(user);

        return MapToDto(user);
    }

    public async Task<UserDto?> UpdateUserAsync(
        string id,
        UpdateUserDto request)
    {
        // Update the requested properties of an existing user.
        var user = await _userRepository.GetByIdAsync(id);

        if (user == null)
        {
            return null;
        }

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            user.PasswordHash = _passwordHasher
                .HashPassword(request.Password);
        }

        if (!string.IsNullOrWhiteSpace(request.Role))
        {
            if (!Enum.TryParse<UserRole>(
                    request.Role,
                    true,
                    out var role))
            {
                throw new InvalidOperationException(
                    "Invalid user role.");
            }

            user.Role = role;
        }

        if (!string.IsNullOrWhiteSpace(request.FullName))
        {
            user.FullName = request.FullName.Trim();
        }

        if (request.IsActive.HasValue)
        {
            user.IsActive = request.IsActive.Value;
        }

        await _userRepository.UpdateAsync(user);

        return MapToDto(user);
    }

    public async Task<bool> DeleteUserAsync(string id)
    {
        // Delete a user account by its MongoDB identifier.
        var user = await _userRepository.GetByIdAsync(id);

        if (user == null)
        {
            return false;
        }

        await _userRepository.DeleteAsync(id);

        return true;
    }

    private static UserDto MapToDto(User user)
    {
        // Convert a User entity into a client-safe DTO.
        return new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            Role = user.Role.ToString(),
            FullName = user.FullName,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };
    }
}