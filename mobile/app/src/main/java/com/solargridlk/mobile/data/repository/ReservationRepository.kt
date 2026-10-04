package com.solargridlk.mobile.data.repository

import com.solargridlk.mobile.data.api.ReservationApi
import com.solargridlk.mobile.data.model.DashboardSummaryResponse
import com.solargridlk.mobile.data.model.ReservationListResponse
import com.solargridlk.mobile.data.model.ReservationSingleResponse
import com.solargridlk.mobile.data.model.UpdateReservationRequest
import com.solargridlk.mobile.data.model.CreateReservationRequest
import retrofit2.Response

class ReservationRepository(private val reservationApi: ReservationApi) {

    suspend fun getReservations(
        prosumerNic: String? = null,
        status: String? = null,
        search: String? = null
    ): Response<ReservationListResponse> {
        return reservationApi.getReservations(
            prosumerNic = prosumerNic,
            status = status,
            search = search
        )
    }

    suspend fun getDashboardSummary(
        prosumerNic: String
    ): Response<DashboardSummaryResponse> {
        return reservationApi.getDashboardSummary(prosumerNic)
    }

    suspend fun getReservationById(
        id: String
    ): Response<ReservationSingleResponse> {
        return reservationApi.getReservationById(id)
    }

    suspend fun updateReservation(
        id: String,
        request: UpdateReservationRequest
    ): Response<ReservationSingleResponse> {
        return reservationApi.updateReservation(id, request)
    }

    suspend fun cancelReservation(
        id: String
    ): Response<ReservationSingleResponse> {
        return reservationApi.deleteReservation(id)
    }

    suspend fun createReservation(
        request: CreateReservationRequest
    ): Response<ReservationSingleResponse> {
        return reservationApi.createReservation(request)
    }

    suspend fun approveReservation(
        id: String
    ): Response<ReservationSingleResponse> {
        return reservationApi.approveReservation(id)
    }
}