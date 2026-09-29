package com.solargridlk.mobile.data.model

data class NodeScheduleSlot(
    val dayOfWeek: String?,
    val startTime: String?,
    val endTime: String?
)

data class MicrogridNode(
    val nodeId: String?,
    val name: String?,
    val location: String?,
    val latitude: Double?,
    val longitude: Double?,
    val capacityKw: Double?,
    val availableBatterySlots: Int?,
    val schedule: List<NodeScheduleSlot>?,
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
