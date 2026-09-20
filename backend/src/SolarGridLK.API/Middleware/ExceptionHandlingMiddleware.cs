using System.Net;
using System.Text.Json;

namespace SolarGridLK.API.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;

    public ExceptionHandlingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception)
        {
            await HandleExceptionAsync(context);
        }
    }

    private static async Task HandleExceptionAsync(
        HttpContext context)
    {
        context.Response.StatusCode =
            (int)HttpStatusCode.InternalServerError;

        context.Response.ContentType = "application/json";

        var response = new
        {
            success = false,
            message = "An unexpected error occurred."
        };

        await context.Response.WriteAsync(
            JsonSerializer.Serialize(response));
    }
}