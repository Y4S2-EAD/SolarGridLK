/*
 * File: ReservationService.cs
 * Project: SolarGridLK.Infrastructure
 * Description: Implements the business logic for managing energy reservations, including creation, retrieval, updating, and deletion of reservations.
 * Author: Nipuni Bandara 
*/

using SolarGridLK.Application.DTOs;
using SolarGridLK.Application.Interfaces;
using SolarGridLK.Domain.Entities;
using SolarGridLK.Domain.Enums;

namespace SolarGridLK.Infrastructure.Services;

public class ReservationService : IReservationService
{
    private readonly IReservationRepository _reservationRepository;
    private readonly IMicrogridNodeRepository _nodeRepository;

    public ReservationService(IReservationRepository reservationRepository, IMicrogridNodeService nodeService)
    {
        _reservationRepository = reservationRepository;
        _nodeService = nodeService;
    }
    public async Task<ReservationDto> CreateReservationAsync(CreateReservationDto request)
    {
        //Reject a slot that has already passed
        if (request.SlotDateTime < DateTime.UtcNow)
        {
            throw new InvalidOperationException("Cannot reserve a slot in the past.");
        }
        //Reject a slot more than 7 days into the future
        if (request.SlotDateTime > DateTime.UtcNow.AddDays(7))
        {
            throw new InvalidOperationException("Reservations can only be made within the next 7 days.");
        }
        //Reject a missing prosumer NIC
        if(string.IsNullOrWhiteSpace(request.ProsumerNic))
        {
            throw new InvalidOperationException("Prosumer NIC is required.");
        }
        // Validate the requested node exists and is active
        if (string.IsNullOrWhiteSpace(request.NodeId))
        {
            throw new InvalidOperationException("Node ID is required.");
        }

        var nodeId = request.NodeId.Trim();

        var node = await _nodeRepository.GetByNodeIdAsync(nodeId);

        if (node == null)
        {
            throw new InvalidOperationException("Node not found.");
        }

        if (node.Status == NodeStatus.Deactivated)
        {
            throw new InvalidOperationException("Node is not active.");
        }

        // Reject a missing node id.
        if (string.IsNullOrWhiteSpace(request.NodeId))
        {
            throw new InvalidOperationException("Node ID is required.");
        }

        // The requested time must exactly match one of this node's generated, available slots.
        var slots = await _nodeService.GetAvailableSlotsAsync(request.NodeId.Trim(), request.SlotDateTime.Date);
        var match = slots.FirstOrDefault(s => s.Start == request.SlotDateTime);
        if (match == null || !match.IsAvailable)
        {
            throw new InvalidOperationException("Slot not available.");
        }

        var reservation = new Reservation
        {
            ProsumerNic = request.ProsumerNic,
            NodeId = request.NodeId,
            SlotDateTime = request.SlotDateTime,
            Status = ReservationStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            LastModifiedAt = DateTime.UtcNow
        };
        await _reservationRepository.CreateAsync(reservation);
        return MapToDto(reservation);
    }

    private static ReservationDto MapToDto(Reservation reservation)
    {
        return new ReservationDto
        {
            Id = reservation.Id,
            ProsumerNic = reservation.ProsumerNic,
            NodeId = reservation.NodeId,
            SlotDateTime = reservation.SlotDateTime,
            Status = reservation.Status.ToString(),
            QrCode = reservation.QrCode ?? string.Empty,
            CreatedAt = reservation.CreatedAt,
            LastModifiedAt = reservation.LastModifiedAt
        };
    }
    public async Task<ReservationDto?> GetReservationByIdAsync(string id)
    {
        var reservation = await _reservationRepository.GetByIdAsync(id);
        return reservation == null ? null : MapToDto(reservation);
    }
    
