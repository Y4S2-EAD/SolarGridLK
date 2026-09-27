package com.solargridlk.mobile.data.model

data class Node(
    val id: String?,
    val name: String?,
    val latitude: Double?,
    val longitude: Double?,
    val status: String?,       // Active/ Offline etc.
    val capacityKw: Double?     // optional
)

data class NodesResponse(
    val success: Boolean?,
    val message: String?,
    val data: List<Node>?
)