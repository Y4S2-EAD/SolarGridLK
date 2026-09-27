package com.solargridlk.mobile.data.model

data class LoginResponse(
    val success: Boolean,
    val message: String,
    val data: LoginData?
)

data class LoginData(
    val token: String,
    val username: String,
    val role: String,
    val fullName: String,
    val expiresAt: String
)
