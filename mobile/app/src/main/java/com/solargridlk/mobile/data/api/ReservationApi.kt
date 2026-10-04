package com.solargridlk.mobile.data.api

import com.solargridlk.mobile.data.model.DashboardSummaryResponse
import com.solargridlk.mobile.data.model.ReservationListResponse
import com.solargridlk.mobile.data.model.ReservationSingleResponse
import com.solargridlk.mobile.data.model.UpdateReservationRequest
import com.solargridlk.mobile.data.model.CreateReservationRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.POST

interface ReservationApi {

    // 1. List reservations (for history / search)
    @GET("reservations")
    suspend fun getReservations(
        @Query("prosumerNic") prosumerNic: String? = null,
        @Query("status") status: String? = null,
        @Query("search") search: String? = null
    ): Response<ReservationListResponse>

    // 2. Dashboard counts
    @GET("reservations/dashboard")
    suspend fun getDashboardSummary(
        @Query("prosumerNic") prosumerNic: String
    ): Response<DashboardSummaryResponse>

    // 3. Get single reservation
    @GET("reservations/{id}")
    suspend fun getReservationById(
        @Path("id") id: String
    ): Response<ReservationSingleResponse>

    // 4. Update (modify slot time)
    @PUT("reservations/{id}")
    suspend fun updateReservation(
        @Path("id") id: String,
        @Body request: UpdateReservationRequest
    ): Response<ReservationSingleResponse>

    // 5. Cancel reservation
    @DELETE("reservations/{id}")
    suspend fun deleteReservation(
        @Path("id") id: String
    ): Response<ReservationSingleResponse>

    // 6. Create reservation
    @POST("reservations")
    suspend fun createReservation(
        @Body request: CreateReservationRequest
    ): Response<ReservationSingleResponse>

    // 7. Approve reservation (GridOperator / Staff action)
    @POST("reservations/{id}/approve")
    suspend fun approveReservation(
        @Path("id") id: String
    ): Response<ReservationSingleResponse>
}