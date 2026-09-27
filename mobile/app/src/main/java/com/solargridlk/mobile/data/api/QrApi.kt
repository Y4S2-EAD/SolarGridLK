package com.solargridlk.mobile.data.api

import com.solargridlk.mobile.data.model.QrVerifyRequest
import com.solargridlk.mobile.data.model.QrVerifyResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST
import com.solargridlk.mobile.data.model.QrImageResponse
import retrofit2.http.GET
import retrofit2.http.Path

interface QrApi {

    @POST("qr/verify")
    suspend fun verify(
        @Body request: QrVerifyRequest
    ): Response<QrVerifyResponse>

    @GET("qr/reservations/{id}/image")
    suspend fun getImage(@Path("id") id: String): Response<QrImageResponse>
}