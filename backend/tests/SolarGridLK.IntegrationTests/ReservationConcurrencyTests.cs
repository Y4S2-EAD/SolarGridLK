using System.Threading.Tasks;
using Xunit;
using Microsoft.Extensions.DependencyInjection;
using SolarGridLK.Infrastructure.Transactions;
using SolarGridLK.Application.Interfaces;
using SolarGridLK.Domain.Entities;
using SolarGridLK.Domain.Enums;

namespace SolarGridLK.IntegrationTests;

public class ReservationConcurrencyTests : IClassFixture<TestFixture>
{
    private readonly TestFixture _fixture;

    public ReservationConcurrencyTests(TestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task ConcurrentCreates_DoNotOverbook()
    {
        var services = _fixture.Services;

        var reservationService = services.GetRequiredService<IReservationService>();
        var nodeService = services.GetRequiredService<IMicrogridNodeService>();

        // Create a test node with 1 slot capacity and a single slot
        var node = await nodeService.CreateAsync(new SolarGridLK.Application.DTOs.CreateMicrogridNodeDto
        {
            NodeId = "TESTNODE",
            Name = "Test Node",
            Location = "Test",
            Latitude = 6.9,
            Longitude = 79.9,
            CapacityKw = 5,
            AvailableBatterySlots = 1,
            Schedule = new System.Collections.Generic.List<SolarGridLK.Application.DTOs.NodeScheduleSlotDto>
            {
                new SolarGridLK.Application.DTOs.NodeScheduleSlotDto{ DayOfWeek = System.DateTime.UtcNow.DayOfWeek.ToString(), StartTime = "00:00", EndTime = "23:59" }
            },
            AssignedGridOperatorId = null
        });

        var slot = (await nodeService.GetAvailableSlotsAsync(node.NodeId, System.DateTime.UtcNow.Date))[0];

        var tasks = new System.Collections.Generic.List<Task>();
        var results = new System.Collections.Concurrent.ConcurrentBag<bool>();

        for (int i = 0; i < 5; i++)
        {
            var nic = $"NIC{i}";
            tasks.Add(Task.Run(async () =>
            {
                try
                {
                    var dto = await reservationService.CreateReservationAsync(new SolarGridLK.Application.DTOs.CreateReservationDto
                    {
                        ProsumerNic = nic,
                        NodeId = node.NodeId,
                        SlotDateTime = slot.Start
                    });
                    results.Add(true);
                }
                catch
                {
                    results.Add(false);
                }
            }));
        }

        await Task.WhenAll(tasks);

        // Only one should have succeeded because capacity=1
        Assert.Equal(1, results.Count(r => r));
    }
}
