using Microsoft.AspNetCore.Mvc;

namespace SolarGridLK.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    [HttpPost("login")]
    public IActionResult Login()
    {
        return Ok(new
        {
            message = "Web login endpoint is ready."
        });
    }

    [HttpPost("prosumer-login")]
    public IActionResult ProsumerLogin()
    {
        return Ok(new
        {
            message = "Prosumer login endpoint is ready."
        });
    }
}