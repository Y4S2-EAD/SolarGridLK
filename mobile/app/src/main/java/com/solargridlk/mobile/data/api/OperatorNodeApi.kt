package com.solargridlk.mobile.data.api

import com.google.gson.annotations.SerializedName
import com.solargridlk.mobile.data.model.MicrogridNodeResponse
import com.solargridlk.mobile.data.model.MicrogridNodesResponse
import com.solargridlk.mobile.data.model.UpdateBatterySlotsRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

data class AvailableSlot(
    @SerializedName(value = "start", alternate = ["Start", "slotDateTime", "SlotDateTime"])
    val start: String?,
    @SerializedName(value = "end", alternate = ["End"])
    val end: String?,
    @SerializedName(value = "isAvailable", alternate = ["IsAvailable", "available"])
    val isAvailable: Boolean?,
    @SerializedName(value = "reservationId", alternate = ["ReservationId"])
    val reservationId: String? = null,
    @SerializedName(value = "reservationStatus", alternate = ["ReservationStatus"])
    val reservationStatus: String? = null,
    @SerializedName(value = "reservedBy", alternate = ["ReservedBy"])
    val reservedBy: String? = null
)

data class AvailableSlotsResponse(
    val success: Boolean?,
    val message: String?,
    val data: List<AvailableSlot>?
)

interface OperatorNodeApi {
    @GET("nodes")
    suspend fun getNodes(): Response<MicrogridNodesResponse>

    @GET("nodes/{nodeId}")
    suspend fun getNode(@Path("nodeId") nodeId: String): Response<MicrogridNodeResponse>

    @GET("nodes/{nodeId}/slots")
    suspend fun getAvailableSlots(
        @Path("nodeId") nodeId: String,
        @Query("date") date: String
    ): Response<AvailableSlotsResponse>

    @PUT("nodes/{nodeId}/battery-slots")
    suspend fun updateBatterySlots(
        @Path("nodeId") nodeId: String,
        @Body request: UpdateBatterySlotsRequest
    ): Response<MicrogridNodeResponse>
}
