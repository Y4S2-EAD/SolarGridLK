package com.solargridlk.mobile.data.model

data class Reservation(
    val id: String,
    val prosumerNic: String,
    val nodeId: String,
    val slotDateTime: String,
    val status: String,
    val qrCode: String? = "",
    val createdAt: String? = null,
    val lastModifiedAt: String? = null
)