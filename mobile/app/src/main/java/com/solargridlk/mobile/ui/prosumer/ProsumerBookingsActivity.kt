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
import com.solargridlk.mobile.data.api.AvailableSlot
import com.solargridlk.mobile.data.api.RetrofitClient
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

                val dateIsoString = String.format(Locale.US, "%04d-%02d-%02d", year, month + 1, dayOfMonth)
                val dayOfWeekFormat = SimpleDateFormat("EEEE", Locale.US)
                val dayOfWeek = dayOfWeekFormat.format(calendar.time)

                fetchScheduleAndPickTimeSlotForModify(reservationId, targetNodeId, targetNodeName, dateIsoString, dayOfWeek)
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
        dateIsoString: String,
        dayOfWeek: String
    ) {
        lifecycleScope.launch {
            try {
                showLoading(true)
                hideError()

                val operatorApi = RetrofitClient.getOperatorNodeApi(this@ProsumerBookingsActivity)
                val slotsRes = operatorApi.getAvailableSlots(nodeId, dateIsoString)
                showLoading(false)

                val slotList = slotsRes.body()?.data ?: emptyList()

                if (slotsRes.isSuccessful && slotList.isNotEmpty()) {
                    val displayLabels = slotList.map { formatSlotLabel(it) }.toTypedArray()

                    AlertDialog.Builder(this@ProsumerBookingsActivity)
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
                showError("Network error fetching schedule: ${e.message}")
            }
        }
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
                    when (response.code()) {
                        409 -> {
                            showError("That slot just filled up. Please pick another slot.")
                            loadBookings()
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
        if (responseCode == 401 || responseCode == 403) {
            return "Session expired. Please log in again."
        }
        if (responseCode == 409) {
            return "That slot just filled up. Please pick another slot"
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
        if (rawJson.isNullOrBlank()) return ""
        return try {
            val json = JSONObject(rawJson)
            json.optString("message", "")
        } catch (_: Exception) {
            if (rawJson.length < 100) rawJson else ""
        }
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