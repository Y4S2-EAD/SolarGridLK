/*
 * File: OperatorNodeRepository.kt
 * Description: Loads microgrid nodes and submits battery-slot updates for Grid Operators.
 */
package com.solargridlk.mobile.data.repository

import com.solargridlk.mobile.data.api.OperatorNodeApi
import com.solargridlk.mobile.data.model.MicrogridNodeResponse
import com.solargridlk.mobile.data.model.MicrogridNodesResponse
import com.solargridlk.mobile.data.model.UpdateBatterySlotsRequest
import retrofit2.Response

class OperatorNodeRepository(
    private val nodeApi: OperatorNodeApi
) {
    // Load every microgrid node from the API.
    suspend fun getNodes(): Response<MicrogridNodesResponse> {
        return nodeApi.getNodes()
    }

    // Load one microgrid node by its public id.
    suspend fun getNode(nodeId: String): Response<MicrogridNodeResponse> {
        return nodeApi.getNode(nodeId)
    }

    // Send a battery-slot count. The returned node is the server value.
    suspend fun updateBatterySlots(
        nodeId: String,
        availableBatterySlots: Int
    ): Response<MicrogridNodeResponse> {
        return nodeApi.updateBatterySlots(
            nodeId,
            UpdateBatterySlotsRequest(availableBatterySlots)
        )
    }
}
