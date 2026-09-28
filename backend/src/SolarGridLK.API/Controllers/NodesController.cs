/* Description: Exposes microgrid node creation, listing, updates, schedule changes, and deactivation.*/

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
}
