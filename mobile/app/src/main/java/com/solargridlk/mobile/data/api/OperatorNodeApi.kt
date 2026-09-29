package com.solargridlk.mobile.data.api

import com.solargridlk.mobile.data.model.MicrogridNodeResponse
import com.solargridlk.mobile.data.model.MicrogridNodesResponse
import com.solargridlk.mobile.data.model.UpdateBatterySlotsRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PUT
import retrofit2.http.Path

interface OperatorNodeApi {
    @GET("nodes")
    suspend fun getNodes(): Response<MicrogridNodesResponse>

    @GET("nodes/{nodeId}")
    suspend fun getNode(@Path("nodeId") nodeId: String): Response<MicrogridNodeResponse>

    @PUT("nodes/{nodeId}/battery-slots")
    suspend fun updateBatterySlots(
        @Path("nodeId") nodeId: String,
        @Body request: UpdateBatterySlotsRequest
    ): Response<MicrogridNodeResponse>
}
