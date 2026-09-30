package com.solargridlk.mobile.ui.prosumer

import android.app.DatePickerDialog
import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.EditText
import android.widget.ImageButton
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.solargridlk.mobile.R
import com.solargridlk.mobile.data.api.RetrofitClient
import com.solargridlk.mobile.data.model.MicrogridNode
import com.solargridlk.mobile.data.model.Reservation
import com.solargridlk.mobile.data.model.UpdateReservationRequest
import com.solargridlk.mobile.data.repository.ReservationRepository
import com.solargridlk.mobile.ui.auth.LoginActivity
import com.solargridlk.mobile.utils.SessionManager
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

class ProsumerBookingsActivity : AppCompatActivity() {

    private lateinit var sessionManager: SessionManager
    private lateinit var reservationRepository: ReservationRepository
    private lateinit var adapter: ReservationAdapter

    private lateinit var searchInput: EditText
    private lateinit var errorText: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var bookingsRecyclerView: RecyclerView
    private lateinit var backButton: ImageButton
    private lateinit var subtitleText: TextView

    private lateinit var filterAllChip: TextView
    private lateinit var filterPendingChip: TextView
    private lateinit var filterApprovedChip: TextView
    private lateinit var filterCompletedChip: TextView
    private lateinit var filterCancelledChip: TextView

