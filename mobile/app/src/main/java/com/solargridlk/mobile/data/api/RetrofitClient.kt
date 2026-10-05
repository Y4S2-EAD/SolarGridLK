package com.solargridlk.mobile.data.api

import com.solargridlk.mobile.BuildConfig
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import android.content.Context
import com.solargridlk.mobile.utils.SessionManager
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor


object RetrofitClient {

    // Not const — BuildConfig fields aren't compile-time constants.
    val BASE_URL = BuildConfig.API_BASE_URL
    // Unauthenticated API for Login
    val authApi: AuthApi by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(AuthApi::class.java)
    }

    // Unauthenticated API for public prosumer registration.
    val prosumerApi: ProsumerApi by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ProsumerApi::class.java)
    }

    // Authenticated prosumer profile calls. No body logging, so passwords are not written to logcat.
    fun getAuthenticatedProsumerApi(context: Context): ProsumerApi {
        val sessionManager = SessionManager(context.applicationContext)
        val client = OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(sessionManager))
            .build()

        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ProsumerApi::class.java)
    }

    // Factory method for authenticated ReservationApi
    fun getReservationApi(context: Context): ReservationApi {
        val sessionManager = SessionManager(context.applicationContext)

        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(sessionManager))
            .addInterceptor(logging)
            .build()

        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ReservationApi::class.java)
    }

    // Authenticated Grid Operator node reads and battery-slot updates.
    fun getOperatorNodeApi(context: Context): OperatorNodeApi {
        val sessionManager = SessionManager(context.applicationContext)
        val client = OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(sessionManager))
            .build()

        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(OperatorNodeApi::class.java)
    }
}