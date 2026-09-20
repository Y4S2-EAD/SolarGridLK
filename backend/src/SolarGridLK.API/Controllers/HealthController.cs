using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using SolarGridLK.Infrastructure.MongoDB;

namespace SolarGridLK.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly MongoDbContext _mongoDbContext;

    public HealthController(MongoDbContext mongoDbContext)
    {
        _mongoDbContext = mongoDbContext;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        try
        {
            await _mongoDbContext.Database
                .RunCommandAsync<BsonDocument>(
                    new BsonDocument("ping", 1));

            return Ok(new
            {
                status = "Healthy",
                database = "Connected",
                timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            return StatusCode(503, new
            {
                status = "Unhealthy",
                database = "Disconnected",
                message = ex.Message
            });
        }
    }
}