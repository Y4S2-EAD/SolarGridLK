/* Description: Exposes microgrid node creation, listing, updates, schedule changes, deactivation, battery-slot availability, and Grid Operator assignment.*/

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolarGridLK.Application.DTOs;
using SolarGridLK.Application.Interfaces;
using SolarGridLK.Infrastructure.Services;

namespace SolarGridLK.API.Controllers;

[ApiController]
[Route("api/nodes")]
[Authorize]
public class NodesController : ControllerBase
{
    private readonly IMicrogridNodeService _nodeService;

    public NodesController(IMicrogridNodeService nodeService)
    {
        // Store the node service used by every action.
        _nodeService = nodeService;
    }

    [HttpPost]
    [Authorize(Policy = "BackofficeOnly")]
    public async Task<IActionResult> Create(
        [FromBody] CreateMicrogridNodeDto request)
    {
        // Create a microgrid node.
        try
        {
            var node = await _nodeService.CreateAsync(request);

            return CreatedAtAction(
                nameof(GetByNodeId),
                new { nodeId = node.NodeId },
                ApiResponse<MicrogridNodeDto>.Ok(
                    node,
                    "Node created successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return InvalidNodeRequest(ex);
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        // Backoffice and Prosumer receive every node. A Grid Operator receives only assigned nodes.
        var nodes = await _nodeService.GetAllAsync(
            GetCallerRole(),
            GetCallerUserId());

        return Ok(ApiResponse<List<MicrogridNodeDto>>.Ok(
            nodes,
            "Nodes retrieved successfully."));
    }

    [HttpGet("{nodeId}")]
    public async Task<IActionResult> GetByNodeId(string nodeId)
    {
        // Return one microgrid node by its public node id.
        try
        {
            var node = await _nodeService.GetByNodeIdAsync(
                nodeId,
                GetCallerRole(),
                GetCallerUserId());

            if (node == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Node not found."
                });
            }

            return Ok(ApiResponse<MicrogridNodeDto>.Ok(
                node,
                "Node retrieved successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                success = false,
                message = ex.Message
            });
        }
    }

    [HttpPut("{nodeId}")]
    [Authorize(Policy = "BackofficeOnly")]
    public async Task<IActionResult> Update(
        string nodeId,
        [FromBody] UpdateMicrogridNodeDto request)
    {
        // Update node details. The route node id is never replaced.
        try
        {
            var node = await _nodeService.UpdateAsync(nodeId, request);

            if (node == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Node not found."
                });
            }

            return Ok(ApiResponse<MicrogridNodeDto>.Ok(
                node,
                "Node updated successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return InvalidNodeRequest(ex);
        }
    }

    [HttpPut("{nodeId}/schedule")]
    [Authorize(Policy = "BackofficeOnly")]
    public async Task<IActionResult> UpdateSchedule(
        string nodeId,
        [FromBody] UpdateNodeScheduleDto request)
    {
        // Replace the node's operating schedule.
        try
        {
            var node = await _nodeService.UpdateScheduleAsync(nodeId, request);

            if (node == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Node not found."
                });
            }

            return Ok(ApiResponse<MicrogridNodeDto>.Ok(
                node,
                "Node schedule updated successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                success = false,
                message = ex.Message
            });
        }
    }

    [HttpPost("{nodeId}/deactivate")]
    [Authorize(Policy = "BackofficeOnly")]
    public async Task<IActionResult> Deactivate(string nodeId)
    {
        // Deactivate a node when no active reservations exist for it.
        try
        {
            var node = await _nodeService.DeactivateAsync(nodeId);

            if (node == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Node not found."
                });
            }

            return Ok(ApiResponse<MicrogridNodeDto>.Ok(
                node,
                "Node deactivated successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                success = false,
                message = ex.Message
            });
        }
    }

    [HttpPut("{nodeId}/battery-slots")]
    public async Task<IActionResult> UpdateBatterySlots(
        string nodeId,
        [FromBody] UpdateBatterySlotsDto request)
    {
        // Update battery-slot availability without changing node identity, location, capacity, or schedule.
        try
        {
            var node = await _nodeService.UpdateBatterySlotsAsync(
                nodeId,
                request,
                GetCallerRole(),
                GetCallerUserId());

            if (node == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Node not found."
                });
            }

            return Ok(ApiResponse<MicrogridNodeDto>.Ok(
                node,
                "Battery slot availability updated successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                success = false,
                message = ex.Message
            });
        }
    }

    [HttpGet("{nodeId}/slots")]
    public async Task<IActionResult> GetSlots(string nodeId, [FromQuery] string date)
    {
        // Return this node's available booking slots for the given date.
        if (!DateTime.TryParse(date, out var parsed))
        {
            return BadRequest(new
            {
                success = false,
                message = "Invalid date."
            });
        }

        try
        {
            if (User.IsInRole("GridOperator"))
            {
                // Hide another operator's schedule slots the same way as the node itself.
                var accessibleNode = await _nodeService.GetByNodeIdAsync(
                    nodeId,
                    "GridOperator",
                    GetCallerUserId());

                if (accessibleNode == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Node not found."
                    });
                }
            }

            var slots = await _nodeService.GetAvailableSlotsAsync(nodeId, parsed.Date);

            return Ok(ApiResponse<List<AvailableSlotDto>>.Ok(
                slots,
                "Slots retrieved successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                success = false,
                message = ex.Message
            });
        }
    }

    private IActionResult InvalidNodeRequest(InvalidOperationException ex)
    {
        // A missing Grid Operator id is not found. Other validation errors stay bad requests.
        if (ex.Message == MicrogridNodeService.GridOperatorNotFoundMessage)
        {
            return NotFound(new
            {
                success = false,
                message = ex.Message
            });
        }

        return BadRequest(new
        {
            success = false,
            message = ex.Message
        });
    }

    private string? GetCallerRole()
    {
        // Read the role already carried by the JWT. Do not accept a role from the request body.
        if (User.IsInRole("Backoffice"))
        {
            return "Backoffice";
        }

        if (User.IsInRole("Prosumer"))
        {
            return "Prosumer";
        }

        if (User.IsInRole("GridOperator"))
        {
            return "GridOperator";
        }

        var role = User.FindFirst(ClaimTypes.Role)?.Value
            ?? User.FindFirst("role")?.Value;

        return string.IsNullOrWhiteSpace(role) ? null : role.Trim();
    }

    private string? GetCallerUserId()
    {
        // Use the user id already stored in the JWT. Do not trust an id supplied by the client.
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("nameid")?.Value;
    }
}
