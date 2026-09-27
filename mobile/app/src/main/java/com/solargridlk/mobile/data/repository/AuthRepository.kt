package com.solargridlk.mobile.data.repository

import com.solargridlk.mobile.data.api.AuthApi
import com.solargridlk.mobile.data.model.LoginRequest
import com.solargridlk.mobile.data.model.LoginResponse
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
}