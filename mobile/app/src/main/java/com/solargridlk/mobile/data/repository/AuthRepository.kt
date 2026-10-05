package com.solargridlk.mobile.data.repository

import com.solargridlk.mobile.data.api.AuthApi
import com.solargridlk.mobile.data.model.LoginRequest
import com.solargridlk.mobile.data.model.LoginResponse
import com.solargridlk.mobile.data.model.ProsumerLoginRequest
import retrofit2.Response

class AuthRepository(
    private val authApi: AuthApi
) {

    suspend fun login(
        username: String,
        password: String
    ): Response<LoginResponse> {
        return authApi.login(
            LoginRequest(
                username = username,
                password = password
            )
        )
    }

    // Sign in a prosumer. The response uses the same session fields as staff login.
    suspend fun prosumerLogin(
        nic: String,
        password: String
    ): Response<LoginResponse> {
        return authApi.prosumerLogin(
            ProsumerLoginRequest(
                nic = nic,
                password = password
            )
        )
    }
}