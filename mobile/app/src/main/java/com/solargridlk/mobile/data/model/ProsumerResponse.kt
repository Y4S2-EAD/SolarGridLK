/*
 * File: ProsumerResponse.kt
 * Description: API envelope returned after prosumer registration.
 * Matches the existing { success, message, data } shape. Password is never included.
 */
package com.solargridlk.mobile.data.model

data class ProsumerResponse(
    val success: Boolean,
    val message: String? = null,
    val data: ProsumerData? = null
)

data class ProsumerData(
    val nic: String? = null,
    val fullName: String? = null,
    val email: String? = null,
    val phoneNumber: String? = null,
    val address: String? = null,
    val status: String? = null,
    val createdAt: String? = null
)
