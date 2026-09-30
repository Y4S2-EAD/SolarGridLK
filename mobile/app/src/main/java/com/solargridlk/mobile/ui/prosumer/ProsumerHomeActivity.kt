/*
 * File: ProsumerHomeActivity.kt
 * Project: SolarGridLK.Mobile
 * Description: Prosumer home screen: dashboard counts, pending reservations, and the create / modify / cancel / QR reservation flows.
 * Author: Nipuni Bandara
 */

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
import com.solargridlk.mobile.data.api.AvailableSlot
import com.solargridlk.mobile.data.api.NodeApiClient
import com.solargridlk.mobile.data.api.RetrofitClient
import com.solargridlk.mobile.data.model.CreateReservationRequest
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
import java.util.UUID

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
    private lateinit var completedCountText: TextView
    private lateinit var searchInput: EditText
    private lateinit var mapButton: Button
    private lateinit var createButton: Button
    private lateinit var errorText: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var reservationsRecyclerView: RecyclerView
    private lateinit var logoutButton: TextView
    private lateinit var yourBookingsButton: View

    private var allReservations: List<Reservation> = emptyList()

    // Single action guard to prevent double-tap creates
    private var isReserving = false

    // Track if map picker was launched for modify
    private var pendingModifyReservation: Reservation? = null

    // Map Picker Result Launcher
    private val mapNodePickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK && result.data != null) {
            val nodeId = result.data?.getStringExtra("SELECTED_NODE_ID") ?: ""
            val nodeName = result.data?.getStringExtra("SELECTED_NODE_NAME") ?: nodeId

            if (nodeId.isNotEmpty()) {
                val modifyRes = pendingModifyReservation
                if (modifyRes != null) {
                    pendingModifyReservation = null
                    selectDateAndScheduleForModify(modifyRes.id, nodeId, nodeName)
                } else {
                    selectDateAndScheduleForNode(nodeId, nodeName)
                }
            }
        } else {
            pendingModifyReservation = null
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
        setupYourBookingsButton()
        setupLogout()

        loadDashboard()
    }

    override fun onResume() {
        // Refresh the header & dashboard after returning from profile or full history screen.
        super.onResume()
        if (::welcomeText.isInitialized) {
            bindAccountHeader()
            loadDashboard()
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
        completedCountText = findViewById(R.id.completedCountText)
        searchInput = findViewById(R.id.searchInput)
        mapButton = findViewById(R.id.mapButton)
        createButton = findViewById(R.id.createButton)
        errorText = findViewById(R.id.errorText)
        progressBar = findViewById(R.id.progressBar)
        reservationsRecyclerView = findViewById(R.id.reservationsRecyclerView)
        logoutButton = findViewById(R.id.logoutButton)
        yourBookingsButton = findViewById(R.id.yourBookingsButton)

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
            onModifyClick = { reservation -> startModifyFlow(reservation) }
        )
        reservationsRecyclerView.layoutManager = LinearLayoutManager(this)
        reservationsRecyclerView.adapter = adapter
    }

    private fun setupSearch() {
        // Filter pending reservation list dynamically as user types query
        searchInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                filterPendingList(s.toString())
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
            pendingModifyReservation = null
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

    private fun setupYourBookingsButton() {
        // Open full booking history activity
        yourBookingsButton.setOnClickListener {
            startActivity(Intent(this, ProsumerBookingsActivity::class.java))
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

    private fun startModifyFlow(reservation: Reservation) {
        // Allow prosumer to change node, date, and slot during modification
        AlertDialog.Builder(this)
            .setTitle("Modify Reservation (${reservation.nodeId})")
            .setItems(arrayOf(
                "Keep Current Node (${reservation.nodeId})",
                "Select New Node on Map 🗺️",
                "Select New Node from List 📋"
            )) { _, which ->
                when (which) {
                    0 -> selectDateAndScheduleForModify(reservation.id, reservation.nodeId, reservation.nodeId)
                    1 -> {
                        pendingModifyReservation = reservation
                        val intent = Intent(this, NodesMapActivity::class.java).apply {
                            putExtra("IS_PICKER_MODE", true)
                        }
                        mapNodePickerLauncher.launch(intent)
                    }
                    2 -> showNodeSelectionListForModify(reservation)
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showNodeSelectionListForModify(reservation: Reservation) {
        // Fetch the live nodes list so the prosumer can move the reservation to another node
        lifecycleScope.launch {
            val liveNodes = try {
                val res = NodeApiClient.create(this@ProsumerHomeActivity).getNodes()
                if (res.isSuccessful && !res.body()?.data.isNullOrEmpty()) {
                    res.body()?.data?.filter { !it.id.isNullOrBlank() }
                } else null
            } catch (e: Exception) {
                null
            }

            if (liveNodes.isNullOrEmpty()) {
                showError("Could not load microgrid nodes. Please check your connection and try again.")
                return@launch
            }

            val displayList = liveNodes.map { "${it.name ?: it.id} (${it.id})" }.toTypedArray()
            val idList = liveNodes.map { it.id!! }.toTypedArray()

            AlertDialog.Builder(this@ProsumerHomeActivity)
                .setTitle("Select New Microgrid Node")
                .setItems(displayList) { _, which ->
                    val selectedNodeId = idList[which]
                    val selectedNodeName = displayList[which].substringBefore(" (")
                    selectDateAndScheduleForModify(reservation.id, selectedNodeId, selectedNodeName)
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

    private fun selectDateAndScheduleForModify(reservationId: String, targetNodeId: String, targetNodeName: String) {
        // Select new booking date for modification
        val calendar = Calendar.getInstance()

        val datePicker = DatePickerDialog(
            this,
            { _, year, month, dayOfMonth ->
                calendar.set(Calendar.YEAR, year)
                calendar.set(Calendar.MONTH, month)
                calendar.set(Calendar.DAY_OF_MONTH, dayOfMonth)

                val dateIsoString = String.format(Locale.US, "%04d-%02d-%02d", year, month + 1, dayOfMonth)
                val dayOfWeekFormat = SimpleDateFormat("EEEE", Locale.US)
                val dayOfWeek = dayOfWeekFormat.format(calendar.time)

                fetchScheduleAndPickTimeSlotForModify(reservationId, targetNodeId, targetNodeName, calendar, dateIsoString, dayOfWeek)
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

    private fun showNodeSelectionListDialog() {
        // Fetch live microgrid nodes from the API and let the prosumer pick one
        lifecycleScope.launch {
            val liveNodes = try {
                val res = NodeApiClient.create(this@ProsumerHomeActivity).getNodes()
                if (res.isSuccessful && !res.body()?.data.isNullOrEmpty()) {
                    res.body()?.data?.filter { !it.id.isNullOrBlank() }
                } else null
            } catch (e: Exception) {
                null
            }

            if (liveNodes.isNullOrEmpty()) {
                showError("Could not load microgrid nodes. Please check your connection and try again.")
                return@launch
            }

            val displayList = liveNodes.map { "${it.name ?: it.id} (${it.id})" }.toTypedArray()
            val idList = liveNodes.map { it.id!! }.toTypedArray()

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
        // Select booking date on calendar and query grid side schedules
        val calendar = Calendar.getInstance()

        val datePicker = DatePickerDialog(
            this,
            { _, year, month, dayOfMonth ->
                calendar.set(Calendar.YEAR, year)
                calendar.set(Calendar.MONTH, month)
                calendar.set(Calendar.DAY_OF_MONTH, dayOfMonth)

                val dateIsoString = String.format(Locale.US, "%04d-%02d-%02d", year, month + 1, dayOfMonth)
                val dayOfWeekFormat = SimpleDateFormat("EEEE", Locale.US)
                val dayOfWeek = dayOfWeekFormat.format(calendar.time)

                fetchScheduleAndPickTimeSlot(nodeId, nodeName, calendar, dateIsoString, dayOfWeek)
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

    private fun formatSlotLabel(slot: AvailableSlot): String {
        // Format slot display label with 🟢 Available, 🟡 Pending, 🔴 Reserved status indicators
        val startUtc = slot.start ?: return "Slot"
        val localDisplay = try {
            val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val outputFormat = SimpleDateFormat("HH:mm", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("Asia/Colombo")
            }
            val cleanDate = startUtc.take(19)
            val date = inputFormat.parse(cleanDate)
            if (date != null) {
                val endCal = Calendar.getInstance().apply {
                    time = date
                    add(Calendar.MINUTE, 30)
                }
                "${outputFormat.format(date)} - ${outputFormat.format(endCal.time)}"
            } else {
                startUtc
            }
        } catch (e: Exception) {
            startUtc
        }

        val capacityInfo = if (slot.reservedCount != null && slot.capacity != null) {
            " [${slot.reservedCount}/${slot.capacity} booked]"
        } else ""

        val isAvailable = slot.isAvailable == true && (slot.availableCount == null || slot.availableCount > 0)

        return when {
            isAvailable -> "🟢 $localDisplay$capacityInfo (Available)"
            slot.reservationStatus.equals("Pending", ignoreCase = true) -> "🟡 $localDisplay$capacityInfo (Pending)"
            slot.reservationStatus.equals("Approved", ignoreCase = true) -> "🔴 $localDisplay$capacityInfo (Reserved)"
            else -> "🔴 $localDisplay$capacityInfo (Full/Unavailable)"
        }
    }

    private fun fetchScheduleAndPickTimeSlotForModify(
        reservationId: String,
        nodeId: String,
        nodeName: String,
        calendar: Calendar,
        dateIsoString: String,
        dayOfWeek: String
    ) {
        // Fetch server-provided slots for modification
        lifecycleScope.launch {
            try {
                showLoading(true)
                hideError()

                val operatorApi = RetrofitClient.getOperatorNodeApi(this@ProsumerHomeActivity)
                val slotsRes = operatorApi.getAvailableSlots(nodeId, dateIsoString)
                showLoading(false)

                val slotList = slotsRes.body()?.data ?: emptyList()

                if (slotsRes.isSuccessful && slotList.isNotEmpty()) {
                    val displayLabels = slotList.map { formatSlotLabel(it) }.toTypedArray()

                    AlertDialog.Builder(this@ProsumerHomeActivity)
                        .setTitle("Select New $nodeName Slot ($dayOfWeek)")
                        .setItems(displayLabels) { _, which ->
                            val selectedSlot = slotList[which]
                            val isAvailable = selectedSlot.isAvailable == true && (selectedSlot.availableCount == null || selectedSlot.availableCount > 0)

                            if (!isAvailable) {
                                showError("This slot is full or reserved. Please choose an available green 🟢 slot.")
                                return@setItems
                            }

                            val utcStartIso = selectedSlot.start ?: ""
                            val displayLocalTime = formatSlotLabel(selectedSlot).replace("🟢 ", "").substringBefore(" (")

                            modifyReservation(reservationId, nodeId, utcStartIso, displayLocalTime)
                        }
                        .setNegativeButton("Cancel", null)
                        .show()
                } else {
                    showError("No slots available for $nodeName on $dayOfWeek ($dateIsoString).")
                }

            } catch (e: Exception) {
                showLoading(false)
                showError("Error fetching available slots: ${e.message}")
            }
        }
    }

    private fun fetchScheduleAndPickTimeSlot(
        nodeId: String,
        nodeName: String,
        calendar: Calendar,
        dateIsoString: String,
        dayOfWeek: String
    ) {
        // Fetch server-provided 30-minute slots with availability and capacity
        lifecycleScope.launch {
            try {
                showLoading(true)
                hideError()

                val operatorApi = RetrofitClient.getOperatorNodeApi(this@ProsumerHomeActivity)
                val slotsRes = operatorApi.getAvailableSlots(nodeId, dateIsoString)
                showLoading(false)

                val slotList = slotsRes.body()?.data ?: emptyList()

                if (slotsRes.isSuccessful && slotList.isNotEmpty()) {
                    val displayLabels = slotList.map { formatSlotLabel(it) }.toTypedArray()

                    AlertDialog.Builder(this@ProsumerHomeActivity)
                        .setTitle("Select $nodeName Slot ($dayOfWeek)")
                        .setItems(displayLabels) { _, which ->
                            val selectedSlot = slotList[which]
                            val isAvailable = selectedSlot.isAvailable == true && (selectedSlot.availableCount == null || selectedSlot.availableCount > 0)

                            if (!isAvailable) {
                                showError("This slot is full or reserved. Please choose an available green 🟢 slot.")
                                return@setItems
                            }

                            val utcStartIso = selectedSlot.start ?: ""
                            val displayLocalTime = formatSlotLabel(selectedSlot).replace("🟢 ", "").substringBefore(" (")

                            createReservation(nodeId, utcStartIso, displayLocalTime)
                        }
                        .setNegativeButton("Cancel", null)
                        .show()
                } else {
                    showError("No slots available for $nodeName on $dayOfWeek ($dateIsoString).")
                }

            } catch (e: Exception) {
                showLoading(false)
                showError("Error fetching available slots: ${e.message}")
            }
        }
    }

    private fun createReservation(nodeId: String, newSlotDateTimeUtc: String, displayLocalTime: String) {
        // Send a new reservation request to the backend API using server's canonical UTC start timestamp
        val prosumerNic = sessionManager.getUsername() ?: ""
        if (prosumerNic.isEmpty()) {
            showError("No session found. Please log in again.")
            return
        }

        if (isReserving) return
        isReserving = true

        lifecycleScope.launch {
            try {
                showLoading(true)
                hideError()

                val idempotencyKey = UUID.randomUUID().toString()
                val request = CreateReservationRequest(
                    prosumerNic = prosumerNic,
                    nodeId = nodeId,
                    slotDateTime = newSlotDateTimeUtc
                )
                val response = reservationRepository.createReservation(request, idempotencyKey)

                if (response.isSuccessful && response.body()?.success == true) {
                    showSuccessDialog(
                        "Reservation Created",
                        "Successfully reserved slot at $nodeId for:\n$displayLocalTime"
                    )
                    loadDashboard()
                } else {
                    val rawError = response.errorBody()?.string()
                    when (response.code()) {
                        409 -> {
                            showError("That slot just filled up. Please pick another slot.")
                            loadDashboard()
                        }
                        412 -> {
                            val msg = parseErrorMessage(rawError, response.code(), "Reservation not permitted due to timing rules.")
                            showError(msg)
                        }
                        401, 403 -> {
                            sessionManager.clearSession()
                            openLogin()
                        }
                        else -> {
                            showError(parseErrorMessage(rawError, response.code(), response.body()?.message ?: "Failed to create reservation."))
                        }
                    }
                }
            } catch (e: Exception) {
                showError("Error creating reservation: ${e.message}")
            } finally {
                showLoading(false)
                isReserving = false
            }
        }
    }

    private fun modifyReservation(
        reservationId: String,
        targetNodeId: String,
        newSlotDateTimeUtc: String,
        displayLocalTime: String
    ) {
        // Send a slot time & node modification request to backend API
        lifecycleScope.launch {
            try {
                showLoading(true)
                hideError()

                val request = UpdateReservationRequest(
                    nodeId = targetNodeId,
                    slotDateTime = newSlotDateTimeUtc
                )
                val response = reservationRepository.updateReservation(reservationId, request)

                if (response.isSuccessful && response.body()?.success == true) {
                    showSuccessDialog("Modification Successful", "Slot for $targetNodeId updated to:\n$displayLocalTime")
                    loadDashboard()
                } else {
                    val rawError = response.errorBody()?.string()
                    when (response.code()) {
                        409 -> {
                            showError("That slot just filled up. Please pick another slot.")
                            loadDashboard()
                        }
                        412 -> {
                            val msg = parseErrorMessage(rawError, response.code(), "Modification not permitted due to timing rules.")
                            showError(msg)
                        }
                        401, 403 -> {
                            sessionManager.clearSession()
                            openLogin()
                        }
                        else -> {
                            showError(parseErrorMessage(rawError, response.code(), response.body()?.message ?: "Modification failed."))
                        }
                    }
                }
            } catch (e: Exception) {
                showError("Error modifying reservation: ${e.message}")
            } finally {
                showLoading(false)
            }
        }
    }

    private fun loadDashboard() {
        // Fetch dashboard counts and filter list to show ONLY Pending bookings on Home Dashboard
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

                    // Calculate completed count from full list
                    val completedCount = allReservations.count {
                        it.status.equals("Completed", ignoreCase = true) ||
                                it.status.equals("Settled", ignoreCase = true)
                    }
                    completedCountText.text = completedCount.toString()

                    // Home Dashboard displays ONLY Pending bookings
                    filterPendingList(searchInput.text.toString())
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

    private fun filterPendingList(query: String) {
        // Filter reservations to show ONLY Pending bookings on the Home Dashboard
        val pendingOnly = allReservations.filter { it.status.equals("Pending", ignoreCase = true) }
        val filtered = if (query.isBlank()) {
            pendingOnly
        } else {
            pendingOnly.filter {
                it.nodeId.contains(query, ignoreCase = true) ||
                        it.slotDateTime.contains(query, ignoreCase = true) ||
                        (it.createdAt?.contains(query, ignoreCase = true) == true)
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
        if (responseCode == 401 || responseCode == 403) {
            return "Session expired. Please log in again."
        }
        if (responseCode == 409) {
            return "That slot just filled up. Please pick another slot."
        }
        if (responseCode == 412) {
            val extracted = extractJsonMessage(rawJson)
            return extracted.ifBlank { "Reservation not permitted due to timing rules." }
        }
        if (responseCode == 400) {
            val extracted = extractJsonMessage(rawJson)
            return extracted.ifBlank { "Invalid reservation request." }
        }
        if (!rawJson.isNullOrBlank()) {
            val extracted = extractJsonMessage(rawJson)
            if (extracted.isNotBlank()) return extracted
        }
        return fallbackMessage ?: "Operation failed. Please try again."
    }

    private fun extractJsonMessage(rawJson: String?): String {
        // Read the "message" field from a JSON error body, or return a short raw body
        if (rawJson.isNullOrBlank()) return ""
        return try {
            val json = JSONObject(rawJson)
            json.optString("message", "")
        } catch (_: Exception) {
            if (rawJson.length < 100) rawJson else ""
        }
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