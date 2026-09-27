package com.solargridlk.mobile.data.api

import android.content.Context
import com.solargridlk.mobile.utils.SessionManager
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object QrApiClient {

    // Authenticated QR API — attaches the operator's JWT to every request.
    fun create(context: Context): QrApi {
        val session = SessionManager(context)

        val client = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val token = session.getToken()
                val builder = chain.request().newBuilder()
                if (!token.isNullOrEmpty()) {
                    builder.addHeader("Authorization", "Bearer $token")
                }
                chain.proceed(builder.build())
            }
            .build()

        return Retrofit.Builder()
            .baseUrl(RetrofitClient.BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(QrApi::class.java)
    }
}