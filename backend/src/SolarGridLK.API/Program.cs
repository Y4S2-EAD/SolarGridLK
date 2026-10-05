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

// Register MongoClient for transactions and session support (register as the IMongoClient interface)
builder.Services.AddSingleton<global::MongoDB.Driver.IMongoClient>(sp =>
{
    var settings = sp.GetRequiredService<MongoDbSettings>();
    return new global::MongoDB.Driver.MongoClient(settings.ConnectionString);
});

// SlotCounterRepository (fallback)
builder.Services.AddScoped<SolarGridLK.Infrastructure.Repositories.SlotCounterRepository>();

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
builder.Services.AddScoped<IProsumerRepository, ProsumerRepository>();
builder.Services.AddScoped<IProsumerService, ProsumerService>();
builder.Services.AddScoped<IMicrogridNodeRepository, MicrogridNodeRepository>();
builder.Services.AddScoped<IMicrogridNodeService, MicrogridNodeService>();
builder.Services.AddScoped<IReservationRepository, ReservationRepository>();
// Register infrastructure reservation repository to expose session-aware methods
builder.Services.AddScoped<SolarGridLK.Infrastructure.Interfaces.IReservationInfrastructureRepository>(sp => sp.GetRequiredService<ReservationRepository>());
builder.Services.AddScoped<IReservationService, ReservationService>();
builder.Services.AddScoped<DatabaseSeeder>();

// Infrastructure transaction runner
builder.Services.AddScoped<SolarGridLK.Infrastructure.Transactions.IMongoTransactionRunner, SolarGridLK.Infrastructure.Transactions.MongoTransactionRunner>();

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

    options.AddPolicy(
        "ProsumerOnly",
        policy =>
        {
            policy.RequireRole("Prosumer");
        });
});

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter your JWT token (without the word 'Bearer')"
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] { }
        }
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("WebClient", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

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

// CORS
app.UseCors("WebClient");

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