/*
 * File: ProsumerDeactivationRequest.kt
 * Description: Password confirmation for POST /api/prosumers/{nic}/deactivation-request.
 * The password is not stored on the device.
 */
package com.solargridlk.mobile.data.model

data class ProsumerDeactivationRequest(
    val password: String
)
