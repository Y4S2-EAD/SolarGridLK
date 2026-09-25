/*
 * File: ProsumerRepository.kt
 * Description: Wraps prosumer API calls for the registration screen.
 */
package com.solargridlk.mobile.data.repository

import com.solargridlk.mobile.data.api.ProsumerApi
import com.solargridlk.mobile.data.model.CreateProsumerRequest
import com.solargridlk.mobile.data.model.ProsumerResponse
import retrofit2.Response

class ProsumerRepository(
    private val prosumerApi: ProsumerApi
) {

    // Submit a new prosumer registration. The password is not kept after this call.
    suspend fun register(
        nic: String,
        password: String,
        fullName: String,
        email: String,
        phoneNumber: String,
        address: String
    ): Response<ProsumerResponse> {
        return prosumerApi.register(
            CreateProsumerRequest(
                nic = nic,
                password = password,
                fullName = fullName,
                email = email,
                phoneNumber = phoneNumber,
                address = address
            )
        )
    }
}
