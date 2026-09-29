package com.solargridlk.mobile.ui.prosumer

import android.app.DatePickerDialog
import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.solargridlk.mobile.R
import com.solargridlk.mobile.data.api.NodeApiClient
import com.solargridlk.mobile.data.api.RetrofitClient
import com.solargridlk.mobile.data.model.CreateReservationRequest
import com.solargridlk.mobile.data.model.MicrogridNode
import com.solargridlk.mobile.data.model.Reservation
import com.solargridlk.mobile.data.model.UpdateReservationRequest
import com.solargridlk.mobile.data.repository.ReservationRepository
import com.solargridlk.mobile.ui.auth.LoginActivity
import com.solargridlk.mobile.ui.gridoperator.NodesMapActivity
import com.solargridlk.mobile.utils.SessionManager
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

class ProsumerHomeActivity : AppCompatActivity() {

    private lateinit var sessionManager: SessionManager
    private lateinit var reservationRepository: ReservationRepository
    private lateinit var adapter: ReservationAdapter

    private lateinit var welcomeText: TextView
    private lateinit var accountNameText: TextView
    private lateinit var nicText: TextView
    private lateinit var avatarInitialText: TextView
    private lateinit var activeCountText: TextView
    private lateinit var pendingCountText: TextView
    private lateinit var approvedCountText: TextView
    private lateinit var searchInput: EditText
    private lateinit var mapButton: Button
    private lateinit var createButton: Button
    private lateinit var errorText: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var reservationsRecyclerView: RecyclerView
    private lateinit var logoutButton: TextView

    private var allReservations: List<Reservation> = emptyList()

    // Fallback static nodes
    private val fallbackNodes = arrayOf("NODE-001", "TESTNODE01", "TESTNODE02")

