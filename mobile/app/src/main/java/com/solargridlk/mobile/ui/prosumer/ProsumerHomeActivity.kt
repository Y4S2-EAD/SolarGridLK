package com.solargridlk.mobile.ui.prosumer

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.solargridlk.mobile.R
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

class ProsumerHomeActivity : AppCompatActivity() {

    private lateinit var sessionManager: SessionManager
    private lateinit var reservationRepository: ReservationRepository
    private lateinit var adapter: ReservationAdapter

    private lateinit var welcomeText: TextView
    private lateinit var nicText: TextView
    private lateinit var activeCountText: TextView
    private lateinit var pendingCountText: TextView
    private lateinit var approvedCountText: TextView
    private lateinit var searchInput: EditText
    private lateinit var errorText: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var reservationsRecyclerView: RecyclerView
    private lateinit var logoutButton: Button

    private var allReservations: List<Reservation> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_prosumer_home)

        sessionManager = SessionManager(this)
        reservationRepository = ReservationRepository(RetrofitClient.getReservationApi(this))

        // TEMP: Test session fallback (remove before submission)
        if (!sessionManager.isLoggedIn()) {
            sessionManager.saveSession(
                token = "test",
                username = "200012345678",
                role = "Prosumer",
                fullName = "Test Prosumer",
                expiresAt = "2099-01-01"
            )
        }

        initializeViews()
        setupRecyclerView()
        setupSearch()
        setupLogout()

        loadDashboard()
    }

    private fun initializeViews() {
        welcomeText = findViewById(R.id.welcomeText)
        nicText = findViewById(R.id.nicText)
        activeCountText = findViewById(R.id.activeCountText)
        pendingCountText = findViewById(R.id.pendingCountText)
        approvedCountText = findViewById(R.id.approvedCountText)
        searchInput = findViewById(R.id.searchInput)
        errorText = findViewById(R.id.errorText)
        progressBar = findViewById(R.id.progressBar)
        reservationsRecyclerView = findViewById(R.id.reservationsRecyclerView)
        logoutButton = findViewById(R.id.logoutButton)

        val fullName = sessionManager.getFullName()
        welcomeText.text = if (!fullName.isNullOrBlank()) "Welcome, $fullName" else "Prosumer Dashboard"
        nicText.text = "NIC: ${sessionManager.getUsername() ?: "-"}"
    }

    private fun setupRecyclerView() {
        adapter = ReservationAdapter(
            onCancelClick = { reservation -> confirmCancel(reservation) },
            onQrClick = { reservation -> openQrDisplay(reservation) },
            onModifyClick = { reservation -> showModifyDatePicker(reservation) }
        )
        reservationsRecyclerView.layoutManager = LinearLayoutManager(this)
        reservationsRecyclerView.adapter = adapter
    }

    private fun setupSearch() {
        searchInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                filterList(s.toString())
            }
            override fun afterTextChanged(s: Editable?) {}
        })
    }

    private fun setupLogout() {
        logoutButton.setOnClickListener {
            sessionManager.clearSession()
            val intent = Intent(this, LoginActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
        }
    }

    private fun loadDashboard() {
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

                // 1. Bind Dashboard Summary Counts
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

                // 2. Bind Reservations List
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
        val intent = Intent(this, QrDisplayActivity::class.java).apply {
            putExtra("reservationId", reservation.id)
            putExtra("detail", "${reservation.nodeId} · ${reservation.slotDateTime}")
        }
        startActivity(intent)
    }

    private fun showModifyDatePicker(reservation: Reservation) {
        val calendar = Calendar.getInstance()

        val datePicker = DatePickerDialog(
            this,
            { _, year, month, dayOfMonth ->
                calendar.set(Calendar.YEAR, year)
                calendar.set(Calendar.MONTH, month)
                calendar.set(Calendar.DAY_OF_MONTH, dayOfMonth)

                TimePickerDialog(
                    this,
                    { _, hourOfDay, minute ->
                        calendar.set(Calendar.HOUR_OF_DAY, hourOfDay)
                        calendar.set(Calendar.MINUTE, minute)
                        calendar.set(Calendar.SECOND, 0)

                        // ISO UTC string for API request
                        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault()).apply {
                            timeZone = TimeZone.getTimeZone("UTC")
                        }
                        val newSlotDateTimeUtc = isoFormat.format(calendar.time)

                        // Local time string for user display
                        val localFormat = SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.getDefault())
                        val displayLocalTime = localFormat.format(calendar.time)

                        modifyReservation(reservation.id, newSlotDateTimeUtc, displayLocalTime, reservation.nodeId)
                    },
                    calendar.get(Calendar.HOUR_OF_DAY),
                    calendar.get(Calendar.MINUTE),
                    true
                ).show()
            },
            calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH),
            calendar.get(Calendar.DAY_OF_MONTH)
        )

        // Restrict date range: Today <= date <= Today + 7 days
        val now = System.currentTimeMillis()
        datePicker.datePicker.minDate = now
        datePicker.datePicker.maxDate = now + (7L * 24 * 60 * 60 * 1000)
        datePicker.show()
    }

    private fun modifyReservation(
        reservationId: String,
        newSlotDateTimeUtc: String,
        displayLocalTime: String,
        nodeId: String
    ) {
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