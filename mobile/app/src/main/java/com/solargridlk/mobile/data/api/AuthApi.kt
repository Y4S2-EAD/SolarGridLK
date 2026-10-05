package com.solargridlk.mobile.data.api

import com.solargridlk.mobile.data.model.LoginRequest
import com.solargridlk.mobile.data.model.LoginResponse
import com.solargridlk.mobile.data.model.ProsumerLoginRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthApi {

    @POST("auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<LoginResponse>

    // Authenticate a prosumer by NIC. This does not use the staff login route.
    @POST("auth/prosumer-login")
    suspend fun prosumerLogin(
        @Body request: ProsumerLoginRequest
    ): Response<LoginResponse>
}