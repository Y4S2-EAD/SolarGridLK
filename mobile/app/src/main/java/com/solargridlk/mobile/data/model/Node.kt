package com.solargridlk.mobile.data.model
import com.google.gson.annotations.SerializedName

data class Node(
    @SerializedName("nodeId") val id: String?,
    val name: String?,
    val latitude: Double?,
    val longitude: Double?,
    val status: String?,
    val capacityKw: Double?,
    val location: String?
)

data class NodesResponse(
    val success: Boolean?,
    val message: String?,
    val data: List<Node>?
)