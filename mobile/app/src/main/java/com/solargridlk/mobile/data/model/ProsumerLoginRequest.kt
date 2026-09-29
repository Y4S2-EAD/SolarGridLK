/*
 * File: ProsumerLoginRequest.kt
 * Description: JSON body for POST /api/auth/prosumer-login.
 * The password is sent once and is not stored on the device.
 */
package com.solargridlk.mobile.data.model

data class ProsumerLoginRequest(
    val nic: String,
    val password: String
)
