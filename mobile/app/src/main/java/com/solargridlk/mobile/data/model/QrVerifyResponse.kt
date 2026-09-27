package com.solargridlk.mobile.data.model

data class QrVerifyResponse(
    val success: Boolean,
    val message: String?,
    val data: QrVerificationData?
)

data class QrVerificationData(
    val reservationId: String?,
    val prosumerNic: String?,
    val nodeId: String?,
    val slotDateTime: String?,
    val status: String?
)