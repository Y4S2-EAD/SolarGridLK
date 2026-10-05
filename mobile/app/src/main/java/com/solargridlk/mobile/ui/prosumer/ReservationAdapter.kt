package com.solargridlk.mobile.ui.prosumer

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.solargridlk.mobile.R
import com.solargridlk.mobile.data.model.Reservation
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

class ReservationAdapter(
    private val onCancelClick: (Reservation) -> Unit,
    private val onQrClick: (Reservation) -> Unit,
    private val onModifyClick: (Reservation) -> Unit
) : RecyclerView.Adapter<ReservationAdapter.ViewHolder>() {

    private var items: List<Reservation> = emptyList()

    fun submitList(newItems: List<Reservation>) {
        items = newItems
        notifyDataSetChanged()
    }

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val nodeIdText: TextView = view.findViewById(R.id.nodeIdText)
        val statusPill: TextView = view.findViewById(R.id.statusPill)
        val slotTimeText: TextView = view.findViewById(R.id.slotTimeText)
        val createdAtText: TextView = view.findViewById(R.id.createdAtText)
        val qrButton: Button = view.findViewById(R.id.qrButton)
        val modifyButton: Button = view.findViewById(R.id.modifyButton)
        val cancelButton: Button = view.findViewById(R.id.cancelButton)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_reservation, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = items[position]

        holder.nodeIdText.text = item.nodeId
        holder.slotTimeText.text = formatSlotDateTime(item.slotDateTime)
        holder.statusPill.text = item.status.uppercase(Locale.getDefault())

        if (!item.createdAt.isNullOrBlank()) {
            holder.createdAtText.visibility = View.VISIBLE
            val formattedCreated = formatSlotDateTime(item.createdAt).replace("Slot: ", "")
            holder.createdAtText.text = "Booked on: $formattedCreated"
        } else {
            holder.createdAtText.visibility = View.GONE
        }

        // Distinct status pill backgrounds and matching glowing text colors
        when (item.status.trim().lowercase(Locale.getDefault())) {
            "pending" -> {
                holder.statusPill.setBackgroundResource(R.drawable.bg_status_pending)
                holder.statusPill.setTextColor(Color.parseColor("#F4A93B"))
            }
            "approved", "accepted" -> {
                holder.statusPill.setBackgroundResource(R.drawable.bg_status_approved)
                holder.statusPill.setTextColor(Color.parseColor("#34D399"))
            }
            "completed", "settled", "done" -> {
                holder.statusPill.setBackgroundResource(R.drawable.bg_status_completed)
                holder.statusPill.setTextColor(Color.parseColor("#38BDF8"))
            }
            "cancelled", "flagged", "rejected" -> {
                holder.statusPill.setBackgroundResource(R.drawable.bg_status_cancelled)
                holder.statusPill.setTextColor(Color.parseColor("#F87171"))
            }
            else -> {
                holder.statusPill.setBackgroundResource(R.drawable.bg_pill_surplus)
                holder.statusPill.setTextColor(Color.parseColor("#E7ECF5"))
            }
        }

        // 2. View QR Button (Approved & Has QR)
        val isApproved = item.status.equals("Approved", ignoreCase = true) || item.status.equals("Accepted", ignoreCase = true)
        val hasQr = !item.qrCode.isNullOrEmpty()
        if (isApproved && hasQr) {
            holder.qrButton.visibility = View.VISIBLE
            holder.qrButton.setOnClickListener { onQrClick(item) }
        } else {
            holder.qrButton.visibility = View.GONE
        }

        // 3. Modify Button (ONLY Pending reservations can be modified)
        val isModifiable = item.status.equals("Pending", ignoreCase = true)
        if (isModifiable) {
            holder.modifyButton.visibility = View.VISIBLE
            holder.modifyButton.setOnClickListener { onModifyClick(item) }
        } else {
            holder.modifyButton.visibility = View.GONE
        }

        // 4. Cancel Button (Pending or Approved)
        val isCancellable = item.status.equals("Pending", ignoreCase = true) ||
                item.status.equals("Approved", ignoreCase = true)
        if (isCancellable) {
            holder.cancelButton.visibility = View.VISIBLE
            holder.cancelButton.setOnClickListener { onCancelClick(item) }
        } else {
            holder.cancelButton.visibility = View.GONE
        }
    }

    override fun getItemCount(): Int = items.size

    private fun formatSlotDateTime(rawDate: String?): String {
        if (rawDate.isNullOrBlank()) return "Slot: -"
        return try {
            val cleanDate = rawDate.take(19)
            val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val outputFormat = SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.getDefault())
            val parsedDate = inputFormat.parse(cleanDate)
            if (parsedDate != null) "Slot: ${outputFormat.format(parsedDate)}" else "Slot: $rawDate"
        } catch (e: Exception) {
            "Slot: $rawDate"
        }
    }
}