    // Map Picker Result Launcher
    private val mapNodePickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK && result.data != null) {
            val nodeId = result.data?.getStringExtra("SELECTED_NODE_ID") ?: ""
            val nodeName = result.data?.getStringExtra("SELECTED_NODE_NAME") ?: nodeId

            if (nodeId.isNotEmpty()) {
                selectDateAndScheduleForNode(nodeId, nodeName)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // Initialize prosumer dashboard screen, session, and views.
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_prosumer_home)

        sessionManager = SessionManager(this)
        reservationRepository = ReservationRepository(RetrofitClient.getReservationApi(this))

        if (!sessionManager.isLoggedIn()) {
            openLogin()
            return
        }

        initializeViews()
        setupRecyclerView()
        setupSearch()
        setupMapButton()
        setupCreateButton()
        setupProfileButton()
        setupLogout()

        loadDashboard()
    }

    override fun onResume() {
        // Refresh the header after a profile save.
        super.onResume()
        if (::welcomeText.isInitialized) {
            bindAccountHeader()
        }
    }

    private fun openLogin() {
        // Send an unauthenticated visitor to login.
        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    private fun initializeViews() {
        // Bind UI controls from activity_prosumer_home.xml
        welcomeText = findViewById(R.id.welcomeText)
        accountNameText = findViewById(R.id.accountNameText)
        nicText = findViewById(R.id.nicText)
        avatarInitialText = findViewById(R.id.avatarInitialText)
        activeCountText = findViewById(R.id.activeCountText)
        pendingCountText = findViewById(R.id.pendingCountText)
        approvedCountText = findViewById(R.id.approvedCountText)
        searchInput = findViewById(R.id.searchInput)
        mapButton = findViewById(R.id.mapButton)
        createButton = findViewById(R.id.createButton)
        errorText = findViewById(R.id.errorText)
        progressBar = findViewById(R.id.progressBar)
        reservationsRecyclerView = findViewById(R.id.reservationsRecyclerView)
        logoutButton = findViewById(R.id.logoutButton)

        bindAccountHeader()
    }

    private fun bindAccountHeader() {
        // Fill the welcome header from the signed-in session.
        val fullName = sessionManager.getFullName()?.trim().orEmpty()
        val displayName = if (fullName.isNotEmpty()) fullName else "Prosumer"
        val nic = sessionManager.getUsername()?.trim().orEmpty().ifEmpty { "—" }
        val role = sessionManager.getRole()?.trim().orEmpty().ifEmpty { "Prosumer" }

        welcomeText.text = "Welcome back, $displayName"
        accountNameText.text = displayName
        nicText.text = "$role • $nic"
        avatarInitialText.text = displayName.first().uppercaseChar().toString()
    }

    private fun setupRecyclerView() {
        // Configure RecyclerView adapter and item click callbacks
        adapter = ReservationAdapter(
            onCancelClick = { reservation -> confirmCancel(reservation) },
            onQrClick = { reservation -> openQrDisplay(reservation) },
            onModifyClick = { reservation ->
                showDateTimePicker { utcString, displayString ->
                    modifyReservation(reservation.id, utcString, displayString, reservation.nodeId)
                }
            }
        )
        reservationsRecyclerView.layoutManager = LinearLayoutManager(this)
        reservationsRecyclerView.adapter = adapter
    }

    private fun setupSearch() {
        // Filter reservation list dynamically as user types query
        searchInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                filterList(s.toString())
            }
            override fun afterTextChanged(s: Editable?) {}
        })
    }

    private fun setupMapButton() {
        // Open Google Maps activity showing nearby microgrid nodes
        mapButton.setOnClickListener {
            startActivity(Intent(this, NodesMapActivity::class.java))
        }
    }

    private fun setupCreateButton() {
        // Offer map touch selection or list selection when creating a reservation
        createButton.setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle("New Reservation")
                .setItems(arrayOf("Select Active Node on Map 🗺️", "Select Node from List 📋")) { _, which ->
                    if (which == 0) {
                        val intent = Intent(this, NodesMapActivity::class.java).apply {
                            putExtra("IS_PICKER_MODE", true)
                        }
                        mapNodePickerLauncher.launch(intent)
                    } else {
                        showNodeSelectionListDialog()
                    }
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

    private fun setupProfileButton() {
        // Open the signed-in prosumer profile
        findViewById<View>(R.id.profileButton).setOnClickListener {
            startActivity(Intent(this, ProsumerProfileActivity::class.java))
        }
    }

    private fun setupLogout() {
        // Clear local auth session and redirect user to login screen
        logoutButton.setOnClickListener {
            sessionManager.clearSession()
            val intent = Intent(this, LoginActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
        }
    }

    private fun showNodeSelectionListDialog() {
        // Fetch live microgrid nodes from API or fallback to static list
        lifecycleScope.launch {
            val liveNodes = try {
                val res = NodeApiClient.create(this@ProsumerHomeActivity).getNodes()
                if (res.isSuccessful && !res.body()?.data.isNullOrEmpty()) {
                    res.body()?.data?.filter { !it.id.isNullOrBlank() }
                } else null
            } catch (e: Exception) {
                null
            }

            val displayList = if (!liveNodes.isNullOrEmpty()) {
                liveNodes.map { "${it.name ?: it.id} (${it.id})" }.toTypedArray()
            } else {
                fallbackNodes
            }

            val idList = if (!liveNodes.isNullOrEmpty()) {
                liveNodes.map { it.id!! }.toTypedArray()
            } else {
                fallbackNodes
            }

            AlertDialog.Builder(this@ProsumerHomeActivity)
                .setTitle("Select Microgrid Node")
                .setItems(displayList) { _, which ->
                    val selectedNodeId = idList[which]
                    val selectedNodeName = displayList[which].substringBefore(" (")
                    selectDateAndScheduleForNode(selectedNodeId, selectedNodeName)
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

    private fun selectDateAndScheduleForNode(nodeId: String, nodeName: String) {
        // Select booking date on calendar and query grid side schedules for day of week
        val calendar = Calendar.getInstance()

        val datePicker = DatePickerDialog(
            this,
            { _, year, month, dayOfMonth ->
                calendar.set(Calendar.YEAR, year)
                calendar.set(Calendar.MONTH, month)
                calendar.set(Calendar.DAY_OF_MONTH, dayOfMonth)

                val dayOfWeekFormat = SimpleDateFormat("EEEE", Locale.US)
                val dayOfWeek = dayOfWeekFormat.format(calendar.time)

                fetchScheduleAndPickTimeSlot(nodeId, nodeName, calendar, dayOfWeek)
            },
            calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH),
            calendar.get(Calendar.DAY_OF_MONTH)
        )

        val now = System.currentTimeMillis()
        datePicker.datePicker.minDate = now
        datePicker.datePicker.maxDate = now + (7L * 24 * 60 * 60 * 1000)
        datePicker.show()
    }

    private fun generate30MinSlots(startStr: String?, endStr: String?): List<String> {
        // Slice an operating window into 30-minute bookable slots
        if (startStr.isNullOrBlank() || endStr.isNullOrBlank()) return emptyList()
        val startHour = startStr.substringBefore(":").toIntOrNull() ?: return listOf("$startStr - $endStr")
        val startMin = startStr.substringAfter(":").substringBefore(" ").toIntOrNull() ?: 0
        val endHour = endStr.substringBefore(":").toIntOrNull() ?: return listOf("$startStr - $endStr")
        val endMin = endStr.substringAfter(":").substringBefore(" ").toIntOrNull() ?: 0

        val startTotalMin = startHour * 60 + startMin
        val endTotalMin = endHour * 60 + endMin
        if (startTotalMin >= endTotalMin) return listOf("$startStr - $endStr")

        val slots = mutableListOf<String>()
        var current = startTotalMin
        while (current + 30 <= endTotalMin) {
            val sh = current / 60
            val sm = current % 60
            val eh = (current + 30) / 60
            val em = (current + 30) % 60
            slots.add(String.format(Locale.US, "%02d:%02d - %02d:%02d", sh, sm, eh, em))
            current += 30
        }
        return slots
    }

    private fun fetchScheduleAndPickTimeSlot(
        nodeId: String,
        nodeName: String,
        calendar: Calendar,
        dayOfWeek: String
    ) {
        // Query GET /api/nodes/{nodeId} or GET /api/nodes for admin-configured operating windows
        lifecycleScope.launch {
            try {
                showLoading(true)
                hideError()

                val operatorApi = RetrofitClient.getOperatorNodeApi(this@ProsumerHomeActivity)

                var nodeData: MicrogridNode? = null
                try {
                    val response = operatorApi.getNode(nodeId)
                    if (response.isSuccessful && response.body()?.data != null) {
                        nodeData = response.body()?.data
                    }
                } catch (_: Exception) {}

                if (nodeData == null || nodeData.schedule.isNullOrEmpty()) {
                    try {
                        val allNodesRes = operatorApi.getNodes()
                        if (allNodesRes.isSuccessful && !allNodesRes.body()?.data.isNullOrEmpty()) {
                            nodeData = allNodesRes.body()?.data?.find {
                                it.nodeId.equals(nodeId, ignoreCase = true) ||
                                        it.name.equals(nodeId, ignoreCase = true) ||
                                        it.name.equals(nodeName, ignoreCase = true)
                            }
                        }
                    } catch (_: Exception) {}
                }

                showLoading(false)

                val scheduleList = nodeData?.schedule ?: emptyList()

                val dayPrefix = dayOfWeek.take(3) // "Mon", "Thu", "Fri"
                val availableDaySlots = scheduleList.filter { slot ->
                    val day = slot.dayOfWeek?.trim() ?: ""
                    day.equals(dayOfWeek, ignoreCase = true) || day.equals(dayPrefix, ignoreCase = true)
                }

                if (availableDaySlots.isNotEmpty()) {
                    val all30MinSlots = mutableListOf<String>()
                    for (slot in availableDaySlots) {
                        val generated = generate30MinSlots(slot.startTime, slot.endTime)
                        if (generated.isNotEmpty()) {
                            all30MinSlots.addAll(generated)
                        } else {
                            all30MinSlots.add("${slot.startTime ?: "10:00"} - ${slot.endTime ?: "10:30"}")
                        }
                    }
                    showTimeSlotDialog(nodeId, nodeName, calendar, dayOfWeek, all30MinSlots.distinct().toTypedArray())
                } else {
                    val openDays = scheduleList.mapNotNull { it.dayOfWeek }.distinct().joinToString(", ")
                    val helpMsg = if (openDays.isNotBlank()) {
                        "$nodeName is closed on $dayOfWeek. Open operating days: $openDays"
                    } else {
                        "No operating slots configured by admin for $nodeName yet."
                    }
                    showError(helpMsg)
                }

            } catch (e: Exception) {
                showLoading(false)
                showError("Network error fetching schedule: ${e.message}")
            }
        }
    }

    private fun showTimeSlotDialog(
        nodeId: String,
        nodeName: String,
        calendar: Calendar,
        dayOfWeek: String,
        slots: Array<String>
    ) {
        // Display available 30-minute grid time slots for the chosen day
        AlertDialog.Builder(this)
            .setTitle("Select $nodeName Slot ($dayOfWeek)")
            .setItems(slots) { _, which ->
                val chosenSlot = slots[which]
                val timePart = chosenSlot.substringAfter(" ").ifEmpty { chosenSlot }
                val startTime = timePart.substringBefore(" - ").trim()

                val hour = startTime.substringBefore(":").toIntOrNull() ?: 10
                val minute = startTime.substringAfter(":").toIntOrNull() ?: 0

                calendar.set(Calendar.HOUR_OF_DAY, hour)
                calendar.set(Calendar.MINUTE, minute)
                calendar.set(Calendar.SECOND, 0)

                if (calendar.timeInMillis <= System.currentTimeMillis()) {
                    showError("Slot time must be in the future.")
                    return@setItems
                }

                val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault()).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                val newSlotDateTimeUtc = isoFormat.format(calendar.time)

                val displayFormat = SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.getDefault())
                val displayTime = displayFormat.format(calendar.time)

                createReservation(nodeId, newSlotDateTimeUtc, displayTime)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showDateTimePicker(onDateTimePicked: (utcIsoString: String, displayLocalString: String) -> Unit) {
        // Present date and time pickers with min/max restrictions
        val calendar = Calendar.getInstance()

        val datePicker = DatePickerDialog(
            this,
            { _, year, month, dayOfMonth ->
                calendar.set(Calendar.YEAR, year)
                calendar.set(Calendar.MONTH, month)
                calendar.set(Calendar.DAY_OF_MONTH, dayOfMonth)

                val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault()).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                val newSlotDateTimeUtc = isoFormat.format(calendar.time)

                val localFormat = SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.getDefault())
                val displayLocalTime = localFormat.format(calendar.time)

                onDateTimePicked(newSlotDateTimeUtc, displayLocalTime)
            },
            calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH),
            calendar.get(Calendar.DAY_OF_MONTH)
        )

        val now = System.currentTimeMillis()
        datePicker.datePicker.minDate = now
        datePicker.datePicker.maxDate = now + (7L * 24 * 60 * 60 * 1000)
        datePicker.show()
    }

    private fun createReservation(nodeId: String, newSlotDateTimeUtc: String, displayLocalTime: String) {
        // Send a new reservation request to the backend API
        val prosumerNic = sessionManager.getUsername() ?: ""
        if (prosumerNic.isEmpty()) {
            showError("No session found. Please log in again.")
            return
        }

        lifecycleScope.launch {
            try {
                showLoading(true)
                hideError()

                val request = CreateReservationRequest(
                    prosumerNic = prosumerNic,
                    nodeId = nodeId,
                    slotDateTime = newSlotDateTimeUtc
                )
                val response = reservationRepository.createReservation(request)

                if (response.isSuccessful && response.body()?.success == true) {
                    showSuccessDialog(
                        "Reservation Created",
                        "Successfully reserved slot at $nodeId for:\n$displayLocalTime"
                    )
                    loadDashboard()
                } else {
                    val rawError = response.errorBody()?.string()
                    showError(parseErrorMessage(rawError, response.code(), response.body()?.message ?: "Failed to create reservation."))
                }
            } catch (e: Exception) {
                showError("Error creating reservation: ${e.message}")
            } finally {
                showLoading(false)
            }
        }
    }

    private fun modifyReservation(
        reservationId: String,
        newSlotDateTimeUtc: String,
        displayLocalTime: String,
        nodeId: String
    ) {
        // Send a slot time modification request to backend API
        lifecycleScope.launch {
            try {
                showLoading(true)
                hideError()

                val request = UpdateReservationRequest(slotDateTime = newSlotDateTimeUtc)
                val response = reservationRepository.updateReservation(reservationId, request)

                if (response.isSuccessful && response.body()?.success == true) {
                    showSuccessDialog("Modification Successful", "Slot time for $nodeId updated to:\n$displayLocalTime")
                    loadDashboard()
                } else {
                    val rawError = response.errorBody()?.string()
                    showError(parseErrorMessage(rawError, response.code(), response.body()?.message ?: "Modification failed."))
                }
            } catch (e: Exception) {
                showError("Error modifying reservation: ${e.message}")
            } finally {
                showLoading(false)
            }
        }
    }

    private fun loadDashboard() {
        // Fetch dashboard counts and prosumer reservations list
        val nic = sessionManager.getUsername()
        if (nic.isNullOrEmpty()) {
            showError("No session found. Please log in again.")
            return
        }

        lifecycleScope.launch {
            try {
                showLoading(true)
                hideError()

                val summaryResponse = reservationRepository.getDashboardSummary(nic)
                val listResponse = reservationRepository.getReservations(prosumerNic = nic)

                if (summaryResponse.isSuccessful && summaryResponse.body()?.success == true) {
                    val summary = summaryResponse.body()?.data
                    activeCountText.text = (summary?.activeCount ?: 0).toString()
                    pendingCountText.text = (summary?.pendingCount ?: 0).toString()
                    approvedCountText.text = (summary?.approvedFutureCount ?: 0).toString()
                } else {
                    activeCountText.text = "0"
                    pendingCountText.text = "0"
                    approvedCountText.text = "0"
                }

                if (listResponse.isSuccessful && listResponse.body()?.success == true) {
                    allReservations = listResponse.body()?.data ?: emptyList()
                    adapter.submitList(allReservations)
                } else {
                    val rawError = listResponse.errorBody()?.string()
                    showError(parseErrorMessage(rawError, listResponse.code(), listResponse.body()?.message))
                }

            } catch (e: Exception) {
                showError("Unable to connect to server: ${e.message}")
            } finally {
                showLoading(false)
            }
        }
    }

    private fun filterList(query: String) {
        // Filter cached reservation list based on query
        val filtered = if (query.isBlank()) {
            allReservations
        } else {
            allReservations.filter {
                it.nodeId.contains(query, ignoreCase = true) ||
                        it.status.contains(query, ignoreCase = true)
            }
        }
        adapter.submitList(filtered)
    }

    private fun openQrDisplay(reservation: Reservation) {
        // Open QR display screen for an approved reservation
        val intent = Intent(this, QrDisplayActivity::class.java).apply {
            putExtra("reservationId", reservation.id)
            putExtra("detail", "${reservation.nodeId} · ${reservation.slotDateTime}")
        }
        startActivity(intent)
    }

    private fun confirmCancel(reservation: Reservation) {
        // Display cancellation confirmation dialog to user
        AlertDialog.Builder(this)
            .setTitle("Cancel Reservation")
            .setMessage("Are you sure you want to cancel the reservation for ${reservation.nodeId}?")
            .setPositiveButton("Yes, Cancel") { _, _ -> cancelReservation(reservation.id, reservation.nodeId) }
            .setNegativeButton("No", null)
            .show()
    }

    private fun cancelReservation(reservationId: String, nodeId: String) {
        // Send cancellation DELETE request to backend API
        lifecycleScope.launch {
            try {
                showLoading(true)
                hideError()

                val response = reservationRepository.cancelReservation(reservationId)
                if (response.isSuccessful && response.body()?.success == true) {
                    showSuccessDialog("Cancellation Successful", "Reservation for $nodeId has been cancelled.")
                    loadDashboard()
                } else {
                    val rawError = response.errorBody()?.string()
                    showError(parseErrorMessage(rawError, response.code(), response.body()?.message ?: "Cancellation failed."))
                }
            } catch (e: Exception) {
                showError("Error cancelling reservation: ${e.message}")
            } finally {
                showLoading(false)
            }
        }
    }

    private fun parseErrorMessage(rawJson: String?, responseCode: Int = 0, fallbackMessage: String? = null): String {
        // Extract user-friendly error message from JSON error body or status code
        if (responseCode == 401) {
            return "Session expired. Please log in again."
        }
        if (!rawJson.isNullOrBlank()) {
            try {
                val json = JSONObject(rawJson)
                val msg = json.optString("message", "")
                if (msg.isNotBlank()) return msg
            } catch (e: Exception) {
                if (rawJson.length < 100) return rawJson
            }
        }
        return fallbackMessage ?: "Operation failed. Please try again."
    }

    private fun showSuccessDialog(title: String, message: String) {
        // Display a success confirmation dialog
        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton("OK", null)
            .show()
    }

    private fun showLoading(isLoading: Boolean) {
        // Toggle visibility of top progress bar
        progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
    }

    private fun showError(message: String) {
        // Display red error banner with given message
        errorText.text = message
        errorText.visibility = View.VISIBLE
    }

    private fun hideError() {
        // Hide error banner and reset message text
        errorText.text = ""
        errorText.visibility = View.GONE
    }
}
