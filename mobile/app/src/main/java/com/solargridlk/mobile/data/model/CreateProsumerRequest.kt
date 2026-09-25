/*
 * File: CreateProsumerRequest.kt
 * Description: JSON body sent to POST /api/prosumers. The password is sent once
 * and is not stored on the device.
 */
package com.solargridlk.mobile.data.model

data class CreateProsumerRequest(
    val nic: String,
    val password: String,
    val fullName: String,
    val email: String,
    val phoneNumber: String,
    val address: String
)
