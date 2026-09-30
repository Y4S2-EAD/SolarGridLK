/*Description: Implements microgrid node creation, updates, schedules, deactivation, battery-slot availability, and Grid Operator assignment.*/

using System.Globalization;
using MongoDB.Bson;
using SolarGridLK.Application.DTOs;
using SolarGridLK.Application.Interfaces;
using SolarGridLK.Domain.Entities;
using SolarGridLK.Domain.Enums;
using SolarGridLK.Infrastructure.Repositories;

namespace SolarGridLK.Infrastructure.Services;

public class MicrogridNodeService : IMicrogridNodeService
{
    public const string GridOperatorNotFoundMessage = "Grid Operator not found.";

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
    private readonly IUserRepository _userRepository;
    private readonly SlotCounterRepository _slotCounterRepository;

    public MicrogridNodeService(
        IMicrogridNodeRepository nodeRepository,
        IReservationRepository reservationRepository,
        IUserRepository userRepository,
        SlotCounterRepository slotCounterRepository)
    {
        // Store the node repository, the reservation lookup, staff user lookup, and the slot counter store.
        _nodeRepository = nodeRepository;
        _reservationRepository = reservationRepository;
        _userRepository = userRepository;
        _slotCounterRepository = slotCounterRepository;
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

        var assignedGridOperatorId = await ResolveGridOperatorIdAsync(
            request.AssignedGridOperatorId,
            required: true);

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
            AssignedGridOperatorId = assignedGridOperatorId,
            CreatedAt = now,
            LastModifiedAt = now
        };

        await _nodeRepository.CreateAsync(node);

