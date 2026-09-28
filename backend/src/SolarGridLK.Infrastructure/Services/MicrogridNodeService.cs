/*Description: Implements microgrid node creation, updates, schedules, and deactivation.*/

using System.Globalization;
using SolarGridLK.Application.DTOs;
using SolarGridLK.Application.Interfaces;
using SolarGridLK.Domain.Entities;
using SolarGridLK.Domain.Enums;

namespace SolarGridLK.Infrastructure.Services;

public class MicrogridNodeService : IMicrogridNodeService
{
    private static readonly string[] DaysOfWeek =
    {
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
    };

    private readonly IMicrogridNodeRepository _nodeRepository;
    private readonly IReservationRepository _reservationRepository;

    public MicrogridNodeService(
        IMicrogridNodeRepository nodeRepository,
        IReservationRepository reservationRepository)
    {
        // Store the node repository and the existing reservation lookup.
        _nodeRepository = nodeRepository;
        _reservationRepository = reservationRepository;
    }

    public async Task<MicrogridNodeDto> CreateAsync(CreateMicrogridNodeDto request)
    {
        // Validate a new node and reject a duplicate public node id.
        var nodeId = NormalizeNodeId(request.NodeId);

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new InvalidOperationException("Node name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Location))
        {
            throw new InvalidOperationException("Location is required.");
        }

        ValidateCoordinates(request.Latitude, request.Longitude);
        ValidateCapacity(request.CapacityKw);
        ValidateBatterySlots(request.AvailableBatterySlots);

        var schedule = ValidateSchedule(request.Schedule);

        var existing = await _nodeRepository.GetByNodeIdAsync(nodeId);

        if (existing != null)
        {
            throw new InvalidOperationException("Node ID already exists.");
        }

        var now = DateTime.UtcNow;
        var node = new MicrogridNode
        {
            NodeId = nodeId,
            Name = request.Name.Trim(),
            Location = request.Location.Trim(),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            CapacityKw = request.CapacityKw,
            AvailableBatterySlots = request.AvailableBatterySlots,
            Schedule = schedule,
            Status = NodeStatus.Active,
            CreatedAt = now,
            LastModifiedAt = now
        };

        await _nodeRepository.CreateAsync(node);

        return MapToDto(node);
    }

    public async Task<List<MicrogridNodeDto>> GetAllAsync()
    {
        // Return every microgrid node as a client-safe DTO.
        var nodes = await _nodeRepository.GetAllAsync();

        return nodes.Select(MapToDto).ToList();
    }

    public async Task<MicrogridNodeDto?> GetByNodeIdAsync(string nodeId)
    {
        // Return one node, or null when the public node id does not exist.
        var node = await _nodeRepository.GetByNodeIdAsync(
            NormalizeNodeId(nodeId));

        return node == null ? null : MapToDto(node);
    }

    public async Task<MicrogridNodeDto?> UpdateAsync(
        string nodeId,
        UpdateMicrogridNodeDto request)
    {
        // Update permitted node fields and leave the public node id unchanged.
        var node = await _nodeRepository.GetByNodeIdAsync(
            NormalizeNodeId(nodeId));

        if (node == null)
        {
            return null;
        }

        if (node.Status == NodeStatus.Deactivated)
        {
            throw new InvalidOperationException(
                "Cannot update a deactivated node.");
        }

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            node.Name = request.Name.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.Location))
        {
            node.Location = request.Location.Trim();
        }

        if (request.Latitude.HasValue || request.Longitude.HasValue)
        {
            var latitude = request.Latitude ?? node.Latitude;
            var longitude = request.Longitude ?? node.Longitude;
            ValidateCoordinates(latitude, longitude);
            node.Latitude = latitude;
            node.Longitude = longitude;
        }

        if (request.CapacityKw.HasValue)
        {
            ValidateCapacity(request.CapacityKw.Value);
            node.CapacityKw = request.CapacityKw.Value;
        }

        if (request.AvailableBatterySlots.HasValue)
        {
            ValidateBatterySlots(request.AvailableBatterySlots.Value);
            node.AvailableBatterySlots = request.AvailableBatterySlots.Value;
        }

        node.LastModifiedAt = DateTime.UtcNow;

        await _nodeRepository.UpdateAsync(node);

