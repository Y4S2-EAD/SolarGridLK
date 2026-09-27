package com.solargridlk.mobile.data.api

import com.solargridlk.mobile.data.model.NodesResponse
import retrofit2.Response
import retrofit2.http.GET

interface NodeApi {
    @GET("nodes")
    suspend fun getNodes(): Response<NodesResponse>
}