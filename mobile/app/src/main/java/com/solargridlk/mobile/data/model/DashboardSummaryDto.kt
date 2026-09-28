package com.solargridlk.mobile.data.model

data class DashboardSummaryDto(
    val activeCount: Int,
    val pendingCount: Int,
    val approvedFutureCount: Int
)

data class DashboardSummaryResponse(
    val success: Boolean,
    val message: String? = null,
    val data: DashboardSummaryDto? = null
)