    public async Task<List<ReservationDto>> GetReservationAsync(string? prosumerNic, string? status, string? search)
    {
        var reservations = await _reservationRepository.GetAllAsync();
        // Filter by prosumer NIC if provided
        if (!string.IsNullOrWhiteSpace(prosumerNic))
        {
            reservations = reservations
                .Where(r => r.ProsumerNic.Equals(prosumerNic, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }
        // Filter by status if provided
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<ReservationStatus>(status, true, out var parsedStatus))
        {
            reservations = reservations
                .Where(r => r.Status == parsedStatus)
                .ToList();
        }
        // Filter by search term if provided (searching in ProsumerNic and NodeId)
        if (!string.IsNullOrWhiteSpace(search))
        {
            reservations = reservations
                .Where(r => r.ProsumerNic.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                            r.NodeId.Contains(search, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }
        return reservations.Select(MapToDto).ToList();
    }

    public async Task<ReservationDto?> UpdateReservationAsync(string id, UpdateReservationDto request)
    {
        var reservation = await _reservationRepository.GetByIdAsync(id);
        if (reservation == null)
        {
            return null;
        }
        // Reject an update if the reservation is completed or cancelled
        if (reservation.Status == ReservationStatus.Completed || reservation.Status == ReservationStatus.Cancelled)
        {
            throw new InvalidOperationException("Cannot modify a completed or cancelled reservation.");
        }
        //Reject an updation if the slot is less than 12 hours away
        if (reservation.SlotDateTime - DateTime.UtcNow < TimeSpan.FromHours(12))
        {
            throw new InvalidOperationException("Update require at least 12 hours notice.");
        }
        // Reject an update if the new slot is in the past
        if (request.SlotDateTime < DateTime.UtcNow)
        {
            throw new InvalidOperationException("Cannot reserve a slot in the past.");
        }
        // Reject an update if the new slot is more than 7 days into the future
        if (request.SlotDateTime > DateTime.UtcNow.AddDays(7))
        {
            throw new InvalidOperationException("Reservations can only be made within the next 7 days.");
        }

        // The new requested time must exactly match one of this node's generated, available slots.
        var slots = await _nodeService.GetAvailableSlotsAsync(reservation.NodeId, request.SlotDateTime.Date);
        var match = slots.FirstOrDefault(s => s.Start == request.SlotDateTime);
        if (match == null || !match.IsAvailable)
        {
            throw new InvalidOperationException("Slot not available.");
        }

        reservation.SlotDateTime = request.SlotDateTime;
        reservation.LastModifiedAt = DateTime.UtcNow;
        await _reservationRepository.UpdateAsync(reservation);
        return  MapToDto(reservation);
    }

    public async Task<ReservationDto?> CancelReservationAsync(string id)
    {
        var reservation = await _reservationRepository.GetByIdAsync(id);
        if (reservation == null)
        {
            return null;
        }
        // Reject a cancellation if the reservation is completed or already cancelled
        if (reservation.Status == ReservationStatus.Completed || reservation.Status == ReservationStatus.Cancelled)
        {
            throw new InvalidOperationException("Cannot cancel a completed or already cancelled reservation.");
        }
        //Reject a cancellation if the slot is less than 12 hours away
        if (reservation.SlotDateTime - DateTime.UtcNow < TimeSpan.FromHours(12))
        {
            throw new InvalidOperationException("Cancellation require at least 12 hours notice.");
        }
        reservation.Status = ReservationStatus.Cancelled;
        reservation.LastModifiedAt = DateTime.UtcNow;
        await _reservationRepository.UpdateAsync(reservation);
        return MapToDto(reservation);
    }

    public async Task<ReservationDto?> ApproveReservationAsync(string id, string qrCode)
    {
        var reservation = await _reservationRepository.GetByIdAsync(id);
        if (reservation == null)
        {
            return null;
        }
        //Only a pending reservation can move to Approved
        if (reservation.Status != ReservationStatus.Pending)
        {
            throw new InvalidOperationException("Only a pending reservation can be approved.");
        }

        // Reject approving a reservation whose slot time has already passed
        if (reservation.SlotDateTime < DateTime.UtcNow)
        {
            throw new InvalidOperationException("Cannot approve a reservation whose slot time has already passed.");
        }

        reservation.Status = ReservationStatus.Approved;
        reservation.QrCode = qrCode;
        reservation.LastModifiedAt = DateTime.UtcNow;
        await _reservationRepository.UpdateAsync(reservation);
        return MapToDto(reservation);
    }

    public async Task<ReservationDto?> CompleteReservationAsync(string id)
    {
        var reservation = await _reservationRepository.GetByIdAsync(id);
        if (reservation == null)
        {
            return null;
        }

        // Only an Approved reservation can be marked Completed.
        if (reservation.Status != ReservationStatus.Approved)
        {
            throw new InvalidOperationException("Only an approved reservation can be completed.");
        }

        reservation.Status = ReservationStatus.Completed;
        reservation.LastModifiedAt = DateTime.UtcNow;
        await _reservationRepository.UpdateAsync(reservation);
        return MapToDto(reservation);
    }

    public async Task<DashboardSummaryDto> GetDashboardSummaryAsync(string prosumerNic)
    { 
        var reservations = await _reservationRepository.GetByProsumerNicAsync(prosumerNic);
        var activeCount = reservations.Count(r => r.Status == ReservationStatus.Pending || r.Status == ReservationStatus.Approved);
        var pendingCount = reservations.Count(r => r.Status == ReservationStatus.Pending);
        var approvedFutureCount = reservations.Count(r => r.Status == ReservationStatus.Approved && r.SlotDateTime > DateTime.UtcNow);

        return new DashboardSummaryDto
        {
            ActiveCount = activeCount,
            PendingCount = pendingCount,
            ApprovedFutureCount = approvedFutureCount
        };
    }
}
