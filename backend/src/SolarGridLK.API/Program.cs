using SolarGridLK.Infrastructure.MongoDB;

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

// Controllers
builder.Services.AddControllers();


// Authorization
builder.Services.AddAuthorization();

var app = builder.Build();


// HTTP Request Pipeline
app.UseHttpsRedirection();

app.UseAuthorization();

// Map controller endpoints
app.MapControllers();

app.Run();