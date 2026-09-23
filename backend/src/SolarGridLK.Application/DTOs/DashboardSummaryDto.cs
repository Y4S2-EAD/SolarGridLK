/*
 * File: DashboardSummaryDto.cs
 * Project: SolarGridLK.Application
 * Description: Represents aggregated reservation counts for a prosumer's dashboard.
 * Author: Nipuni Bandara
*/

namespace SolarGridLK.Application.DTOs;

public class DashboardSummaryDto
{
    public int ActiveCount { get; set; }
    public int PendingCount { get; set; }
    public int ApprovedFutureCount { get; set; }
}
