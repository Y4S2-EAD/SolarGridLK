package com.solargridlk.mobile.ui.gridoperator

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.solargridlk.mobile.R
import com.solargridlk.mobile.data.api.RetrofitClient
import com.solargridlk.mobile.data.model.MicrogridNode
import com.solargridlk.mobile.data.repository.OperatorNodeRepository
import com.solargridlk.mobile.ui.auth.LoginActivity
import com.solargridlk.mobile.utils.SessionManager
import kotlinx.coroutines.launch
import java.io.IOException

class NodeOperationDetailsActivity : AppCompatActivity() {

    private lateinit var sessionManager: SessionManager
    private lateinit var repository: OperatorNodeRepository
    private lateinit var progressBar: ProgressBar
    private lateinit var errorText: TextView
    private lateinit var successText: TextView
    private lateinit var detailsCard: View
    private lateinit var slotsInput: EditText
    private lateinit var decreaseButton: Button
    private lateinit var increaseButton: Button
    private lateinit var updateButton: Button

    private var nodeId: String = ""
    private var nodeActive = false
    private var saving = false

    override fun onCreate(savedInstanceState: Bundle?) {
        // Open one node and allow only a battery-slot update.
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_node_operation_details)

        sessionManager = SessionManager(this)
        if (!sessionManager.isLoggedIn() || sessionManager.getRole() != "GridOperator") {
            openLogin()
            return
        }

        nodeId = intent.getStringExtra(EXTRA_NODE_ID)?.trim().orEmpty()
        repository = OperatorNodeRepository(RetrofitClient.getOperatorNodeApi(this))
        progressBar = findViewById(R.id.progressBar)
        errorText = findViewById(R.id.errorText)
        successText = findViewById(R.id.successText)
        detailsCard = findViewById(R.id.detailsCard)
        slotsInput = findViewById(R.id.slotsInput)
        decreaseButton = findViewById(R.id.decreaseButton)
        increaseButton = findViewById(R.id.increaseButton)
        updateButton = findViewById(R.id.updateButton)

        findViewById<View>(R.id.backButton).setOnClickListener { finish() }
        decreaseButton.setOnClickListener { stepSlots(-1) }
        increaseButton.setOnClickListener { stepSlots(1) }
        updateButton.setOnClickListener { updateSlots() }

        if (nodeId.isEmpty()) {
            showError("Node not found.")
            return
        }

