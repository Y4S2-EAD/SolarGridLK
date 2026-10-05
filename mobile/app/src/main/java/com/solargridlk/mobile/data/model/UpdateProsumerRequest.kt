/*
 * File: UpdateProsumerRequest.kt
 * Description: JSON body for PUT /api/prosumers/{nic}.
 * A null password leaves the stored password unchanged.
 */
package com.solargridlk.mobile.data.model

data class UpdateProsumerRequest(
    val fullName: String? = null,
    val email: String? = null,
    val phoneNumber: String? = null,
    val address: String? = null,
    val password: String? = null
)
