using SolarGridLK.Infrastructure.MongoDB;
using SolarGridLK.API.Middleware;
using SolarGridLK.Application.Interfaces;
using SolarGridLK.Infrastructure.Security;
using SolarGridLK.Infrastructure.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using SolarGridLK.Infrastructure.Services;
using SolarGridLK.Infrastructure.Seeding;

var builder = WebApplication.CreateBuilder(args);

// MongoDB Configuration
builder.Services.Configure<MongoDbSettings>(
    builder.Configuration.GetSection("MongoDbSettings"));

var mongoSettings = builder.Configuration
    .GetSection("MongoDbSettings")
    .Get<MongoDbSettings>();

if (mongoSettings == null ||
    string.IsNullOrWhiteSpace(mongoSettings.ConnectionString) ||
    string.IsNullOrWhiteSpace(mongoSettings.DatabaseName))
{
    throw new InvalidOperationException(
        "MongoDB configuration is missing. " +
        "Please configure MongoDbSettings:ConnectionString " +
        "and MongoDbSettings:DatabaseName.");
}

builder.Services.AddSingleton(mongoSettings);

// MongoDB context
builder.Services.AddSingleton<MongoDbContext>();

// JWT
builder.Services.Configure<JwtSettings>(
    builder.Configuration.GetSection("JwtSettings"));

var jwtSettings = builder.Configuration
    .GetSection("JwtSettings")
    .Get<JwtSettings>();

if (jwtSettings == null ||
    string.IsNullOrWhiteSpace(jwtSettings.Key) ||
    string.IsNullOrWhiteSpace(jwtSettings.Issuer) ||
    string.IsNullOrWhiteSpace(jwtSettings.Audience))
{
    throw new InvalidOperationException(
        "JWT configuration is missing.");
}

builder.Services.AddSingleton(jwtSettings);

builder.Services.AddScoped<IJwtService, JwtService>();

// Config ASP JWT Auth
builder.Services.AddAuthentication(
    JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,

                ValidIssuer = jwtSettings.Issuer,
                ValidAudience = jwtSettings.Audience,

                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(jwtSettings.Key))
            };
    });

builder.Services.AddAuthorization();

// REG Interfaces
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<DatabaseSeeder>();

builder.Services.AddScoped<IReservationRepository, ReservationRepository>();
builder.Services.AddScoped<IQrService, QrService>();

// Controllers
builder.Services.AddControllers();


// Authorization
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(
        "BackofficeOnly",
        policy =>
        {
            policy.RequireRole("Backoffice");
        });

    options.AddPolicy(
        "GridOperatorOnly",
        policy =>
        {
            policy.RequireRole("GridOperator");
        });

    options.AddPolicy(
        "BackofficeOrGridOperator",
        policy =>
        {
            policy.RequireRole(
                "Backoffice",
                "GridOperator");
        });
});

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Build Application
var app = builder.Build();

// Seeder Run
using (var scope = app.Services.CreateScope())
{
    var databaseSeeder = scope.ServiceProvider
        .GetRequiredService<DatabaseSeeder>();

    await databaseSeeder.SeedAsync();
}

// HTTP Request Pipeline
app.UseHttpsRedirection();

// Exception Handling Middleware
app.UseMiddleware<ExceptionHandlingMiddleware>();

// Swagger
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();

app.UseAuthorization();

// Map controller endpoints
app.MapControllers();

app.Run();