        loadNode()
    }

    private fun loadNode() {
        // Load the node from the API before showing editable availability.
        progressBar.visibility = View.VISIBLE
        errorText.visibility = View.GONE
        detailsCard.visibility = View.GONE

        lifecycleScope.launch {
            try {
                val response = repository.getNode(nodeId)
                progressBar.visibility = View.GONE

                if (response.code() == 401) {
                    sessionManager.clearSession()
                    openLogin()
                    return@launch
                }

                if (response.code() == 404) {
                    showError("Node not found.")
                    return@launch
                }

                val node = response.body()?.data
                if (!response.isSuccessful || response.body()?.success != true || node == null) {
                    showError(apiMessage(response.errorBody()?.string(), response.body()?.message, "Unable to load the node."))
                    return@launch
                }

                bindNode(node)
            } catch (_: IOException) {
                progressBar.visibility = View.GONE
                showError("Unable to connect to the server.")
            }
        }
    }

    private fun bindNode(node: MicrogridNode) {
        // Display the server node and enable editing only while it is active.
        nodeActive = node.status == "Active"
        findViewById<TextView>(R.id.nodeIdText).text = node.nodeId ?: "—"
        findViewById<TextView>(R.id.nodeNameText).text = node.name ?: "—"
        val statusView = findViewById<TextView>(R.id.statusText)
        statusView.text = if (nodeActive) "● ACTIVE" else "● ${node.status ?: "Unknown"}"
        statusView.setTextColor(getColor(if (nodeActive) R.color.success else R.color.error))
        findViewById<TextView>(R.id.locationText).text = node.location?.ifBlank { "—" } ?: "—"
        findViewById<TextView>(R.id.gpsText).text = formatGps(node.latitude, node.longitude)
        findViewById<TextView>(R.id.capacityText).text = formatCapacity(node.capacityKw)
        findViewById<TextView>(R.id.batteryCountText).text = (node.availableBatterySlots ?: 0).toString()
        findViewById<TextView>(R.id.scheduleText).text = formatSchedule(node)
        slotsInput.setText((node.availableBatterySlots ?: 0).toString())
        detailsCard.visibility = View.VISIBLE
        setEditingEnabled(nodeActive && !saving)
    }

    private fun stepSlots(delta: Int) {
        // Keep the draft at zero or above before the operator submits it.
        if (!nodeActive || saving) {
            return
        }

        val current = slotsInput.text?.toString()?.toIntOrNull() ?: 0
        slotsInput.setText((current + delta).coerceAtLeast(0).toString())
        successText.visibility = View.GONE
    }

    private fun updateSlots() {
        // Submit the draft count and replace the screen with the server response.
        if (!nodeActive || saving) {
            return
        }

        val raw = slotsInput.text?.toString()?.trim().orEmpty()
        if (!raw.matches(Regex("\\d+"))) {
            showError("Available battery slots must be a whole number.")
            return
        }

        val value = raw.toIntOrNull()
        if (value == null || value < 0) {
            showError("Available battery slots cannot be negative.")
            return
        }

        saving = true
        setEditingEnabled(false)
        progressBar.visibility = View.VISIBLE
        errorText.visibility = View.GONE
        successText.visibility = View.GONE

        lifecycleScope.launch {
            try {
                val response = repository.updateBatterySlots(nodeId, value)
                progressBar.visibility = View.GONE
                saving = false

                if (response.code() == 401) {
                    sessionManager.clearSession()
                    openLogin()
                    return@launch
                }

                val updated = response.body()?.data
                if (!response.isSuccessful || response.body()?.success != true || updated == null) {
                    setEditingEnabled(nodeActive)
                    showError(
                        apiMessage(
                            response.errorBody()?.string(),
                            response.body()?.message,
                            "Unable to update battery slot availability."
                        )
                    )
                    return@launch
                }

                bindNode(updated)
                successText.text = "Battery slot availability updated successfully."
                successText.visibility = View.VISIBLE
            } catch (_: IOException) {
                progressBar.visibility = View.GONE
                saving = false
                setEditingEnabled(nodeActive)
                showError("Unable to connect to the server.")
            }
        }
    }

    private fun setEditingEnabled(enabled: Boolean) {
        // Block edits while a request is running or the node is deactivated.
        decreaseButton.isEnabled = enabled
        increaseButton.isEnabled = enabled
        slotsInput.isEnabled = enabled
        updateButton.isEnabled = enabled
    }

    private fun showError(message: String) {
        // Show a user-facing message without a stack trace.
        errorText.text = message
        errorText.visibility = View.VISIBLE
        successText.visibility = View.GONE
    }

    private fun openLogin() {
        // Leave the operator screens when the session is missing or rejected.
        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    private fun formatGps(latitude: Double?, longitude: Double?): String {
        if (latitude == null || longitude == null) {
            return "—"
        }
        return "$latitude, $longitude"
    }

    private fun formatCapacity(capacityKw: Double?): String {
        if (capacityKw == null) {
            return "—"
        }
        val text = if (capacityKw % 1.0 == 0.0) capacityKw.toInt().toString() else capacityKw.toString()
        return "$text kW"
    }

    private fun formatSchedule(node: MicrogridNode): String {
        val schedule = node.schedule.orEmpty()
        if (schedule.isEmpty()) {
            return "No schedule set."
        }
        return schedule.joinToString("\n") { slot ->
            "${slot.dayOfWeek ?: "—"}  ${slot.startTime ?: "—"} – ${slot.endTime ?: "—"}"
        }
    }

    companion object {
        const val EXTRA_NODE_ID = "nodeId"
    }
}
