/* Description: Exposes microgrid node creation, listing, updates, schedule changes, deactivation, and battery-slot availability.*/

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolarGridLK.Application.DTOs;
using SolarGridLK.Application.Interfaces;

namespace SolarGridLK.API.Controllers;

[ApiController]
[Route("api/nodes")]
[Authorize(Policy = "BackofficeOrGridOperator")]
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
            return BadRequest(new
            {
                success = false,
                message = ex.Message
            });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        // Return every microgrid node.
        var nodes = await _nodeService.GetAllAsync();

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
            var node = await _nodeService.GetByNodeIdAsync(nodeId);

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
            return BadRequest(new
            {
                success = false,
                message = ex.Message
            });
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
            var node = await _nodeService.UpdateBatterySlotsAsync(nodeId, request);

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
}
