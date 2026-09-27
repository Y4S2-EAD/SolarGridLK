package com.solargridlk.mobile.data.api

import com.solargridlk.mobile.BuildConfig
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {

    // Not const — BuildConfig fields aren't compile-time constants.
    val BASE_URL = BuildConfig.API_BASE_URL

    val authApi: AuthApi by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(AuthApi::class.java)
    }
}