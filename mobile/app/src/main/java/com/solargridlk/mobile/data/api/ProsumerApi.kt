/*
 * File: ProsumerApi.kt
 * Description: Public Retrofit calls for the prosumer module.
 * Registration does not send an Authorization header.
 */
package com.solargridlk.mobile.data.api

import com.solargridlk.mobile.data.model.CreateProsumerRequest
import com.solargridlk.mobile.data.model.ProsumerDeactivationRequest
import com.solargridlk.mobile.data.model.ProsumerResponse
import com.solargridlk.mobile.data.model.UpdateProsumerRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path

interface ProsumerApi {

    // Register a new prosumer account. This route is public.
    @POST("prosumers")
    suspend fun register(
        @Body request: CreateProsumerRequest
    ): Response<ProsumerResponse>

    // Load one prosumer profile. The caller must be that prosumer or Backoffice.
    @GET("prosumers/{nic}")
    suspend fun getProfile(
        @Path("nic") nic: String
    ): Response<ProsumerResponse>

    // Update profile fields. Omit password to leave the current password in place.
    @PUT("prosumers/{nic}")
    suspend fun updateProfile(
        @Path("nic") nic: String,
        @Body request: UpdateProsumerRequest
    ): Response<ProsumerResponse>

    // Deactivate the account after the current password is confirmed.
    @POST("prosumers/{nic}/deactivation-request")
    suspend fun requestDeactivation(
        @Path("nic") nic: String,
        @Body request: ProsumerDeactivationRequest
    ): Response<ProsumerResponse>
}