        return MapToDto(node);
    }

    public async Task<MicrogridNodeDto?> UpdateScheduleAsync(
        string nodeId,
        UpdateNodeScheduleDto request)
    {
        // Replace the operating schedule of an active node.
        var node = await _nodeRepository.GetByNodeIdAsync(
            NormalizeNodeId(nodeId));

        if (node == null)
        {
            return null;
        }

        if (node.Status == NodeStatus.Deactivated)
        {
            throw new InvalidOperationException(
                "Cannot update a deactivated node.");
        }

        node.Schedule = ValidateSchedule(request.Schedule);
        node.LastModifiedAt = DateTime.UtcNow;

        await _nodeRepository.UpdateAsync(node);

        return MapToDto(node);
    }

    public async Task<MicrogridNodeDto?> DeactivateAsync(string nodeId)
    {
        // Deactivate a node only when it has no pending or approved reservations.
        var node = await _nodeRepository.GetByNodeIdAsync(
            NormalizeNodeId(nodeId));

        if (node == null)
        {
            return null;
        }

        if (node.Status == NodeStatus.Deactivated)
        {
            throw new InvalidOperationException(
                "Node is already deactivated.");
        }

        var hasActiveReservations = await _reservationRepository
            .HasActiveReservationsForNodeAsync(node.NodeId);

        if (hasActiveReservations)
        {
            throw new InvalidOperationException(
                "Cannot deactivate a node that has active reservations.");
        }

        node.Status = NodeStatus.Deactivated;
        node.LastModifiedAt = DateTime.UtcNow;

        await _nodeRepository.UpdateAsync(node);

        return MapToDto(node);
    }

    private static string NormalizeNodeId(string? nodeId)
    {
        // Reject a missing node id and keep the exact text reservations already store.
        if (string.IsNullOrWhiteSpace(nodeId))
        {
            throw new InvalidOperationException("Node ID is required.");
        }

        var normalized = nodeId.Trim();

        if (normalized.Any(char.IsWhiteSpace) ||
            normalized.Contains('/') ||
            normalized.Contains('\\'))
        {
            throw new InvalidOperationException(
                "Node ID cannot contain spaces or slashes.");
        }

        return normalized;
    }

    private static void ValidateCoordinates(double latitude, double longitude)
    {
        // Reject coordinates outside the valid GPS ranges.
        if (latitude < -90 || latitude > 90)
        {
            throw new InvalidOperationException(
                "Latitude must be between -90 and 90.");
        }

        if (longitude < -180 || longitude > 180)
        {
            throw new InvalidOperationException(
                "Longitude must be between -180 and 180.");
        }
    }

    private static void ValidateCapacity(double capacityKw)
    {
        // Reject a capacity that is not a positive number of kilowatts.
        if (capacityKw <= 0)
        {
            throw new InvalidOperationException(
                "Capacity must be greater than zero.");
        }
    }

    private static void ValidateBatterySlots(int availableBatterySlots)
    {
        // Reject a negative battery slot count.
        if (availableBatterySlots < 0)
        {
            throw new InvalidOperationException(
                "Available battery slots cannot be negative.");
        }
    }

    private static List<NodeOperatingWindow> ValidateSchedule(
        List<NodeScheduleSlotDto>? schedule)
    {
        // Accept one operating window per day, with a start time before the end time.
        if (schedule == null)
        {
            throw new InvalidOperationException("Schedule is required.");
        }

        var seenDays = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var windows = new List<NodeOperatingWindow>();

        foreach (var slot in schedule)
        {
            var day = DaysOfWeek.FirstOrDefault(name =>
                name.Equals(slot.DayOfWeek?.Trim(), StringComparison.OrdinalIgnoreCase));

            if (day == null)
            {
                throw new InvalidOperationException(
                    "Schedule day must be a valid day of the week.");
            }

            if (!seenDays.Add(day))
            {
                throw new InvalidOperationException(
                    "Schedule cannot contain the same day more than once.");
            }

            if (!TryParseTime(slot.StartTime, out var start) ||
                !TryParseTime(slot.EndTime, out var end))
            {
                throw new InvalidOperationException(
                    "Schedule times must use HH:mm.");
            }

            if (start >= end)
            {
                throw new InvalidOperationException(
                    "Schedule start time must be before end time.");
            }

            windows.Add(new NodeOperatingWindow
            {
                DayOfWeek = day,
                StartTime = start.ToString(@"hh\:mm", CultureInfo.InvariantCulture),
                EndTime = end.ToString(@"hh\:mm", CultureInfo.InvariantCulture)
            });
        }

        return windows;
    }

    private static bool TryParseTime(string? value, out TimeSpan time)
    {
        // Parse a 24-hour HH:mm clock time.
        return TimeSpan.TryParseExact(
            value?.Trim(),
            @"hh\:mm",
            CultureInfo.InvariantCulture,
            out time);
    }

    private static MicrogridNodeDto MapToDto(MicrogridNode node)
    {
        // Convert a microgrid node entity into a client-safe DTO.
        return new MicrogridNodeDto
        {
            NodeId = node.NodeId,
            Name = node.Name,
            Location = node.Location,
            Latitude = node.Latitude,
            Longitude = node.Longitude,
            CapacityKw = node.CapacityKw,
            AvailableBatterySlots = node.AvailableBatterySlots,
            Schedule = node.Schedule.Select(window => new NodeScheduleSlotDto
            {
                DayOfWeek = window.DayOfWeek,
                StartTime = window.StartTime,
                EndTime = window.EndTime
            }).ToList(),
            Status = node.Status.ToString(),
            CreatedAt = node.CreatedAt,
            LastModifiedAt = node.LastModifiedAt
        };
    }
}
