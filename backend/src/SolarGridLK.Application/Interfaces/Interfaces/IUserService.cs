/*
 * File: IUserService.cs
 * Project: SolarGridLK.Application
 * Description: Defines business operations for user authentication and management.
 * Author: Sasin Ransara
 * Date: 2026-09-19
 */

using SolarGridLK.Application.DTOs;

namespace SolarGridLK.Application.Interfaces;

public interface IUserService
{
    Task<LoginResponseDto?> LoginAsync(LoginRequestDto request);

    Task<List<UserDto>> GetAllUsersAsync();

    Task<UserDto?> GetUserByIdAsync(string id);

    Task<UserDto> CreateUserAsync(CreateUserDto request);

    Task<UserDto?> UpdateUserAsync(
        string id,
        UpdateUserDto request);

    Task<bool> DeleteUserAsync(string id);
}