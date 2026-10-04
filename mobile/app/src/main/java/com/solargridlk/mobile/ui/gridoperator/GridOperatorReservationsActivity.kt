package com.solargridlk.mobile.ui.gridoperator

import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.solargridlk.mobile.R
import com.solargridlk.mobile.data.api.RetrofitClient
import com.solargridlk.mobile.data.model.Reservation
import com.solargridlk.mobile.data.repository.OperatorNodeRepository
import com.solargridlk.mobile.data.repository.ReservationRepository
import com.solargridlk.mobile.ui.auth.LoginActivity
import com.solargridlk.mobile.utils.SessionManager
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

class GridOperatorReservationsActivity : AppCompatActivity() {

    private lateinit var sessionManager: SessionManager
    private lateinit var reservationRepository: ReservationRepository
    private lateinit var nodeRepository: OperatorNodeRepository
    private lateinit var adapter: OperatorReservationAdapter

    private lateinit var backButton: ImageButton
    private lateinit var refreshButton: Button
    private lateinit var searchInput: EditText
    private lateinit var subtitleText: TextView
    private lateinit var errorText: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var operatorReservationsRecyclerView: RecyclerView

    private var assignedNodeIds: Set<String> = emptySet()
    private var allReservations: List<Reservation> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_grid_operator_reservations)

        sessionManager = SessionManager(this)
        if (!sessionManager.isLoggedIn() || sessionManager.getRole() != "GridOperator") {
            openLogin()
            return
        }

        reservationRepository = ReservationRepository(RetrofitClient.getReservationApi(this))
        nodeRepository = OperatorNodeRepository(RetrofitClient.getOperatorNodeApi(this))

        initializeViews()
        setupRecyclerView()
        setupSearch()

        loadAssignedNodesAndReservations()
    }

    private fun initializeViews() {
        backButton = findViewById(R.id.backButton)
        refreshButton = findViewById(R.id.refreshButton)
        searchInput = findViewById(R.id.searchInput)
        subtitleText = findViewById(R.id.subtitleText)
        errorText = findViewById(R.id.errorText)
        progressBar = findViewById(R.id.progressBar)
        operatorReservationsRecyclerView = findViewById(R.id.operatorReservationsRecyclerView)

        backButton.setOnClickListener { finish() }
        refreshButton.setOnClickListener { loadAssignedNodesAndReservations() }

        val username = sessionManager.getUsername() ?: "—"
        subtitleText.text = "Assigned node reservations • Operator ID: $username"
    }

    private fun setupRecyclerView() {
        adapter = OperatorReservationAdapter { reservation ->
            confirmApproveReservation(reservation)
        }
        operatorReservationsRecyclerView.layoutManager = LinearLayoutManager(this)
        operatorReservationsRecyclerView.adapter = adapter
    }

    private fun setupSearch() {
        searchInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                filterList(s?.toString().orEmpty())
            }
            override fun afterTextChanged(s: Editable?) {}
        })
    }

    private fun loadAssignedNodesAndReservations() {
        showLoading(true)
        hideError()

        lifecycleScope.launch {
            try {
                // 1. Fetch assigned nodes
                val nodeResponse = nodeRepository.getNodes()
                if (nodeResponse.code() == 401 || nodeResponse.code() == 403) {
                    sessionManager.clearSession()
                    openLogin()
                    return@launch
                }

                if (nodeResponse.isSuccessful) {
                    val nodes = nodeResponse.body()?.data.orEmpty()
                    assignedNodeIds = nodes.mapNotNull { it.nodeId?.trim() }.toSet()
                }

                // 2. Fetch reservations
                val resResponse = reservationRepository.getReservations()
                showLoading(false)

                if (resResponse.code() == 401 || resResponse.code() == 403) {
                    sessionManager.clearSession()
                    openLogin()
                    return@launch
                }

                if (resResponse.isSuccessful && resResponse.body()?.success == true) {
                    allReservations = resResponse.body()?.data.orEmpty()

                    val filtered = if (assignedNodeIds.isNotEmpty()) {
                        allReservations.filter { assignedNodeIds.contains(it.nodeId.trim()) }
                    } else {
                        allReservations
                    }

                    filterList(searchInput.text.toString())
                } else {
                    val rawError = resResponse.errorBody()?.string()
                    showError(parseErrorMessage(rawError, resResponse.code(), resResponse.body()?.message))
                }

            } catch (e: Exception) {
                showLoading(false)
                showError("Unable to connect to server: ${e.message}")
            }
        }
    }

    private fun filterList(query: String) {
        val term = query.trim()
        val base = if (assignedNodeIds.isNotEmpty()) {
            allReservations.filter { assignedNodeIds.contains(it.nodeId.trim()) }
        } else {
            allReservations
        }

        val filtered = if (term.isEmpty()) {
            base
        } else {
            base.filter {
                it.nodeId.contains(term, ignoreCase = true) ||
                        it.prosumerNic.contains(term, ignoreCase = true) ||
                        it.status.contains(term, ignoreCase = true) ||
                        it.slotDateTime.contains(term, ignoreCase = true)
            }
        }
        adapter.submitList(filtered)
    }

    private fun confirmApproveReservation(reservation: Reservation) {
        AlertDialog.Builder(this)
            .setTitle("Approve Reservation")
            .setMessage("Are you sure you want to approve slot for ${reservation.nodeId} (${reservation.prosumerNic})?")
            .setPositiveButton("Yes, Approve") { _, _ -> approveReservation(reservation.id) }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun approveReservation(reservationId: String) {
        showLoading(true)
        hideError()

        lifecycleScope.launch {
            try {
                val response = reservationRepository.approveReservation(reservationId)
                showLoading(false)

                when {
                    response.code() == 401 || response.code() == 403 -> {
                        sessionManager.clearSession()
                        openLogin()
                    }
                    response.code() == 409 -> {
                        showError("Slot already reserved by another user.")
                        loadAssignedNodesAndReservations()
                    }
                    response.isSuccessful && response.body()?.success == true -> {
                        Toast.makeText(this@GridOperatorReservationsActivity, "Reservation approved successfully!", Toast.LENGTH_SHORT).show()
                        loadAssignedNodesAndReservations()
                    }
                    else -> {
                        val rawError = response.errorBody()?.string()
                        showError(parseErrorMessage(rawError, response.code(), response.body()?.message ?: "Approval failed."))
                    }
                }
            } catch (e: Exception) {
                showLoading(false)
                showError("Network error during approval: ${e.message}")
            }
        }
    }

    private fun parseErrorMessage(rawJson: String?, responseCode: Int = 0, fallbackMessage: String? = null): String {
        if (responseCode == 401 || responseCode == 403) {
            return "Session expired or unauthorized. Please log in again."
        }
        if (responseCode == 409) {
            return "Slot already reserved."
        }
        if (!rawJson.isNullOrBlank()) {
            try {
                val json = JSONObject(rawJson)
                val msg = json.optString("message", "")
                val code = json.optString("code", "")
                if (code.equals("SlotTaken", ignoreCase = true) || msg.contains("SlotTaken", ignoreCase = true)) {
                    return "Slot already reserved."
                }
                if (msg.isNotBlank()) return msg
            } catch (_: Exception) {
                if (rawJson.length < 100) return rawJson
            }
        }
        return fallbackMessage ?: "Operation failed. Please try again."
    }

    private fun openLogin() {
        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
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

    private class OperatorReservationAdapter(
        private val onApproveClick: (Reservation) -> Unit
    ) : RecyclerView.Adapter<OperatorReservationAdapter.ViewHolder>() {

        private var items: List<Reservation> = emptyList()

        fun submitList(newList: List<Reservation>) {
            items = newList
            notifyDataSetChanged()
        }

        class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val nodeIdText: TextView = view.findViewById(R.id.nodeIdText)
            val prosumerNicText: TextView = view.findViewById(R.id.prosumerNicText)
            val slotTimeText: TextView = view.findViewById(R.id.slotTimeText)
            val statusPill: TextView = view.findViewById(R.id.statusPill)
            val approveButton: Button = view.findViewById(R.id.approveButton)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_operator_reservation, parent, false)
            return ViewHolder(view)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val item = items[position]

            holder.nodeIdText.text = item.nodeId
            holder.prosumerNicText.text = "Prosumer NIC: ${item.prosumerNic}"
            holder.slotTimeText.text = "Slot: ${formatSlotDateTime(item.slotDateTime)}"
            holder.statusPill.text = item.status.uppercase(Locale.getDefault())

            when (item.status.trim().lowercase(Locale.getDefault())) {
                "pending" -> {
                    holder.statusPill.setBackgroundResource(R.drawable.bg_status_pending)
                    holder.statusPill.setTextColor(holder.itemView.context.getColor(R.color.accent_amber))
                    holder.approveButton.visibility = View.VISIBLE
                    holder.approveButton.setOnClickListener { onApproveClick(item) }
                }
                "approved", "accepted" -> {
                    holder.statusPill.setBackgroundResource(R.drawable.bg_status_approved)
                    holder.statusPill.setTextColor(holder.itemView.context.getColor(R.color.success))
                    holder.approveButton.visibility = View.GONE
                }
                "completed", "settled" -> {
                    holder.statusPill.setBackgroundResource(R.drawable.bg_status_completed)
                    holder.statusPill.setTextColor(holder.itemView.context.getColor(R.color.sky_400))
                    holder.approveButton.visibility = View.GONE
                }
                else -> {
                    holder.statusPill.setBackgroundResource(R.drawable.bg_status_cancelled)
                    holder.statusPill.setTextColor(holder.itemView.context.getColor(R.color.error))
                    holder.approveButton.visibility = View.GONE
                }
            }
        }

        override fun getItemCount(): Int = items.size

        private fun formatSlotDateTime(rawDate: String?): String {
            if (rawDate.isNullOrBlank()) return "-"
            return try {
                val cleanDate = rawDate.take(19)
                val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                val outputFormat = SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.getDefault())
                val parsedDate = inputFormat.parse(cleanDate)
                if (parsedDate != null) outputFormat.format(parsedDate) else rawDate
            } catch (_: Exception) {
                rawDate
            }
        }
    }
}