    private var allReservations: List<Reservation> = emptyList()
    private var selectedStatusFilter: String = "ALL"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_prosumer_bookings)

        sessionManager = SessionManager(this)
        reservationRepository = ReservationRepository(RetrofitClient.getReservationApi(this))

        if (!sessionManager.isLoggedIn()) {
            openLogin()
            return
        }

        initializeViews()
        setupRecyclerView()
        setupSearch()
        setupStatusFilterChips()

        loadBookings()
    }

    private fun openLogin() {
        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    private fun initializeViews() {
        searchInput = findViewById(R.id.searchInput)
        errorText = findViewById(R.id.errorText)
        progressBar = findViewById(R.id.progressBar)
        bookingsRecyclerView = findViewById(R.id.bookingsRecyclerView)
        backButton = findViewById(R.id.backButton)
        subtitleText = findViewById(R.id.subtitleText)

        filterAllChip = findViewById(R.id.filterAllChip)
        filterPendingChip = findViewById(R.id.filterPendingChip)
        filterApprovedChip = findViewById(R.id.filterApprovedChip)
        filterCompletedChip = findViewById(R.id.filterCompletedChip)
        filterCancelledChip = findViewById(R.id.filterCancelledChip)

        backButton.setOnClickListener { finish() }

        val nic = sessionManager.getUsername() ?: "—"
        subtitleText.text = "All microgrid reservations for NIC: $nic"
    }

    private fun setupRecyclerView() {
        adapter = ReservationAdapter(
            onCancelClick = { reservation -> confirmCancel(reservation) },
            onQrClick = { reservation -> openQrDisplay(reservation) },
            onModifyClick = { reservation -> startModifyFlow(reservation) }
        )
        bookingsRecyclerView.layoutManager = LinearLayoutManager(this)
        bookingsRecyclerView.adapter = adapter
    }

    private fun setupSearch() {
        searchInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                applyCombinedFilters(s.toString())
            }
            override fun afterTextChanged(s: Editable?) {}
        })
    }

    private fun setupStatusFilterChips() {
        filterAllChip.setOnClickListener { applyStatusFilter("ALL") }
        filterPendingChip.setOnClickListener { applyStatusFilter("PENDING") }
        filterApprovedChip.setOnClickListener { applyStatusFilter("APPROVED") }
        filterCompletedChip.setOnClickListener { applyStatusFilter("COMPLETED") }
        filterCancelledChip.setOnClickListener { applyStatusFilter("CANCELLED") }
    }

    private fun applyStatusFilter(status: String) {
        selectedStatusFilter = status
        applyCombinedFilters(searchInput.text.toString())
    }

    private fun applyCombinedFilters(query: String) {
        var list = allReservations

        // 1. Filter by status chip
        if (selectedStatusFilter != "ALL") {
            list = list.filter {
                when (selectedStatusFilter) {
                    "PENDING" -> it.status.equals("Pending", ignoreCase = true)
                    "APPROVED" -> it.status.equals("Approved", ignoreCase = true) || it.status.equals("Accepted", ignoreCase = true)
                    "COMPLETED" -> it.status.equals("Completed", ignoreCase = true) || it.status.equals("Settled", ignoreCase = true)
                    "CANCELLED" -> it.status.equals("Cancelled", ignoreCase = true) || it.status.equals("Flagged", ignoreCase = true)
                    else -> true
                }
            }
        }

        // 2. Filter by search text query
        if (query.isNotBlank()) {
            list = list.filter {
                it.nodeId.contains(query, ignoreCase = true) ||
                        it.status.contains(query, ignoreCase = true) ||
                        (it.createdAt?.contains(query, ignoreCase = true) == true) ||
                        it.slotDateTime.contains(query, ignoreCase = true)
            }
        }

        adapter.submitList(list)
    }

    private fun loadBookings() {
        val nic = sessionManager.getUsername()
        if (nic.isNullOrEmpty()) {
            showError("No session found. Please log in again.")
            return
        }

        lifecycleScope.launch {
            try {
                showLoading(true)
                hideError()

                val listResponse = reservationRepository.getReservations(prosumerNic = nic)

                if (listResponse.isSuccessful && listResponse.body()?.success == true) {
                    allReservations = listResponse.body()?.data ?: emptyList()
                    applyCombinedFilters(searchInput.text.toString())
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

    private fun startModifyFlow(reservation: Reservation) {
        selectDateAndScheduleForModify(reservation.id, reservation.nodeId, reservation.nodeId)
    }

    private fun selectDateAndScheduleForModify(reservationId: String, targetNodeId: String, targetNodeName: String) {
        val calendar = Calendar.getInstance()

        val datePicker = DatePickerDialog(
            this,
            { _, year, month, dayOfMonth ->
                calendar.set(Calendar.YEAR, year)
                calendar.set(Calendar.MONTH, month)
                calendar.set(Calendar.DAY_OF_MONTH, dayOfMonth)

                val dayOfWeekFormat = SimpleDateFormat("EEEE", Locale.US)
                val dayOfWeek = dayOfWeekFormat.format(calendar.time)

                fetchScheduleAndPickTimeSlotForModify(reservationId, targetNodeId, targetNodeName, calendar, dayOfWeek)
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

    private fun fetchScheduleAndPickTimeSlotForModify(
        reservationId: String,
        nodeId: String,
        nodeName: String,
        calendar: Calendar,
        dayOfWeek: String
    ) {
        lifecycleScope.launch {
            try {
                showLoading(true)
                hideError()

                val operatorApi = RetrofitClient.getOperatorNodeApi(this@ProsumerBookingsActivity)

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

                val dayPrefix = dayOfWeek.take(3)
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
                    showTimeSlotDialogForModify(reservationId, nodeId, nodeName, calendar, dayOfWeek, all30MinSlots.distinct().toTypedArray())
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

    private fun generate30MinSlots(startStr: String?, endStr: String?): List<String> {
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

    private fun showTimeSlotDialogForModify(
        reservationId: String,
        nodeId: String,
        nodeName: String,
        calendar: Calendar,
        dayOfWeek: String,
        slots: Array<String>
    ) {
        AlertDialog.Builder(this)
            .setTitle("Select New $nodeName Slot ($dayOfWeek)")
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

                modifyReservation(reservationId, nodeId, newSlotDateTimeUtc, displayTime)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun modifyReservation(
        reservationId: String,
        targetNodeId: String,
        newSlotDateTimeUtc: String,
        displayLocalTime: String
    ) {
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
                    loadBookings()
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

    private fun openQrDisplay(reservation: Reservation) {
        val intent = Intent(this, QrDisplayActivity::class.java).apply {
            putExtra("reservationId", reservation.id)
            putExtra("detail", "${reservation.nodeId} · ${reservation.slotDateTime}")
        }
        startActivity(intent)
    }

    private fun confirmCancel(reservation: Reservation) {
        AlertDialog.Builder(this)
            .setTitle("Cancel Reservation")
            .setMessage("Are you sure you want to cancel the reservation for ${reservation.nodeId}?")
            .setPositiveButton("Yes, Cancel") { _, _ -> cancelReservation(reservation.id, reservation.nodeId) }
            .setNegativeButton("No", null)
            .show()
    }

    private fun cancelReservation(reservationId: String, nodeId: String) {
        lifecycleScope.launch {
            try {
                showLoading(true)
                hideError()

                val response = reservationRepository.cancelReservation(reservationId)
                if (response.isSuccessful && response.body()?.success == true) {
                    showSuccessDialog("Cancellation Successful", "Reservation for $nodeId has been cancelled.")
                    loadBookings()
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
        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton("OK", null)
            .show()
    }

    private fun showLoading(isLoading: Boolean) {
        progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
    }

    private fun showError(message: String) {
        errorText.text = message
        errorText.visibility = View.VISIBLE
    }

    private fun hideError() {
        errorText.text = ""
        errorText.visibility = View.GONE
    }
}