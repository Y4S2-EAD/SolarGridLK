/*
 * File: ProsumerApi.kt
 * Description: Public Retrofit calls for the prosumer module.
 * Registration does not send an Authorization header.
 */
package com.solargridlk.mobile.data.api

import com.solargridlk.mobile.data.model.CreateProsumerRequest
import com.solargridlk.mobile.data.model.ProsumerResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface ProsumerApi {

    // Register a new prosumer account. This route is public.
    @POST("prosumers")
    suspend fun register(
        @Body request: CreateProsumerRequest
    ): Response<ProsumerResponse>
}