        return await ToDtoAsync(node);
    }

    public async Task<List<MicrogridNodeDto>> GetAllAsync(
        string? callerRole = null,
        string? callerUserId = null)
    {
        // Return every node, or only the caller's assigned nodes for a Grid Operator.
        var nodes = await _nodeRepository.GetAllAsync();

        if (IsGridOperator(callerRole))
        {
            nodes = nodes
                .Where(node => IsAssignedTo(node, callerUserId))
                .ToList();
        }

        return await ToDtoListAsync(nodes);
    }

    public async Task<MicrogridNodeDto?> GetByNodeIdAsync(
        string nodeId,
        string? callerRole = null,
        string? callerUserId = null)
    {
        // Return one node, or null when it does not exist or is hidden from this Grid Operator.
        var node = await _nodeRepository.GetByNodeIdAsync(
            NormalizeNodeId(nodeId));

        if (node == null || !CanAccess(node, callerRole, callerUserId))
        {
            return null;
        }

        return await ToDtoAsync(node);
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

        if (request.AssignedGridOperatorId != null)
        {
            node.AssignedGridOperatorId = await ResolveGridOperatorIdAsync(
                request.AssignedGridOperatorId,
                required: true);
        }

        node.LastModifiedAt = DateTime.UtcNow;

        await _nodeRepository.UpdateAsync(node);

        return await ToDtoAsync(node);
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

        return await ToDtoAsync(node);
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

        return await ToDtoAsync(node);
    }


    public async Task<List<AvailableSlotDto>> GetAvailableSlotsAsync(string nodeId, DateTime date, int slotMinutes = 30)
    {
        var node = await _nodeRepository.GetByNodeIdAsync(NormalizeNodeId(nodeId));
        if (node == null)
        {
            throw new InvalidOperationException("Node not found.");
        }
        if (node.Status == NodeStatus.Deactivated)
        {
            throw new InvalidOperationException("Node is not active.");
        }

        // Identify Sri Lanka Standard Time Zone
        var slTimeZone = TimeZoneInfo.FindSystemTimeZoneById(
            System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(System.Runtime.InteropServices.OSPlatform.Windows)
                ? "Sri Lanka Standard Time"
                : "Asia/Colombo"
        );

        // Pick the operating windows that match the requested day of the week.
        var dayName = date.DayOfWeek.ToString();
        var windows = node.Schedule.Where(w =>
            string.Equals(w.DayOfWeek, dayName, StringComparison.OrdinalIgnoreCase));

        // Read how many bookings each slot already holds from the EnergyBookingSlots counters.
        var reservedCounts = await _slotCounterRepository.GetReservedCountsAsync(node.NodeId);
        var capacity = node.AvailableBatterySlots;

        var slots = new List<AvailableSlotDto>();
        foreach (var w in windows)
        {
            var startTime = TimeSpan.ParseExact(w.StartTime, @"hh\:mm", CultureInfo.InvariantCulture);
            var endTime = TimeSpan.ParseExact(w.EndTime, @"hh\:mm", CultureInfo.InvariantCulture);

            // Combine local date and local time as Unspecified Local DateTime
            var localStart = DateTime.SpecifyKind(date.Date + startTime, DateTimeKind.Unspecified);
            var localEnd = DateTime.SpecifyKind(date.Date + endTime, DateTimeKind.Unspecified);

            // Convert Sri Lanka Local Time to true UTC DateTime
            var s = TimeZoneInfo.ConvertTimeToUtc(localStart, slTimeZone);
            var boundary = TimeZoneInfo.ConvertTimeToUtc(localEnd, slTimeZone);

            while (s.AddMinutes(slotMinutes) <= boundary)
            {
                var slotEnd = s.AddMinutes(slotMinutes);
                var isFuture = s > DateTime.UtcNow;
                reservedCounts.TryGetValue(s, out var reserved);

                slots.Add(new AvailableSlotDto
                {
                    Start = s,
                    End = slotEnd,
                    IsAvailable = isFuture && reserved < capacity,
                    Capacity = capacity,
                    ReservedCount = reserved,
                    Available = isFuture ? Math.Max(0, capacity - reserved) : 0
                });

                s = slotEnd;
            }
        }

        return slots;
    }


    public async Task<MicrogridNodeDto?> UpdateBatterySlotsAsync(
        string nodeId,
        UpdateBatterySlotsDto request,
        string? callerRole = null,
        string? callerUserId = null)
    {
        // Change only available battery slots. Identity, location, capacity, and schedule stay as stored.
        if (request == null || !request.AvailableBatterySlots.HasValue)
        {
            throw new InvalidOperationException(
                "Available battery slots are required.");
        }

        ValidateBatterySlots(request.AvailableBatterySlots.Value);

        var node = await _nodeRepository.GetByNodeIdAsync(
            NormalizeNodeId(nodeId));

        if (node == null || !CanAccess(node, callerRole, callerUserId))
        {
            return null;
        }

        if (node.Status == NodeStatus.Deactivated)
        {
            throw new InvalidOperationException(
                "Cannot update a deactivated node.");
        }

        node.AvailableBatterySlots = request.AvailableBatterySlots.Value;
        node.LastModifiedAt = DateTime.UtcNow;

        await _nodeRepository.UpdateAsync(node);

        return await ToDtoAsync(node);
    }

    public async Task<List<AvailableSlotDto>> GetAvailableSlotsExcludingReservationAsync(
    string nodeId,
    DateTime date,
    string excludeReservationId,
    int slotMinutes = 30)
    {
        // Look up the node and reject if missing or deactivated.
        var node = await _nodeRepository.GetByNodeIdAsync(NormalizeNodeId(nodeId));
        if (node == null)
        {
            throw new InvalidOperationException("Node not found.");
        }
        if (node.Status == NodeStatus.Deactivated)
        {
            throw new InvalidOperationException("Node is not active.");
        }

        // Identify Sri Lanka Standard Time Zone
        var slTimeZone = TimeZoneInfo.FindSystemTimeZoneById(
            System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(System.Runtime.InteropServices.OSPlatform.Windows)
                ? "Sri Lanka Standard Time"
                : "Asia/Colombo"
        );

        var dayName = date.DayOfWeek.ToString();
        var windows = node.Schedule.Where(w =>
            string.Equals(w.DayOfWeek, dayName, StringComparison.OrdinalIgnoreCase));

        // Exclude the reservation being updated so its own current slot doesn't block itself.
        var reservations = await _reservationRepository.GetByNodeIdAndDateExcludingAsync(
            node.NodeId,
            date,
            excludeReservationId);

        var bookedStarts = new HashSet<DateTime>(reservations
            .Where(r => r.Status == ReservationStatus.Pending || r.Status == ReservationStatus.Approved)
            .Select(r => r.SlotDateTime));

        var slots = new List<AvailableSlotDto>();
        foreach (var w in windows)
        {
            var startTime = TimeSpan.ParseExact(w.StartTime, @"hh\:mm", CultureInfo.InvariantCulture);
            var endTime = TimeSpan.ParseExact(w.EndTime, @"hh\:mm", CultureInfo.InvariantCulture);

            // Combine local date and local operating window time as Unspecified Local DateTime
            var localStart = DateTime.SpecifyKind(date.Date + startTime, DateTimeKind.Unspecified);
            var localEnd = DateTime.SpecifyKind(date.Date + endTime, DateTimeKind.Unspecified);

            // Convert Sri Lanka Local Time to true UTC DateTime
            var s = TimeZoneInfo.ConvertTimeToUtc(localStart, slTimeZone);
            var boundary = TimeZoneInfo.ConvertTimeToUtc(localEnd, slTimeZone);

            while (s.AddMinutes(slotMinutes) <= boundary)
            {
                var slotEnd = s.AddMinutes(slotMinutes);
                var isFuture = s > DateTime.UtcNow; // Correctly evaluates future hours today!
                var booked = bookedStarts.Contains(s);

                slots.Add(new AvailableSlotDto
                {
                    Start = s,
                    End = slotEnd,
                    IsAvailable = isFuture && !booked,
                    Capacity = 1,
                    ReservedCount = booked ? 1 : 0,
                    Available = (isFuture && !booked) ? 1 : 0
                });

                s = slotEnd;
            }
        }

        return slots;
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

    private async Task<string> ResolveGridOperatorIdAsync(
        string? assignedGridOperatorId,
        bool required)
    {
        // Require a registered Grid Operator and reject any other role.
        if (string.IsNullOrWhiteSpace(assignedGridOperatorId))
        {
            if (required)
            {
                throw new InvalidOperationException("Grid Operator is required.");
            }

            return string.Empty;
        }

        var operatorId = assignedGridOperatorId.Trim();

        if (!ObjectId.TryParse(operatorId, out _))
        {
            throw new InvalidOperationException(GridOperatorNotFoundMessage);
        }

        var user = await _userRepository.GetByIdAsync(operatorId);

        if (user == null)
        {
            throw new InvalidOperationException(GridOperatorNotFoundMessage);
        }

        if (user.Role != UserRole.GridOperator)
        {
            throw new InvalidOperationException(
                "Selected user is not a Grid Operator.");
        }

        return user.Id;
    }

    private static bool IsGridOperator(string? callerRole)
    {
        // Match the staff role stored in the JWT.
        return string.Equals(
            callerRole,
            nameof(UserRole.GridOperator),
            StringComparison.Ordinal);
    }

    private static bool IsAssignedTo(MicrogridNode node, string? callerUserId)
    {
        // Unassigned nodes are not visible to any Grid Operator.
        return !string.IsNullOrWhiteSpace(callerUserId)
            && !string.IsNullOrWhiteSpace(node.AssignedGridOperatorId)
            && string.Equals(
                node.AssignedGridOperatorId,
                callerUserId,
                StringComparison.Ordinal);
    }

    private static bool CanAccess(
        MicrogridNode node,
        string? callerRole,
        string? callerUserId)
    {
        // Backoffice and Prosumer keep existing access. Grid Operators are limited to assignments.
        if (!IsGridOperator(callerRole))
        {
            return true;
        }

        return IsAssignedTo(node, callerUserId);
    }

    private async Task<List<MicrogridNodeDto>> ToDtoListAsync(List<MicrogridNode> nodes)
    {
        // Resolve operator display names once for the whole list.
        var users = await _userRepository.GetAllAsync();
        var names = users.ToDictionary(
            user => user.Id,
            user => string.IsNullOrWhiteSpace(user.FullName)
                ? user.Username
                : user.FullName.Trim());

        return nodes.Select(node =>
        {
            var dto = MapToDto(node);

            if (!string.IsNullOrWhiteSpace(node.AssignedGridOperatorId) &&
                names.TryGetValue(node.AssignedGridOperatorId, out var name))
            {
                dto.AssignedGridOperatorName = name;
            }

            return dto;
        }).ToList();
    }

    private async Task<MicrogridNodeDto> ToDtoAsync(MicrogridNode node)
    {
        // Convert one node and attach the assigned operator's display name when it can be resolved.
        var dto = MapToDto(node);
        dto.AssignedGridOperatorName = await ResolveOperatorNameAsync(
            node.AssignedGridOperatorId);
        return dto;
    }

    private async Task<string?> ResolveOperatorNameAsync(string? operatorId)
    {
        // Leave the name empty when the assignment is missing or the user record is gone.
        if (string.IsNullOrWhiteSpace(operatorId) || !ObjectId.TryParse(operatorId, out _))
        {
            return null;
        }

        var user = await _userRepository.GetByIdAsync(operatorId);

        if (user == null)
        {
            return null;
        }

        return string.IsNullOrWhiteSpace(user.FullName)
            ? user.Username
            : user.FullName.Trim();
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
            AssignedGridOperatorId = node.AssignedGridOperatorId,
            CreatedAt = node.CreatedAt,
            LastModifiedAt = node.LastModifiedAt
        };
    }
}
