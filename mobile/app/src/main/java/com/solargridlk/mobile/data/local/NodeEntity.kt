package com.solargridlk.mobile.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "nodes")
data class NodeEntity(
    @PrimaryKey val id: String,
    val name: String?,
    val latitude: Double?,
    val longitude: Double?,
    val status: String?,
    val capacityKw: Double?
)