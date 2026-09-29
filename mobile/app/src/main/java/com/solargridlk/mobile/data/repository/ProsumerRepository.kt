/*
 * File: ProsumerRepository.kt
 * Description: Wraps prosumer API calls for the registration screen.
 */
package com.solargridlk.mobile.data.repository

import com.solargridlk.mobile.data.api.ProsumerApi
import com.solargridlk.mobile.data.model.CreateProsumerRequest
import com.solargridlk.mobile.data.model.ProsumerDeactivationRequest
import com.solargridlk.mobile.data.model.ProsumerResponse
import com.solargridlk.mobile.data.model.UpdateProsumerRequest
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

    // Load the signed-in prosumer profile.
    suspend fun getProfile(nic: String): Response<ProsumerResponse> {
        return prosumerApi.getProfile(nic)
    }

    // Save profile fields. Password is included only when it is being changed.
    suspend fun updateProfile(
        nic: String,
        fullName: String,
        email: String,
        phoneNumber: String,
        address: String,
        password: String? = null
    ): Response<ProsumerResponse> {
        return prosumerApi.updateProfile(
            nic,
            UpdateProsumerRequest(
                fullName = fullName,
                email = email,
                phoneNumber = phoneNumber,
                address = address,
                password = password
            )
        )
    }

    // Replace the password without changing the other profile fields.
    suspend fun changePassword(
        nic: String,
        password: String
    ): Response<ProsumerResponse> {
        return prosumerApi.updateProfile(
            nic,
            UpdateProsumerRequest(password = password)
        )
    }

    // Ask the API to deactivate this account after the current password is confirmed.
    suspend fun requestDeactivation(
        nic: String,
        password: String
    ): Response<ProsumerResponse> {
        return prosumerApi.requestDeactivation(
            nic,
            ProsumerDeactivationRequest(password = password)
        )
    }
}
