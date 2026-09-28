package com.solargridlk.mobile.data.model

data class CreateReservationRequest(
    val prosumerNic: String,
    val nodeId: String,
    val slotDateTime: String
)