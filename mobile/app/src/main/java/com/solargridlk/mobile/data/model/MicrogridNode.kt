package com.solargridlk.mobile.data.model

import com.google.gson.annotations.SerializedName

data class NodeScheduleSlot(
    @SerializedName(value = "dayOfWeek", alternate = ["DayOfWeek"])
    val dayOfWeek: String?,
    @SerializedName(value = "startTime", alternate = ["StartTime"])
    val startTime: String?,
    @SerializedName(value = "endTime", alternate = ["EndTime"])
    val endTime: String?
)

data class MicrogridNode(
    @SerializedName(value = "nodeId", alternate = ["NodeId", "id", "Id"])
    val nodeId: String?,
    @SerializedName(value = "name", alternate = ["Name"])
    val name: String?,
    @SerializedName(value = "location", alternate = ["Location"])
    val location: String?,
    @SerializedName(value = "latitude", alternate = ["Latitude"])
    val latitude: Double?,
    @SerializedName(value = "longitude", alternate = ["Longitude"])
    val longitude: Double?,
    @SerializedName(value = "capacityKw", alternate = ["CapacityKw"])
    val capacityKw: Double?,
    @SerializedName(value = "availableBatterySlots", alternate = ["AvailableBatterySlots"])
    val availableBatterySlots: Int?,
    @SerializedName(value = "schedule", alternate = ["Schedule"])
    val schedule: List<NodeScheduleSlot>?,
    @SerializedName(value = "status", alternate = ["Status"])
    val status: String?
)

data class MicrogridNodesResponse(
    val success: Boolean?,
    val message: String?,
    val data: List<MicrogridNode>?
)

data class MicrogridNodeResponse(
    val success: Boolean?,
    val message: String?,
    val data: MicrogridNode?
)

data class UpdateBatterySlotsRequest(
    val availableBatterySlots: Int
)
