package com.solargridlk.mobile.data.model

data class ReservationListResponse(
    val success: Boolean,
    val message: String? = null,
    val data: List<Reservation>? = null
)

data class ReservationSingleResponse(
    val success: Boolean,
    val message: String? = null,
    val data: Reservation? = null
)