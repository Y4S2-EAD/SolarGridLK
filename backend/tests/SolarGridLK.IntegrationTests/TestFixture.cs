using Microsoft.Extensions.DependencyInjection;
using System;

namespace SolarGridLK.IntegrationTests;

public class TestFixture : IDisposable
{
    public IServiceProvider Services { get; }

    public TestFixture()
    {
        var services = new ServiceCollection();

        // Minimal registrations required for integration tests
        services.AddScoped<SolarGridLK.Application.Interfaces.IMicrogridNodeService, SolarGridLK.Infrastructure.Services.MicrogridNodeService>();
        services.AddScoped<SolarGridLK.Application.Interfaces.IReservationService, SolarGridLK.Infrastructure.Services.ReservationService>();
        services.AddScoped<SolarGridLK.Application.Interfaces.IMicrogridNodeRepository, SolarGridLK.Infrastructure.Repositories.MicrogridNodeRepository>();
        services.AddScoped<SolarGridLK.Application.Interfaces.IReservationRepository, SolarGridLK.Infrastructure.Repositories.ReservationRepository>();
        services.AddScoped<SolarGridLK.Application.Interfaces.IUserRepository, SolarGridLK.Infrastructure.Repositories.UserRepository>();
        services.AddScoped<SolarGridLK.Infrastructure.Transactions.IMongoTransactionRunner, SolarGridLK.Infrastructure.Transactions.MongoTransactionRunner>();
        services.AddScoped<SolarGridLK.Infrastructure.Repositories.SlotCounterRepository>();

        // Use local MongoDB connection for tests; allow override via MONGO_TEST_CONNECTIONSTRING env var
        var conn = Environment.GetEnvironmentVariable("MONGO_TEST_CONNECTIONSTRING") ?? "mongodb://localhost:27017";
        services.AddSingleton(new SolarGridLK.Infrastructure.MongoDB.MongoDbSettings { ConnectionString = conn, DatabaseName = "solar_test_db" });
        services.AddSingleton<SolarGridLK.Infrastructure.MongoDB.MongoDbContext>();
        services.AddSingleton<global::MongoDB.Driver.IMongoClient>(sp => new global::MongoDB.Driver.MongoClient(conn));

        Services = services.BuildServiceProvider();
        // Ensure test database is clean at start
        var dbSettings = Services.GetRequiredService<SolarGridLK.Infrastructure.MongoDB.MongoDbSettings>();
        var client = Services.GetRequiredService<global::MongoDB.Driver.IMongoClient>();
        client.DropDatabase(dbSettings.DatabaseName);
    }

    public void Dispose()
    {
        if (Services is IDisposable d) d.Dispose();
    }
}
