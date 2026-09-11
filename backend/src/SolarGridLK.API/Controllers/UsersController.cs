using Microsoft.AspNetCore.Mvc;

namespace SolarGridLK.API.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    [HttpGet]
    public IActionResult GetUsers()
    {
        return Ok(new
        {
            message = "Get users endpoint is ready."
        });
    }

    [HttpGet("{id}")]
    public IActionResult GetUser(string id)
    {
        return Ok(new
        {
            message = "Get user endpoint is ready.",
            id
        });
    }

    [HttpPost]
    public IActionResult CreateUser()
    {
        return Ok(new
        {
            message = "Create user endpoint is ready."
        });
    }

    [HttpPut("{id}")]
    public IActionResult UpdateUser(string id)
    {
        return Ok(new
        {
            message = "Update user endpoint is ready.",
            id
        });
    }

    [HttpDelete("{id}")]
    public IActionResult DeleteUser(string id)
    {
        return Ok(new
        {
            message = "Delete user endpoint is ready.",
            id
        });
    }
}